import { Router, Response } from 'express';
import prisma from '../lib/prisma.js';
import { authenticateToken, requireGlobalRole, AuthenticatedRequest } from '../middleware/auth.js';
import { createAuditLog } from '../services/audit.js';
import { GlobalRole } from '@prisma/client';

const router = Router();

router.use(authenticateToken);
router.use(requireGlobalRole([GlobalRole.SUPER_ADMIN]));

// Get all report assignments
router.get('/', async (req: AuthenticatedRequest, res: Response): Promise<any> => {
  try {
    const assignments = await prisma.reportAssignment.findMany({
      include: {
        user: {
          select: {
            id: true,
            email: true
          }
        },
        report: {
          select: {
            id: true,
            name: true,
            dashboardId: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    return res.json(assignments);
  } catch (error) {
    console.error('Fetch report assignments error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Assign (or update) a report assignment
router.post('/', async (req: AuthenticatedRequest, res: Response): Promise<any> => {
  const { userId, reportId, canExport } = req.body;

  if (!userId || !reportId) {
    return res.status(400).json({ error: 'userId and reportId are required' });
  }

  try {
    // Verify target user is an ADMIN
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user || user.globalRole !== GlobalRole.ADMIN) {
      return res.status(400).json({ error: 'Target user must be an ADMIN' });
    }

    // Verify report exists
    const report = await prisma.report.findUnique({
      where: { id: reportId },
      include: { dashboard: true }
    });
    if (!report) {
      return res.status(400).json({ error: 'Report not found' });
    }

    const assignment = await prisma.reportAssignment.upsert({
      where: {
        userId_reportId: {
          userId,
          reportId
        }
      },
      update: {
        canExport: !!canExport
      },
      create: {
        userId,
        reportId,
        canExport: !!canExport
      },
      include: {
        user: { select: { email: true } },
        report: { select: { name: true } }
      }
    });

    await createAuditLog(
      req.user!.id,
      'ASSIGN_REPORT',
      `Super admin assigned report ${assignment.report.name} to ${assignment.user.email} (canExport: ${assignment.canExport})`,
      req.ip
    );

    return res.json(assignment);
  } catch (error) {
    console.error('Assign report error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete a report assignment
router.delete('/:id', async (req: AuthenticatedRequest, res: Response): Promise<any> => {
  const { id } = req.params;

  try {
    const assignment = await prisma.reportAssignment.findUnique({
      where: { id },
      include: {
        user: { select: { email: true } },
        report: { select: { name: true } }
      }
    });

    if (!assignment) {
      return res.status(404).json({ error: 'Report assignment not found' });
    }

    await prisma.reportAssignment.delete({
      where: { id }
    });

    await createAuditLog(
      req.user!.id,
      'UNASSIGN_REPORT',
      `Super admin unassigned report ${assignment.report.name} from ${assignment.user.email}`,
      req.ip
    );

    return res.json({ success: true });
  } catch (error) {
    console.error('Delete report assignment error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
