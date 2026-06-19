import { Router, Response } from 'express';
import prisma from '../lib/prisma.js';
import { authenticateToken, requireGlobalRole, AuthenticatedRequest } from '../middleware/auth.js';
import { GlobalRole } from '@prisma/client';

const router = Router();

router.use(authenticateToken);
router.use(requireGlobalRole([GlobalRole.SUPER_ADMIN]));

router.get('/', async (req: AuthenticatedRequest, res: Response): Promise<any> => {
  const { page, limit, search } = req.query;
  const pageNum = Math.max(1, parseInt(page as string || '1'));
  const limitNum = Math.max(1, parseInt(limit as string || '10'));
  const skip = (pageNum - 1) * limitNum;
  const searchStr = search as string || '';

  try {
    const where: any = {};
    if (searchStr) {
      where.OR = [
        { action: { contains: searchStr } },
        { details: { contains: searchStr } },
        {
          user: {
            email: { contains: searchStr }
          }
        }
      ];
    }

    const totalCount = await prisma.auditLog.count({ where });

    const logs = await prisma.auditLog.findMany({
      where,
      include: {
        user: {
          select: {
            email: true,
            globalRole: true
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limitNum
    });

    return res.json({
      data: logs,
      totalCount
    });
  } catch (error) {
    console.error('Fetch audit logs error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
