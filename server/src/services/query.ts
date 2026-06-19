import mysql from 'mysql2/promise';
import prisma from '../lib/prisma.js';
import { decrypt } from '../lib/crypto.js';


interface QueryParams {
  page?: number;
  limit?: number;
  search?: string;
  sortBy?: string;
  sortOrder?: 'ASC' | 'DESC';
}

class ConnectionPoolManager {
  private pools: Map<string, mysql.Pool> = new Map();

  async getPool(dashboardId: string): Promise<mysql.Pool> {
    if (this.pools.has(dashboardId)) {
      return this.pools.get(dashboardId)!;
    }

    const connInfo = await prisma.databaseConnection.findUnique({
      where: { dashboardId }
    });

    if (!connInfo) {
      throw new Error(`No database connection configured for dashboard ID ${dashboardId}`);
    }

    const pool = mysql.createPool({
      host: connInfo.host,
      port: connInfo.port,
      user: connInfo.username,
      password: decrypt(connInfo.password),
      database: connInfo.database,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
      ssl: connInfo.sslEnabled ? {} : undefined
    });

    this.pools.set(dashboardId, pool);
    return pool;
  }

  async closePool(dashboardId: string) {
    const pool = this.pools.get(dashboardId);
    if (pool) {
      await pool.end();
      this.pools.delete(dashboardId);
    }
  }

  async clearAll() {
    for (const [id, pool] of this.pools.entries()) {
      await pool.end();
    }
    this.pools.clear();
  }
}

export const dbPoolManager = new ConnectionPoolManager();

/**
 * Fetch records dynamically from a customer database table, applying search, sort, and pagination.
 * It queries details from SchemaModel and SchemaField to validate columns and prevent SQL injection.
 */
export async function getTableRecords(
  dashboardId: string,
  tableName: string,
  params: QueryParams
) {
  const page = Math.max(1, Number(params.page || 1));
  const limit = Math.max(1, Number(params.limit || 10));
  const offset = (page - 1) * limit;

  const search = params.search || '';
  const sortBy = params.sortBy;
  const sortOrder = params.sortOrder === 'DESC' ? 'DESC' : 'ASC';

  // 1. Fetch schema model and fields from platform database to authenticate visible structures
  const schemaModel = await prisma.schemaModel.findFirst({
    where: {
      dashboardId,
      name: tableName,
      isVisible: true
    },
    include: {
      fields: {
        where: { isVisible: true }
      }
    }
  });

  if (!schemaModel) {
    throw new Error(`Table '${tableName}' is not visible or does not exist for this dashboard`);
  }

  const allowedColumns = schemaModel.fields.map(f => f.name);
  if (allowedColumns.length === 0) {
    return { data: [], totalCount: 0, columns: [] };
  }

  // 2. Validate sortBy parameter to prevent SQL Injection
  let orderByClause = '';
  if (sortBy) {
    if (!allowedColumns.includes(sortBy)) {
      throw new Error(`Invalid sort column '${sortBy}'`);
    }
    orderByClause = `ORDER BY \`${sortBy}\` ${sortOrder}`;
  }

  // Get active connection pool
  const pool = await dbPoolManager.getPool(dashboardId);

  // 3. Construct search query safely using parameterized criteria
  let whereClause = '';
  const queryParams: any[] = [];

  if (search) {
    // Search across all visible text/string fields in the model
    const searchConditions: string[] = [];
    const searchableFields = schemaModel.fields.filter(f => 
      ['varchar', 'text', 'char', 'string'].some(t => f.type.toLowerCase().includes(t))
    );

    // If no explicit text fields, search all fields
    const fieldsToSearch = searchableFields.length > 0 ? searchableFields : schemaModel.fields;

    for (const field of fieldsToSearch) {
      searchConditions.push(`\`${field.name}\` LIKE ?`);
      queryParams.push(`%${search}%`);
    }

    if (searchConditions.length > 0) {
      whereClause = `WHERE ${searchConditions.join(' OR ')}`;
    }
  }

  // 4. Retrieve total count
  const countSql = `SELECT COUNT(*) as total FROM \`${tableName}\` ${whereClause}`;
  const [countResult] = await pool.query(countSql, queryParams);
  const totalCount = (countResult as any)[0]?.total || 0;

  // 5. Query records
  // We use backticks to wrap table and column names to ensure safe identifier parsing
  const selectColumns = allowedColumns.map(col => `\`${col}\``).join(', ');
  const recordsSql = `
    SELECT ${selectColumns} 
    FROM \`${tableName}\` 
    ${whereClause} 
    ${orderByClause} 
    LIMIT ? OFFSET ?
  `;

  // Append limits to params
  const finalParams = [...queryParams, limit, offset];
  const [recordsResult] = await pool.query(recordsSql, finalParams);

  return {
    data: recordsResult as any[],
    totalCount,
    columns: schemaModel.fields.map(f => ({
      name: f.name,
      displayName: f.displayName,
      type: f.type,
      isPrimaryKey: f.isPrimaryKey
    }))
  };
}

