import { Router, Response } from 'express';
import prisma from '../lib/prisma.js';
import { authenticateToken, requireGlobalRole, AuthenticatedRequest } from '../middleware/auth.js';
import { createAuditLog } from '../services/audit.js';
import { GlobalRole } from '@prisma/client';

const router = Router();

router.use(authenticateToken);

// GET /api/relations/:dashboardId/suggestions - Suggests potential manual table relationships (SUPER_ADMIN only)
router.get('/:dashboardId/suggestions', requireGlobalRole([GlobalRole.SUPER_ADMIN]), async (req: AuthenticatedRequest, res: Response): Promise<any> => {
  const { dashboardId } = req.params;

  try {
    const dashboard = await prisma.dashboard.findUnique({ where: { id: dashboardId } });
    if (!dashboard) {
      return res.status(404).json({ error: 'Dashboard not found' });
    }

    // Get all visible models and their visible fields
    const models = await prisma.schemaModel.findMany({
      where: { dashboardId, isVisible: true },
      include: { fields: { where: { isVisible: true } } }
    });

    // Get all current relations to prevent duplicates
    const existingRelations = await prisma.tableRelation.findMany({
      where: { dashboardId }
    });

    const existingKeys = new Set(
      existingRelations.map(r => `${r.fromTable.toLowerCase()}.${r.fromColumn.toLowerCase()}->${r.toTable.toLowerCase()}.${r.toColumn.toLowerCase()}`)
    );

    const suggestions: any[] = [];

    // Helper functions for matching
    const nameMatches = (fieldPrefix: string, tableName: string): boolean => {
      const fp = fieldPrefix.toLowerCase();
      const tn = tableName.toLowerCase();
      if (fp === tn) return true;
      // plural table name matches singular field prefix (e.g. "users" table matches "userId" or "user_id")
      if (tn.endsWith('s') && tn.slice(0, -1) === fp) return true;
      // plural table ending in "ies" matches "y" (e.g. "categories" table matches "categoryId" or "category_id")
      if (tn.endsWith('ies') && tn.slice(0, -3) + 'y' === fp) return true;
      return false;
    };

    const isTypeCompatible = (typeA: string, typeB: string): boolean => {
      const tA = typeA.toLowerCase();
      const tB = typeB.toLowerCase();
      const isNumeric = (t: string) => ['int', 'integer', 'bigint', 'tinyint', 'smallint', 'mediumint', 'decimal', 'float', 'double', 'numeric', 'real'].some(kw => t.includes(kw));
      const isString = (t: string) => ['varchar', 'char', 'text', 'string', 'uuid'].some(kw => t.includes(kw));
      
      if (isNumeric(tA) && isNumeric(tB)) return true;
      if (isString(tA) && isString(tB)) return true;
      return tA === tB;
    };

    // Analyze fields for relationship opportunities
    for (const modelA of models) {
      for (const fieldA of modelA.fields) {
        const fieldName = fieldA.name;
        // Check if field ends with "Id" or "_id" (but isn't just "id")
        if (fieldName.toLowerCase() === 'id' || fieldName.toLowerCase() === '_id') continue;
        
        let prefix = '';
        if (fieldName.toLowerCase().endsWith('id')) {
          if (fieldName.toLowerCase().endsWith('_id')) {
            prefix = fieldName.slice(0, -3);
          } else {
            prefix = fieldName.slice(0, -2);
          }
        }

        if (!prefix) continue;

        // Try to find target table B that matches the prefix
        for (const modelB of models) {
          if (modelA.name === modelB.name) continue; // Skip joining table to itself
          
          if (nameMatches(prefix, modelB.name)) {
            // Find target column that is the primary key of table B (or named "id" or "_id")
            const pKeyB = modelB.fields.find(f => f.isPrimaryKey) || modelB.fields.find(f => f.name.toLowerCase() === 'id' || f.name.toLowerCase() === '_id');
            if (pKeyB && isTypeCompatible(fieldA.type, pKeyB.type)) {
              const relKey = `${modelA.name.toLowerCase()}.${fieldA.name.toLowerCase()}->${modelB.name.toLowerCase()}.${pKeyB.name.toLowerCase()}`;
              if (!existingKeys.has(relKey)) {
                suggestions.push({
                  fromTable: modelA.name,
                  fromColumn: fieldA.name,
                  fromDisplayName: modelA.displayName,
                  toTable: modelB.name,
                  toColumn: pKeyB.name,
                  toDisplayName: modelB.displayName
                });
              }
            }
          }
        }
      }
    }

    return res.json(suggestions);
  } catch (error) {
    console.error('Suggest relations error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/relations/:dashboardId/bulk - Bulk create manual relations (SUPER_ADMIN only)
router.post('/:dashboardId/bulk', requireGlobalRole([GlobalRole.SUPER_ADMIN]), async (req: AuthenticatedRequest, res: Response): Promise<any> => {
  const { dashboardId } = req.params;
  const { relations } = req.body; // Array<{ fromTable, fromColumn, toTable, toColumn }>

  if (!relations || !Array.isArray(relations) || relations.length === 0) {
    return res.status(400).json({ error: 'relations array is required and cannot be empty' });
  }

  try {
    const dashboard = await prisma.dashboard.findUnique({ where: { id: dashboardId } });
    if (!dashboard) {
      return res.status(404).json({ error: 'Dashboard not found' });
    }

    const created: any[] = [];
    const skipped: any[] = [];

    for (const rel of relations) {
      const { fromTable, fromColumn, toTable, toColumn } = rel;
      if (!fromTable || !fromColumn || !toTable || !toColumn) {
        skipped.push({ ...rel, reason: 'Missing fields' });
        continue;
      }

      // Check if duplicate relation
      const existing = await prisma.tableRelation.findUnique({
        where: {
          dashboardId_fromTable_fromColumn_toTable_toColumn: {
            dashboardId,
            fromTable,
            fromColumn,
            toTable,
            toColumn
          }
        }
      });

      if (existing) {
        skipped.push({ ...rel, reason: 'Relationship already exists' });
        continue;
      }

      const newRel = await prisma.tableRelation.create({
        data: {
          dashboardId,
          fromTable,
          fromColumn,
          toTable,
          toColumn,
          isManual: true
        }
      });
      created.push(newRel);
    }

    if (created.length > 0) {
      await createAuditLog(
        req.user!.id,
        'CREATE_RELATIONS_BULK',
        `Super admin bulk created ${created.length} manual relations`,
        req.ip
      );
    }

    return res.status(201).json({
      success: true,
      createdCount: created.length,
      created,
      skipped
    });
  } catch (error) {
    console.error('Bulk create relations error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Get all relations for a dashboard
router.get('/:dashboardId', async (req: AuthenticatedRequest, res: Response): Promise<any> => {
  const { dashboardId } = req.params;
  const isSuper = req.user!.globalRole === GlobalRole.SUPER_ADMIN;

  try {
    // If not super admin, check if user is assigned to dashboard
    if (!isSuper) {
      const assignment = await prisma.dashboardAssignment.findUnique({
        where: {
          userId_dashboardId: {
            userId: req.user!.id,
            dashboardId
          }
        }
      });
      if (!assignment) {
        return res.status(403).json({ error: 'Forbidden: You do not have access to this dashboard' });
      }
    }

    const relations = await prisma.tableRelation.findMany({
      where: { dashboardId },
      orderBy: { createdAt: 'desc' }
    });

    return res.json(relations);
  } catch (error) {
    console.error('Fetch relations error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Create a manual relation (SUPER_ADMIN only)
router.post('/:dashboardId', requireGlobalRole([GlobalRole.SUPER_ADMIN]), async (req: AuthenticatedRequest, res: Response): Promise<any> => {
  const { dashboardId } = req.params;
  const { fromTable, fromColumn, toTable, toColumn } = req.body;

  if (!fromTable || !fromColumn || !toTable || !toColumn) {
    return res.status(400).json({ error: 'fromTable, fromColumn, toTable, and toColumn are required' });
  }

  try {
    const dashboard = await prisma.dashboard.findUnique({ where: { id: dashboardId } });
    if (!dashboard) {
      return res.status(404).json({ error: 'Dashboard not found' });
    }

    // Check if duplicate relation
    const existing = await prisma.tableRelation.findUnique({
      where: {
        dashboardId_fromTable_fromColumn_toTable_toColumn: {
          dashboardId,
          fromTable,
          fromColumn,
          toTable,
          toColumn
        }
      }
    });

    if (existing) {
      return res.status(400).json({ error: 'This relationship already exists' });
    }

    const relation = await prisma.tableRelation.create({
      data: {
        dashboardId,
        fromTable,
        fromColumn,
        toTable,
        toColumn,
        isManual: true
      }
    });

    await createAuditLog(
      req.user!.id,
      'CREATE_RELATION',
      `Super admin created manual relation: ${fromTable}.${fromColumn} -> ${toTable}.${toColumn}`,
      req.ip
    );

    return res.status(201).json(relation);
  } catch (error) {
    console.error('Create relation error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete a manual relation (SUPER_ADMIN only)
router.delete('/:dashboardId/:relationId', requireGlobalRole([GlobalRole.SUPER_ADMIN]), async (req: AuthenticatedRequest, res: Response): Promise<any> => {
  const { dashboardId, relationId } = req.params;

  try {
    const relation = await prisma.tableRelation.findFirst({
      where: { id: relationId, dashboardId }
    });

    if (!relation) {
      return res.status(404).json({ error: 'Relationship not found' });
    }

    if (!relation.isManual) {
      return res.status(400).json({ error: 'Cannot delete database-introspected foreign key relationships' });
    }

    await prisma.tableRelation.delete({
      where: { id: relationId }
    });

    await createAuditLog(
      req.user!.id,
      'DELETE_RELATION',
      `Super admin deleted manual relation: ${relation.fromTable}.${relation.fromColumn} -> ${relation.toTable}.${relation.toColumn}`,
      req.ip
    );

    return res.json({ success: true });
  } catch (error) {
    console.error('Delete relation error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
