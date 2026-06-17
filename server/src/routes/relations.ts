import { Router, Response } from 'express';
import prisma from '../lib/prisma.js';
import { authenticateToken, requireGlobalRole, AuthenticatedRequest } from '../middleware/auth.js';
import { createAuditLog } from '../services/audit.js';
import { GlobalRole } from '@prisma/client';

const router = Router();

router.use(authenticateToken);

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
