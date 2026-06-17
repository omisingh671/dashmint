import mysql from 'mysql2/promise';
import prisma from '../lib/prisma.js';

interface ParsedField {
  name: string;
  type: string;
  isPrimaryKey: boolean;
  isNullable: boolean;
  isUnique: boolean;
}

interface ParsedModel {
  name: string;
  fields: ParsedField[];
}

/**
 * Introspects a live MySQL database to retrieve tables and field metadata
 */
export async function introspectMySQLConnection(connInfo: any): Promise<ParsedModel[]> {
  let connection;
  try {
    connection = await mysql.createConnection({
      host: connInfo.host,
      port: parseInt(connInfo.port),
      user: connInfo.username,
      password: connInfo.password,
      database: connInfo.database,
      ssl: connInfo.sslEnabled ? {} : undefined
    });

    // 1. Get all tables
    const [tablesResult] = await connection.query(
      `SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = ?`,
      [connInfo.database]
    );

    const tables = (tablesResult as any[]).map(row => row.TABLE_NAME);
    const parsedModels: ParsedModel[] = [];

    // 2. Get column metadata for each table
    for (const table of tables) {
      const [columnsResult] = await connection.query(
        `SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE, COLUMN_KEY 
         FROM INFORMATION_SCHEMA.COLUMNS 
         WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ?`,
        [connInfo.database, table]
      );

      const fields: ParsedField[] = (columnsResult as any[]).map(col => {
        return {
          name: col.COLUMN_NAME,
          type: col.DATA_TYPE,
          isPrimaryKey: col.COLUMN_KEY === 'PRI',
          isNullable: col.IS_NULLABLE === 'YES',
          isUnique: col.COLUMN_KEY === 'UNI'
        };
      });

      parsedModels.push({
        name: table,
        fields
      });
    }

    return parsedModels;
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

/**
 * Parses a Prisma schema file text to extract model names, field names, and data types
 */
export function parsePrismaSchemaText(schemaText: string): ParsedModel[] {
  const models: ParsedModel[] = [];
  const lines = schemaText.split(/\r?\n/);
  
  let currentModel: ParsedModel | null = null;
  
  // Set of standard scalar types in Prisma to distinguish DB fields from relational fields
  const PRISMA_SCALAR_TYPES = new Set([
    'String', 'Int', 'Boolean', 'Float', 'Decimal', 'DateTime', 'Json', 'Bytes', 'BigInt'
  ]);

  for (let line of lines) {
    line = line.trim();
    
    // Skip empty lines or comments
    if (!line || line.startsWith('//') || line.startsWith('#')) {
      continue;
    }

    // Model start block: model User {
    const modelStartMatch = line.match(/^model\s+([A-Za-z0-9_]+)\s*\{/);
    if (modelStartMatch) {
      currentModel = {
        name: modelStartMatch[1],
        fields: []
      };
      continue;
    }

    // Model end block: }
    if (line === '}' && currentModel) {
      models.push(currentModel);
      currentModel = null;
      continue;
    }

    // Parse field inside a model block
    if (currentModel) {
      // Split the line by spaces, but ignore anything after decorators or comments
      const tokens = line.split(/\s+/);
      if (tokens.length < 2) continue;

      const fieldName = tokens[0];
      let fieldType = tokens[1];

      // If it is a relational decorator or block-level attribute, skip
      if (fieldName.startsWith('@@') || fieldName.startsWith('@')) {
        continue;
      }

      // Check if nullable (e.g. String?)
      const isNullable = fieldType.endsWith('?');
      const cleanType = isNullable ? fieldType.slice(0, -1) : fieldType.replace('[]', '');

      // Check if it's a relational field. Relational fields reference other models.
      // We check if it is not in scalar types, or starts with model name capitals.
      // But in SQL, relation fields do not represent actual columns (foreign key ID fields do, e.g. userId Int).
      // We want to skip relation references (e.g. user User @relation(...)) and keep scalar fields.
      const isRelational = !PRISMA_SCALAR_TYPES.has(cleanType) && !line.includes('@relation') && cleanType[0] === cleanType[0].toUpperCase();
      if (isRelational && line.includes('@relation')) {
        continue;
      }
      if (!PRISMA_SCALAR_TYPES.has(cleanType) && cleanType[0] === cleanType[0].toUpperCase()) {
        // This is a relation type (another model name), let's skip it because the foreign key is the physical column
        continue;
      }

      const isPrimaryKey = line.includes('@id');
      const isUnique = line.includes('@unique');

      currentModel.fields.push({
        name: fieldName,
        type: cleanType.toLowerCase(),
        isPrimaryKey,
        isNullable,
        isUnique
      });
    }
  }

  return models;
}

/**
 * Synchronizes parsed schema models and fields with the platform DB
 */
export async function syncDashboardSchema(dashboardId: string, parsedModels: ParsedModel[]) {
  // We perform the sync using a transaction to ensure integrity
  await prisma.$transaction(async (tx) => {
    // 1. Fetch current schema models in DB
    const existingModels = await tx.schemaModel.findMany({
      where: { dashboardId },
      include: { fields: true }
    });

    const existingModelNames = new Set(existingModels.map(m => m.name));
    const parsedModelNames = new Set(parsedModels.map(m => m.name));

    // 2. Delete models that no longer exist in the parsed schema
    for (const model of existingModels) {
      if (!parsedModelNames.has(model.name)) {
        await tx.schemaModel.delete({
          where: { id: model.id }
        });
      }
    }

    // 3. Upsert models and fields
    for (const pModel of parsedModels) {
      const displayName = pModel.name
        .replace(/([A-Z])/g, ' $1') // insert space before capital letters
        .replace(/^./, str => str.toUpperCase()) // capitalize first letter
        .trim();

      // Upsert the schema model
      const dbModel = await tx.schemaModel.upsert({
        where: {
          dashboardId_name: {
            dashboardId,
            name: pModel.name
          }
        },
        update: {
          displayName
        },
        create: {
          dashboardId,
          name: pModel.name,
          displayName,
          isVisible: true
        }
      });

      // Synchronize fields for this model
      const existingFields = existingModels.find(m => m.name === pModel.name)?.fields || [];
      const existingFieldNames = new Set(existingFields.map(f => f.name));
      const parsedFieldNames = new Set(pModel.fields.map(f => f.name));

      // Delete fields that no longer exist
      for (const field of existingFields) {
        if (!parsedFieldNames.has(field.name)) {
          await tx.schemaField.delete({
            where: { id: field.id }
          });
        }
      }

      // Upsert fields
      for (const pField of pModel.fields) {
        const fieldDisplayName = pField.name
          .replace(/_([a-z])/g, (_, letter) => ` ${letter.toUpperCase()}`) // convert snake_case to Space Case
          .replace(/([A-Z])/g, ' $1') // insert space before capital letters
          .replace(/^./, str => str.toUpperCase()) // capitalize first letter
          .trim();

        await tx.schemaField.upsert({
          where: {
            schemaModelId_name: {
              schemaModelId: dbModel.id,
              name: pField.name
            }
          },
          update: {
            type: pField.type,
            isPrimaryKey: pField.isPrimaryKey,
            isNullable: pField.isNullable,
            isUnique: pField.isUnique
          },
          create: {
            schemaModelId: dbModel.id,
            name: pField.name,
            displayName: fieldDisplayName,
            type: pField.type,
            isPrimaryKey: pField.isPrimaryKey,
            isNullable: pField.isNullable,
            isUnique: pField.isUnique,
            isVisible: true
          }
        });
      }
    }
  });
}
