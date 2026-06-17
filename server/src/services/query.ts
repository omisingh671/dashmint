import mysql from 'mysql2/promise';
import prisma from '../lib/prisma.js';

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
      password: connInfo.password,
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