interface ReportColumn {
  table: string;
  field: string;
  alias: string;
}

interface ReportJoin {
  type: 'LEFT' | 'INNER';
  relatedTable: string;
  fromColumn: string;
  toColumn: string;
}

interface ReportFilter {
  table: string;
  field: string;
  operator: 'equals' | 'contains' | 'greaterThan' | 'lessThan';
  value: string;
}

/**
 * Executes a dynamically compiled multi-table JOIN SQL statement based on Report metadata.
 * Performs rigorous table and column validation against visible schema definitions to prevent SQL injection.
 */
export async function getReportRecords(
  report: {
    dashboardId: string;
    baseTable: string;
    columnsJson: string;
    joinsJson: string;
    filtersJson: string;
  },
  params: QueryParams
) {
  const page = Math.max(1, Number(params.page || 1));
  const limit = Math.max(1, Number(params.limit || 10));
  const offset = (page - 1) * limit;

  const search = params.search || '';
  const sortBy = params.sortBy;
  const sortOrder = params.sortOrder === 'DESC' ? 'DESC' : 'ASC';

  // 1. Fetch all visible columns from platform DB to prevent SQL Injection
  const visibleFields = await prisma.schemaField.findMany({
    where: {
      schemaModel: {
        dashboardId: report.dashboardId,
        isVisible: true
      },
      isVisible: true
    },
    include: {
      schemaModel: true
    }
  });

  // Valid keys: "tableName.columnName"
  const validFieldKeys = new Set(visibleFields.map(f => `${f.schemaModel.name}.${f.name}`));
  
  // Valid tables
  const validTables = new Set(visibleFields.map(f => f.schemaModel.name));

  // Parse configurations
  const selectedColumns: ReportColumn[] = JSON.parse(report.columnsJson || '[]');
  const joins: ReportJoin[] = JSON.parse(report.joinsJson || '[]');
  const filters: ReportFilter[] = JSON.parse(report.filtersJson || '[]');

  if (selectedColumns.length === 0) {
    return { data: [], totalCount: 0, columns: [] };
  }

  // 2. Validate selected columns and construct SELECT clause
  const selectParts: string[] = [];
  for (const col of selectedColumns) {
    const key = `${col.table}.${col.field}`;
    if (!validFieldKeys.has(key)) {
      throw new Error(`Unauthorized or invalid column selection: ${key}`);
    }
    // Alias to prevent duplicate name clashes: `orders.id`
    selectParts.push(`\`${col.table}\`.\`${col.field}\` AS \`${col.table}.${col.field}\``);
  }

  // 3. Build FROM and JOIN clauses
  if (!validTables.has(report.baseTable)) {
    throw new Error(`Invalid base table: ${report.baseTable}`);
  }

  let sqlFrom = `FROM \`${report.baseTable}\``;
  for (const join of joins) {
    if (!validTables.has(join.relatedTable)) {
      throw new Error(`Invalid join table: ${join.relatedTable}`);
    }
    // Validate join fields exist in visible fields
    const baseFieldKey = `${report.baseTable}.${join.fromColumn}`;
    const joinFieldKey = `${join.relatedTable}.${join.toColumn}`;
    if (!validFieldKeys.has(baseFieldKey) || !validFieldKeys.has(joinFieldKey)) {
      throw new Error(`Invalid join condition: ${baseFieldKey} = ${joinFieldKey}`);
    }

    const joinType = join.type === 'INNER' ? 'INNER JOIN' : 'LEFT JOIN';
    sqlFrom += ` ${joinType} \`${join.relatedTable}\` ON \`${report.baseTable}\`.\`${join.fromColumn}\` = \`${join.relatedTable}\`.\`${join.toColumn}\``;
  }

  // 4. Build WHERE conditions (Default filters + Search)
  const whereConditions: string[] = [];
  const queryParams: any[] = [];

  // Add default report filters
  for (const filter of filters) {
    const key = `${filter.table}.${filter.field}`;
    if (!validFieldKeys.has(key)) {
      throw new Error(`Invalid filter column: ${key}`);
    }

    const colExpr = `\`${filter.table}\`.\`${filter.field}\``;
    switch (filter.operator) {
      case 'equals':
        whereConditions.push(`${colExpr} = ?`);
        queryParams.push(filter.value);
        break;
      case 'contains':
        whereConditions.push(`${colExpr} LIKE ?`);
        queryParams.push(`%${filter.value}%`);
        break;
      case 'greaterThan':
        whereConditions.push(`${colExpr} > ?`);
        queryParams.push(filter.value);
        break;
      case 'lessThan':
        whereConditions.push(`${colExpr} < ?`);
        queryParams.push(filter.value);
        break;
      default:
        break;
    }
  }

  // Add search filters
  if (search) {
    // Find selected text columns to run search on
    const searchConditions: string[] = [];
    for (const col of selectedColumns) {
      const fieldDef = visibleFields.find(f => f.schemaModel.name === col.table && f.name === col.field);
      if (fieldDef && ['varchar', 'text', 'char', 'string'].some(t => fieldDef.type.toLowerCase().includes(t))) {
        searchConditions.push(`\`${col.table}\`.\`${col.field}\` LIKE ?`);
        queryParams.push(`%${search}%`);
      }
    }

    // Fallback: if no text columns, search all selected columns
    if (searchConditions.length === 0) {
      for (const col of selectedColumns) {
        searchConditions.push(`\`${col.table}\`.\`${col.field}\` LIKE ?`);
        queryParams.push(`%${search}%`);
      }
    }

    if (searchConditions.length > 0) {
      whereConditions.push(`(${searchConditions.join(' OR ')})`);
    }
  }

  const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

  // 5. Build ORDER BY sorting safely
  let orderByClause = '';
  if (sortBy) {
    // sortBy is like "orders.id"
    if (!validFieldKeys.has(sortBy)) {
      throw new Error(`Invalid sort column: ${sortBy}`);
    }
    const [sTable, sField] = sortBy.split('.');
    orderByClause = `ORDER BY \`${sTable}\`.\`${sField}\` ${sortOrder}`;
  }

  // Get active connection pool
  const pool = await dbPoolManager.getPool(report.dashboardId);

  // 6. Retrieve total count
  const countSql = `SELECT COUNT(*) as total ${sqlFrom} ${whereClause}`;
  const [countResult] = await pool.query(countSql, queryParams);
  const totalCount = (countResult as any)[0]?.total || 0;

  // 7. Query records
  const selectClause = selectParts.join(', ');
  const recordsSql = `
    SELECT ${selectClause} 
    ${sqlFrom} 
    ${whereClause} 
    ${orderByClause} 
    LIMIT ? OFFSET ?
  `;

  const finalParams = [...queryParams, limit, offset];
  const [recordsResult] = await pool.query(recordsSql, finalParams);

  // Prepare UI columns meta
  const uiColumns = selectedColumns.map(col => {
    const fieldDef = visibleFields.find(f => f.schemaModel.name === col.table && f.name === col.field);
    return {
      name: `${col.table}.${col.field}`, // alias name matching row key
      displayName: col.alias || `${col.table} ${col.field}`,
      type: fieldDef?.type || 'varchar',
      isPrimaryKey: fieldDef?.isPrimaryKey || false
    };
  });

  return {
    data: recordsResult as any[],
    totalCount,
    columns: uiColumns
  };
}
