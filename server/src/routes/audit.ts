import { Router, Response } from 'express';
import prisma from '../lib/prisma.js';
import { authenticateToken, requireGlobalRole, AuthenticatedRequest } from '../middleware/auth.js';
import { GlobalRole } from '@prisma/client';

const router = Router();

router.use(authenticateToken);
router.use(requireGlobalRole([GlobalRole.SUPER_ADMIN]));

router.get('/', async (req: AuthenticatedRequest, res: Response): Promise<any> => {
  try {
    const logs = await prisma.auditLog.findMany({
      include: {
        user: {
          select: {
            email: true,
            globalRole: true
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: 200 // Cap to prevent massive payloads in dashboard
    });

    return res.json(logs);
  } catch (error) {
    console.error('Fetch audit logs error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
