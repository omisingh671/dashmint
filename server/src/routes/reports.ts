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

// GET /api/reports/suggestions - Suggests reports based on database schema and relations (SUPER_ADMIN only)
router.get('/suggestions', requireGlobalRole([GlobalRole.SUPER_ADMIN]), async (req: AuthenticatedRequest, res: Response): Promise<any> => {
  const { dashboardId } = req.query;

  if (!dashboardId) {
    return res.status(400).json({ error: 'dashboardId is required' });
  }

  try {
    const models = await prisma.schemaModel.findMany({
      where: { dashboardId: dashboardId as string, isVisible: true },
      include: { fields: { where: { isVisible: true } } }
    });

    const relations = await prisma.tableRelation.findMany({
      where: { dashboardId: dashboardId as string }
    });

    const suggestions: any[] = [];
    let sugId = 1;

    for (const model of models) {
      const pKey = model.fields.find(f => f.isPrimaryKey) || model.fields[0];
      if (!pKey) continue;

      // 1. Suggest Detailed List Report for this table
      const listCols = model.fields.map(f => ({
        table: model.name,
        field: f.name,
        alias: f.displayName,
        function: 'NONE'
      }));

      suggestions.push({
        id: `sug_${sugId++}`,
        name: `All ${model.displayName} Details`,
        description: `Detailed listing of all records in the ${model.displayName} table.`,
        baseTable: model.name,
        joins: [],
        columns: listCols,
        filters: [],
        defaultSortColumn: `${model.name}.${pKey.name}`,
        defaultSortOrder: 'DESC'
      });

      // Find status/type/category/role fields for dimension-based aggregation
      const dimensionFields = model.fields.filter(f => 
        ['status', 'type', 'category', 'role', 'stage', 'genre', 'gender'].some(kw => f.name.toLowerCase().includes(kw)) ||
        (f.isUnique === false && ['varchar', 'char', 'string'].some(t => f.type.toLowerCase().includes(t)) && !f.name.toLowerCase().includes('email') && !f.name.toLowerCase().includes('phone') && !f.name.toLowerCase().includes('address') && !f.name.toLowerCase().includes('name'))
      );

      // Find numeric fields (e.g. quantity, amount, price, score, age)
      const numericFields = model.fields.filter(f => 
        ['int', 'decimal', 'float', 'double', 'integer', 'numeric', 'real'].some(t => f.type.toLowerCase().includes(t)) &&
        !f.isPrimaryKey && 
        !f.name.toLowerCase().includes('id')
      );

      // 2. Suggest count summary reports by dimension columns
      for (const dim of dimensionFields) {
        suggestions.push({
          id: `sug_${sugId++}`,
          name: `${model.displayName} Count by ${dim.displayName}`,
          description: `Total count of ${model.displayName} grouped by ${dim.displayName}.`,
          baseTable: model.name,
          joins: [],
          columns: [
            { table: model.name, field: dim.name, alias: dim.displayName, function: 'NONE' },
            { table: model.name, field: pKey.name, alias: 'Record Count', function: 'COUNT' }
          ],
          filters: [],
          defaultSortColumn: `${model.name}.${dim.name}`,
          defaultSortOrder: 'ASC'
        });
      }

      // 3. Suggest aggregation reports (SUM / AVG) for numeric fields by dimension columns
      for (const num of numericFields) {
        const dim = dimensionFields[0] || model.fields.find(f => f.name.toLowerCase().includes('name')) || pKey;
        suggestions.push({
          id: `sug_${sugId++}`,
          name: `Total ${num.displayName} by ${dim.displayName}`,
          description: `Total sum of ${num.displayName} grouped by ${dim.displayName}.`,
          baseTable: model.name,
          joins: [],
          columns: [
            { table: model.name, field: dim.name, alias: dim.displayName, function: 'NONE' },
            { table: model.name, field: num.name, alias: `Total ${num.displayName}`, function: 'SUM' }
          ],
          filters: [],
          defaultSortColumn: `${model.name}.${dim.name}`,
          defaultSortOrder: 'ASC'
        });

        suggestions.push({
          id: `sug_${sugId++}`,
          name: `Average ${num.displayName} by ${dim.displayName}`,
          description: `Average of ${num.displayName} grouped by ${dim.displayName}.`,
          baseTable: model.name,
          joins: [],
          columns: [
            { table: model.name, field: dim.name, alias: dim.displayName, function: 'NONE' },
            { table: model.name, field: num.name, alias: `Average ${num.displayName}`, function: 'AVG' }
          ],
          filters: [],
          defaultSortColumn: `${model.name}.${dim.name}`,
          defaultSortOrder: 'ASC'
        });
      }
    }

    // 4. Suggest Relational / Joined Reports
    for (const rel of relations) {
      const modelA = models.find(m => m.name === rel.fromTable);
      const modelB = models.find(m => m.name === rel.toTable);
      if (!modelA || !modelB) continue;

      const pKeyA = modelA.fields.find(f => f.isPrimaryKey) || modelA.fields[0];
      const nameFieldB = modelB.fields.find(f => f.name.toLowerCase().includes('name') || f.name.toLowerCase().includes('email') || f.name.toLowerCase().includes('title')) || modelB.fields[0];

      if (!pKeyA || !nameFieldB) continue;

      // Projection: primary key of table A, key fields of table A, and identifying name/title of table B
      const cols = [
        { table: modelA.name, field: pKeyA.name, alias: `${modelA.displayName} ID`, function: 'NONE' },
        ...modelA.fields.filter(f => !f.isPrimaryKey && f.name !== rel.fromColumn && ['varchar', 'datetime', 'int', 'decimal'].some(t => f.type.toLowerCase().includes(t))).slice(0, 3).map(f => ({
          table: modelA.name,
          field: f.name,
          alias: f.displayName,
          function: 'NONE'
        })),
        { table: modelB.name, field: nameFieldB.name, alias: `${modelB.displayName} Info`, function: 'NONE' }
      ];

      suggestions.push({
        id: `sug_${sugId++}`,
        name: `${modelA.displayName} with ${modelB.displayName} Info`,
        description: `Detailed view of ${modelA.displayName} records joined with related ${modelB.displayName} details.`,
        baseTable: modelA.name,
        joins: [
          { type: 'LEFT', relatedTable: modelB.name, fromColumn: rel.fromColumn, toColumn: rel.toColumn }
        ],
        columns: cols,
        filters: [],
        defaultSortColumn: `${modelA.name}.${pKeyA.name}`,
        defaultSortOrder: 'DESC'
      });
    }

    return res.json(suggestions);
  } catch (error) {
    console.error('Fetch suggestions error:', error);
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
  const { dashboardId, name, description, baseTable, columnsJson, joinsJson, filtersJson, defaultSortColumn, defaultSortOrder } = req.body;

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
        filtersJson: typeof filtersJson === 'string' ? filtersJson : JSON.stringify(filtersJson || []),
        defaultSortColumn,
        defaultSortOrder
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
  const { name, description, baseTable, columnsJson, joinsJson, filtersJson, defaultSortColumn, defaultSortOrder } = req.body;

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
        filtersJson: filtersJson !== undefined ? (typeof filtersJson === 'string' ? filtersJson : JSON.stringify(filtersJson)) : report.filtersJson,
        defaultSortColumn: defaultSortColumn !== undefined ? defaultSortColumn : report.defaultSortColumn,
        defaultSortOrder: defaultSortOrder !== undefined ? defaultSortOrder : report.defaultSortOrder
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
