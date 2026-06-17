import { Router, Response } from 'express';
import { authenticateToken, requireDashboardAccess, AuthenticatedRequest } from '../middleware/auth.js';
import { getTableRecords, dbPoolManager } from '../services/query.js';
import { createAuditLog } from '../services/audit.js';
import prisma from '../lib/prisma.js';

const router = Router();

// Apply base authentication for all query endpoints
router.use(authenticateToken);

// Query records for a specific model table
router.get('/:dashboardId/:tableName', requireDashboardAccess('read'), async (req: AuthenticatedRequest, res: Response): Promise<any> => {
  const { dashboardId, tableName } = req.params;
  const { page, limit, search, sortBy, sortOrder } = req.query;

  try {
    const results = await getTableRecords(dashboardId, tableName, {
      page: page ? parseInt(page as string) : undefined,
      limit: limit ? parseInt(limit as string) : undefined,
      search: search as string,
      sortBy: sortBy as string,
      sortOrder: sortOrder as 'ASC' | 'DESC'
    });

    return res.json(results);
  } catch (error: any) {
    console.error('Fetch table records error:', error);
    return res.status(500).json({ error: error.message || 'Failed to fetch database records' });
  }
});

// Export records to CSV
router.get('/:dashboardId/:tableName/export', requireDashboardAccess('export'), async (req: AuthenticatedRequest, res: Response): Promise<any> => {
  const { dashboardId, tableName } = req.params;
  const { search, sortBy, sortOrder } = req.query;

  try {
    // 1. Fetch records (we query with a large limit e.g. 50000 for exports)
    const results = await getTableRecords(dashboardId, tableName, {
      page: 1,
      limit: 50000,
      search: search as string,
      sortBy: sortBy as string,
      sortOrder: sortOrder as 'ASC' | 'DESC'
    });

    const { data, columns } = results;

    if (columns.length === 0) {
      return res.status(400).json({ error: 'No columns available to export' });
    }

    // 2. Generate CSV text manually
    // Header line
    const csvHeaders = columns.map(col => `"${col.displayName.replace(/"/g, '""')}"`).join(',');
    
    // Data lines
    const csvRows = data.map(row => {
      return columns.map(col => {
        const value = row[col.name];
        if (value === null || value === undefined) {
          return '""';
        }
        
        // Handle Date objects
        if (value instanceof Date) {
          return `"${value.toISOString()}"`;
        }

        return `"${String(value).replace(/"/g, '""')}"`;
      }).join(',');
    });

    const csvContent = [csvHeaders, ...csvRows].join('\n');

    // 3. Create Audit Log entry
    await createAuditLog(
      req.user!.id,
      'EXPORT_CSV',
      `User ${req.user!.email} exported ${data.length} records from table '${tableName}' in dashboard ${dashboardId}`,
      req.ip
    );

    // 4. Send response headers & payload
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${tableName}_export.csv"`);
    return res.send(csvContent);
  } catch (error: any) {
    console.error('CSV export error:', error);
    return res.status(500).json({ error: error.message || 'Failed to export table records' });
  }
});

export default router;
