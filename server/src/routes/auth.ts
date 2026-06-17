import { Router, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import prisma from '../lib/prisma.js';
import { authenticateToken, AuthenticatedRequest } from '../middleware/auth.js';
import { createAuditLog } from '../services/audit.js';

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'dashmint-super-secret-key-2026';

router.post('/login', async (req, res): Promise<any> => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  try {
    const user = await prisma.user.findUnique({
      where: { email }
    });

    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const token = jwt.sign(
      { userId: user.id, email: user.email },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.cookie('access_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    });

    await createAuditLog(user.id, 'USER_LOGIN', `User ${user.email} logged in successfully`, req.ip);

    return res.json({
      user: {
        id: user.id,
        email: user.email,
        globalRole: user.globalRole
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/logout', authenticateToken, async (req: AuthenticatedRequest, res): Promise<any> => {
  if (req.user) {
    await createAuditLog(req.user.id, 'USER_LOGOUT', `User ${req.user.email} logged out`, req.ip);
  }
  res.clearCookie('access_token');
  return res.json({ success: true });
});

router.get('/me', authenticateToken, (req: AuthenticatedRequest, res): any => {
  return res.json({ user: req.user });
});

export default router;
