import { Router, Response } from 'express';
import bcrypt from 'bcryptjs';
import prisma from '../lib/prisma.js';
import { authenticateToken, requireGlobalRole, AuthenticatedRequest } from '../middleware/auth.js';
import { createAuditLog } from '../services/audit.js';
import { GlobalRole } from '@prisma/client';

const router = Router();

// Apply SUPER_ADMIN protection to all admin routes
router.use(authenticateToken);
router.use(requireGlobalRole([GlobalRole.SUPER_ADMIN]));

// List all ADMINs
router.get('/', async (req: AuthenticatedRequest, res: Response): Promise<any> => {
  try {
    const admins = await prisma.user.findMany({
      where: { globalRole: GlobalRole.ADMIN },
      select: {
        id: true,
        email: true,
        globalRole: true,
        createdAt: true,
        updatedAt: true,
        assignments: {
          select: {
            dashboardId: true,
            dashboard: {
              select: {
                name: true
              }
            }
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    return res.json(admins);
  } catch (error) {
    console.error('Fetch admins error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Create new ADMIN
router.post('/', async (req: AuthenticatedRequest, res: Response): Promise<any> => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  try {
    const existing = await prisma.user.findUnique({
      where: { email }
    });

    if (existing) {
      return res.status(400).json({ error: 'User with this email already exists' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        globalRole: GlobalRole.ADMIN
      },
      select: {
        id: true,
        email: true,
        globalRole: true,
        createdAt: true
      }
    });

    await createAuditLog(
      req.user!.id,
      'CREATE_ADMIN',
      `Super admin created admin account: ${email}`,
      req.ip
    );

    return res.status(201).json(user);
  } catch (error) {
    console.error('Create admin error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Update ADMIN
router.put('/:id', async (req: AuthenticatedRequest, res: Response): Promise<any> => {
  const { id } = req.params;
  const { email, password } = req.body;

  try {
    const user = await prisma.user.findUnique({
      where: { id }
    });

    if (!user || user.globalRole !== GlobalRole.ADMIN) {
      return res.status(404).json({ error: 'Admin user not found' });
    }

    const updateData: any = {};
    if (email) {
      const existing = await prisma.user.findUnique({ where: { email } });
      if (existing && existing.id !== id) {
        return res.status(400).json({ error: 'Email is already taken by another user' });
      }
      updateData.email = email;
    }

    if (password) {
      updateData.passwordHash = await bcrypt.hash(password, 10);
    }

    const updatedUser = await prisma.user.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        email: true,
        globalRole: true,
        updatedAt: true
      }
    });

    await createAuditLog(
      req.user!.id,
      'UPDATE_ADMIN',
      `Super admin updated admin account: ${updatedUser.email}`,
      req.ip
    );

    return res.json(updatedUser);
  } catch (error) {
    console.error('Update admin error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete ADMIN
router.delete('/:id', async (req: AuthenticatedRequest, res: Response): Promise<any> => {
  const { id } = req.params;

  try {
    const user = await prisma.user.findUnique({
      where: { id }
    });

    if (!user || user.globalRole !== GlobalRole.ADMIN) {
      return res.status(404).json({ error: 'Admin user not found' });
    }

    await prisma.user.delete({
      where: { id }
    });

    await createAuditLog(
      req.user!.id,
      'DELETE_ADMIN',
      `Super admin deleted admin account: ${user.email}`,
      req.ip
    );

    return res.json({ success: true });
  } catch (error) {
    console.error('Delete admin error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
