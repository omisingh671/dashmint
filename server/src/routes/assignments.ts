import { Router, Response } from 'express';
import prisma from '../lib/prisma.js';
import { authenticateToken, requireGlobalRole, AuthenticatedRequest } from '../middleware/auth.js';
import { createAuditLog } from '../services/audit.js';
import { GlobalRole } from '@prisma/client';

const router = Router();

router.use(authenticateToken);
router.use(requireGlobalRole([GlobalRole.SUPER_ADMIN]));

// Get all assignments in the system
router.get('/', async (req: AuthenticatedRequest, res: Response): Promise<any> => {
  try {
    const assignments = await prisma.dashboardAssignment.findMany({
      include: {
        user: {
          select: {
            id: true,
            email: true
          }
        },
        dashboard: {
          select: {
            id: true,
            name: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    return res.json(assignments);
  } catch (error) {
    console.error('Fetch assignments error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Assign (or update) dashboard assignment
router.post('/', async (req: AuthenticatedRequest, res: Response): Promise<any> => {
  const { userId, dashboardId, permissions } = req.body;

  if (!userId || !dashboardId) {
    return res.status(400).json({ error: 'userId and dashboardId are required' });
  }

  // permissions should be like { read: true, export: false }
  const permissionsJson = JSON.stringify(permissions || { read: true, export: false });

  try {
    // Verify target user is an ADMIN
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user || user.globalRole !== GlobalRole.ADMIN) {
      return res.status(400).json({ error: 'Target user must be an ADMIN' });
    }

    // Verify dashboard exists
    const dashboard = await prisma.dashboard.findUnique({ where: { id: dashboardId } });
    if (!dashboard) {
      return res.status(400).json({ error: 'Dashboard not found' });
    }

    const assignment = await prisma.dashboardAssignment.upsert({
      where: {
        userId_dashboardId: {
          userId,
          dashboardId
        }
      },
      update: {
        permissionsJson
      },
      create: {
        userId,
        dashboardId,
        permissionsJson
      },
      include: {
        user: { select: { email: true } },
        dashboard: { select: { name: true } }
      }
    });

    await createAuditLog(
      req.user!.id,
      'ASSIGN_DASHBOARD',
      `Super admin assigned dashboard ${assignment.dashboard.name} to ${assignment.user.email} with permissions: ${permissionsJson}`,
      req.ip
    );

    return res.json(assignment);
  } catch (error) {
    console.error('Assign dashboard error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete assignment
router.delete('/:id', async (req: AuthenticatedRequest, res: Response): Promise<any> => {
  const { id } = req.params;

  try {
    const assignment = await prisma.dashboardAssignment.findUnique({
      where: { id },
      include: {
        user: { select: { email: true } },
        dashboard: { select: { name: true } }
      }
    });

    if (!assignment) {
      return res.status(404).json({ error: 'Assignment not found' });
    }

    await prisma.dashboardAssignment.delete({
      where: { id }
    });

    await createAuditLog(
      req.user!.id,
      'UNASSIGN_DASHBOARD',
      `Super admin unassigned dashboard ${assignment.dashboard.name} from ${assignment.user.email}`,
      req.ip
    );

    return res.json({ success: true });
  } catch (error) {
    console.error('Delete assignment error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
