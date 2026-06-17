import { Response, NextFunction, Request } from 'express';
import jwt from 'jsonwebtoken';
import prisma from '../lib/prisma.js';
import { GlobalRole } from '@prisma/client';

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    globalRole: GlobalRole;
  };
}

const JWT_SECRET = process.env.JWT_SECRET || 'dashmint-super-secret-key-2026';

export async function authenticateToken(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const token = req.cookies?.access_token || req.headers.authorization?.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Authentication token is missing' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { userId: string; email: string };
    
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId }
    });

    if (!user) {
      return res.status(401).json({ error: 'User no longer exists' });
    }

    req.user = {
      id: user.id,
      email: user.email,
      globalRole: user.globalRole
    };

    return next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

export function requireGlobalRole(roles: GlobalRole[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthenticated' });
    }

    if (!roles.includes(req.user.globalRole)) {
      return res.status(403).json({ error: 'Forbidden: Insufficient global role permissions' });
    }

    return next();
  };
}

export function requireDashboardAccess(action: 'read' | 'export') {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthenticated' });
    }

    // Attempt to locate dashboardId from request parameters, body, or query
    const dashboardId = req.params.dashboardId || req.body.dashboardId || req.query.dashboardId as string;

    if (!dashboardId) {
      return res.status(400).json({ error: 'dashboardId is required' });
    }

    // SUPER_ADMIN has full access to all dashboards
    if (req.user.globalRole === GlobalRole.SUPER_ADMIN) {
      return next();
    }

    // Check assignments for ADMIN role
    const assignment = await prisma.dashboardAssignment.findUnique({
      where: {
        userId_dashboardId: {
          userId: req.user.id,
          dashboardId: dashboardId
        }
      }
    });

    if (!assignment) {
      return res.status(403).json({ error: 'Forbidden: You do not have access to this dashboard' });
    }

    try {
      const permissions = JSON.parse(assignment.permissionsJson);
      if (permissions && permissions[action] === true) {
        return next();
      }
      return res.status(403).json({ error: `Forbidden: Dashboard does not permit '${action}' action` });
    } catch (err) {
      return res.status(403).json({ error: 'Forbidden: Invalid assignment permissions' });
    }
  };
}
