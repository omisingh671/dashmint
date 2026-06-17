import { Router, Response } from 'express';
import prisma from '../lib/prisma.js';
import { authenticateToken, requireGlobalRole, AuthenticatedRequest } from '../middleware/auth.js';
import { createAuditLog } from '../services/audit.js';
import { GlobalRole } from '@prisma/client';
import { getReportRecords } from '../services/query.js';

const router = Router();

router.use(authenticateToken);

// GET /api/reports - Lists reports
// SUPER_ADMIN gets all reports (optionally filtered by dashboardId)
// ADMIN gets only assigned reports (optionally filtered by dashboardId)
router.get('/', async (req: AuthenticatedRequest, res: Response): Promise<any> => {
  const { dashboardId } = req.query;
  const isSuper = req.user!.globalRole === GlobalRole.SUPER_ADMIN;

  try {
    const whereClause: any = {};
    
    if (dashboardId) {
      whereClause.dashboardId = dashboardId as string;
    }

    if (!isSuper) {
      whereClause.assignments = {
        some: {
          userId: req.user!.id
        }
      };
    }

    const reports = await prisma.report.findMany({
      where: whereClause,
      include: {
        assignments: {
          include: {
            user: {
              select: {
                id: true,
                email: true
              }
            }
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    return res.json(reports);
  } catch (error) {
    console.error('Fetch reports error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/reports/:id - Retrieve report configuration
router.get('/:id', async (req: AuthenticatedRequest, res: Response): Promise<any> => {
  const { id } = req.params;
  const isSuper = req.user!.globalRole === GlobalRole.SUPER_ADMIN;

  try {
    const report = await prisma.report.findUnique({
      where: { id },
      include: {
        assignments: {
          include: {
            user: {
              select: {
                id: true,
                email: true
              }
            }
          }
        }
      }
    });

    if (!report) {
      return res.status(404).json({ error: 'Report not found' });
    }

    // RBAC check
    if (!isSuper) {
      const assigned = report.assignments.some(a => a.userId === req.user!.id);
      if (!assigned) {
        return res.status(403).json({ error: 'Forbidden: You do not have access to this report' });
      }
    }

    return res.json(report);
  } catch (error) {
    console.error('Fetch report error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/reports - Create report configuration (SUPER_ADMIN only)
router.post('/', requireGlobalRole([GlobalRole.SUPER_ADMIN]), async (req: AuthenticatedRequest, res: Response): Promise<any> => {
  const { dashboardId, name, description, baseTable, columnsJson, joinsJson, filtersJson } = req.body;

  if (!dashboardId || !name || !baseTable) {
    return res.status(400).json({ error: 'dashboardId, name, and baseTable are required' });
  }

  try {
    const dashboard = await prisma.dashboard.findUnique({ where: { id: dashboardId } });
    if (!dashboard) {
      return res.status(404).json({ error: 'Dashboard not found' });
    }

    const report = await prisma.report.create({
      data: {
        dashboardId,
        name,
        description,
        baseTable,
        columnsJson: typeof columnsJson === 'string' ? columnsJson : JSON.stringify(columnsJson || []),
        joinsJson: typeof joinsJson === 'string' ? joinsJson : JSON.stringify(joinsJson || []),
        filtersJson: typeof filtersJson === 'string' ? filtersJson : JSON.stringify(filtersJson || [])
      }
    });

    await createAuditLog(
      req.user!.id,
      'CREATE_REPORT',
      `Super admin created report config: ${name} (Base Table: ${baseTable})`,
      req.ip
    );

    return res.status(201).json(report);
  } catch (error) {
    console.error('Create report error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/reports/:id - Update report configuration (SUPER_ADMIN only)
router.put('/:id', requireGlobalRole([GlobalRole.SUPER_ADMIN]), async (req: AuthenticatedRequest, res: Response): Promise<any> => {
  const { id } = req.params;
  const { name, description, baseTable, columnsJson, joinsJson, filtersJson } = req.body;

  try {
    const report = await prisma.report.findUnique({ where: { id } });
    if (!report) {
      return res.status(404).json({ error: 'Report not found' });
    }

    const updatedReport = await prisma.report.update({
      where: { id },
      data: {
        name: name !== undefined ? name : report.name,
        description: description !== undefined ? description : report.description,
        baseTable: baseTable !== undefined ? baseTable : report.baseTable,
        columnsJson: columnsJson !== undefined ? (typeof columnsJson === 'string' ? columnsJson : JSON.stringify(columnsJson)) : report.columnsJson,
        joinsJson: joinsJson !== undefined ? (typeof joinsJson === 'string' ? joinsJson : JSON.stringify(joinsJson)) : report.joinsJson,
        filtersJson: filtersJson !== undefined ? (typeof filtersJson === 'string' ? filtersJson : JSON.stringify(filtersJson)) : report.filtersJson
      }
    });

    await createAuditLog(
      req.user!.id,
      'UPDATE_REPORT',
      `Super admin updated report config: ${updatedReport.name}`,
      req.ip
    );

    return res.json(updatedReport);
  } catch (error) {
    console.error('Update report error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/reports/:id - Delete report configuration (SUPER_ADMIN only)
router.delete('/:id', requireGlobalRole([GlobalRole.SUPER_ADMIN]), async (req: AuthenticatedRequest, res: Response): Promise<any> => {
  const { id } = req.params;

  try {
    const report = await prisma.report.findUnique({ where: { id } });
    if (!report) {
      return res.status(404).json({ error: 'Report not found' });
    }

    await prisma.report.delete({ where: { id } });

    await createAuditLog(
      req.user!.id,
      'DELETE_REPORT',
      `Super admin deleted report config: ${report.name}`,
      req.ip
    );

    return res.json({ success: true });
  } catch (error) {
    console.error('Delete report error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/reports/:id/query - Execute report query with pagination, search, sort
router.get('/:id/query', async (req: AuthenticatedRequest, res: Response): Promise<any> => {
  const { id } = req.params;
  const { page, limit, search, sortBy, sortOrder } = req.query;
  const isSuper = req.user!.globalRole === GlobalRole.SUPER_ADMIN;

  try {
    const report = await prisma.report.findUnique({
      where: { id },
      include: {
        assignments: true
      }
    });

    if (!report) {
      return res.status(404).json({ error: 'Report not found' });
    }

    // RBAC check
    if (!isSuper) {
      const assigned = report.assignments.some(a => a.userId === req.user!.id);
      if (!assigned) {
        return res.status(403).json({ error: 'Forbidden: You do not have access to run this report' });
      }
    }

    const results = await getReportRecords(report, {
      page: page ? parseInt(page as string) : undefined,
      limit: limit ? parseInt(limit as string) : undefined,
      search: search as string,
      sortBy: sortBy as string,
      sortOrder: sortOrder as 'ASC' | 'DESC'
    });

    return res.json(results);
  } catch (error: any) {
    console.error('Report query execution error:', error);
    return res.status(500).json({ error: error.message || 'Failed to execute report query' });
  }
});

// GET /api/reports/:id/export - Export report to CSV
router.get('/:id/export', async (req: AuthenticatedRequest, res: Response): Promise<any> => {
  const { id } = req.params;
  const { search, sortBy, sortOrder } = req.query;
  const isSuper = req.user!.globalRole === GlobalRole.SUPER_ADMIN;

  try {
    const report = await prisma.report.findUnique({
      where: { id },
      include: {
        assignments: true
      }
    });

    if (!report) {
      return res.status(404).json({ error: 'Report not found' });
    }

    // RBAC check
    if (!isSuper) {
      const assignment = report.assignments.find(a => a.userId === req.user!.id);
      if (!assignment) {
        return res.status(403).json({ error: 'Forbidden: You do not have access to this report' });
      }
      if (!assignment.canExport) {
        return res.status(403).json({ error: 'Forbidden: You do not have permission to export this report' });
      }
    }

    // Fetch up to 50000 records for CSV export
    const results = await getReportRecords(report, {
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

    // Generate CSV text
    const csvHeaders = columns.map(col => `"${col.displayName.replace(/"/g, '""')}"`).join(',');
    
    const csvRows = data.map(row => {
      return columns.map(col => {
        const value = row[col.name];
        if (value === null || value === undefined) {
          return '""';
        }
        if (value instanceof Date) {
          return `"${value.toISOString()}"`;
        }
        return `"${String(value).replace(/"/g, '""')}"`;
      }).join(',');
    });

    const csvContent = [csvHeaders, ...csvRows].join('\n');

    await createAuditLog(
      req.user!.id,
      'EXPORT_CSV',
      `User ${req.user!.email} exported ${data.length} records from custom report '${report.name}'`,
      req.ip
    );

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${report.name.toLowerCase().replace(/[^a-z0-9]/g, '_')}_export.csv"`);
    return res.send(csvContent);
  } catch (error: any) {
    console.error('Report export error:', error);
    return res.status(500).json({ error: error.message || 'Failed to export report' });
  }
});

export default router;
