import { Router, Response } from 'express';
import prisma from '../lib/prisma.js';
import { authenticateToken, requireGlobalRole, AuthenticatedRequest } from '../middleware/auth.js';
import { createAuditLog } from '../services/audit.js';
import { GlobalRole } from '@prisma/client';
import { introspectMySQLConnection, parsePrismaSchemaText, syncDashboardSchema, syncMySQLRelations } from '../services/introspect.js';
import { encrypt } from '../lib/crypto.js';


const router = Router();

// Apply auth for all dashboard routes
router.use(authenticateToken);

// List dashboards (Super Admin sees all, Admin sees assigned only)
router.get('/', async (req: AuthenticatedRequest, res: Response): Promise<any> => {
  try {
    const isSuper = req.user!.globalRole === GlobalRole.SUPER_ADMIN;

    if (isSuper) {
      const dashboards = await prisma.dashboard.findMany({
        include: {
          connection: {
            select: {
              host: true,
              port: true,
              database: true
            }
          }
        },
        orderBy: { createdAt: 'desc' }
      });
      return res.json(dashboards);
    } else {
      const dashboards = await prisma.dashboard.findMany({
        where: {
          assignments: {
            some: { userId: req.user!.id }
          }
        },
        orderBy: { createdAt: 'desc' }
      });
      return res.json(dashboards);
    }
  } catch (error) {
    console.error('Fetch dashboards error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Create a dashboard (SUPER_ADMIN only)
router.post('/', requireGlobalRole([GlobalRole.SUPER_ADMIN]), async (req: AuthenticatedRequest, res: Response): Promise<any> => {
  const { name, description } = req.body;

  if (!name) {
    return res.status(400).json({ error: 'Dashboard name is required' });
  }

  try {
    const dashboard = await prisma.dashboard.create({
      data: { name, description }
    });

    await createAuditLog(
      req.user!.id,
      'CREATE_DASHBOARD',
      `Super admin created dashboard: ${name} (${dashboard.id})`,
      req.ip
    );

    return res.status(201).json(dashboard);
  } catch (error) {
    console.error('Create dashboard error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Get dashboard details (including connection & schema model visibility configuration)
router.get('/:id', async (req: AuthenticatedRequest, res: Response): Promise<any> => {
  const { id } = req.params;
  const isSuper = req.user!.globalRole === GlobalRole.SUPER_ADMIN;

  try {
    // If not super admin, check if assigned
    if (!isSuper) {
      const assignment = await prisma.dashboardAssignment.findUnique({
        where: {
          userId_dashboardId: {
            userId: req.user!.id,
            dashboardId: id
          }
        }
      });
      if (!assignment) {
        return res.status(403).json({ error: 'Forbidden: You do not have access to this dashboard' });
      }
    }

    const dashboard = await prisma.dashboard.findUnique({
      where: { id },
      include: {
        connection: {
          select: {
            host: true,
            port: true,
            username: true,
            database: true,
            sslEnabled: true
            // omit password for general view. Super Admins can configure it, but we can return fields without returning password unless needed.
          }
        },
        models: {
          include: {
            fields: true
          }
        },
        assignments: {
          where: {
            userId: req.user!.id
          }
        }
      }
    });

    if (!dashboard) {
      return res.status(404).json({ error: 'Dashboard not found' });
    }

    return res.json(dashboard);
  } catch (error) {
    console.error('Fetch dashboard details error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Update dashboard info (SUPER_ADMIN only)
router.put('/:id', requireGlobalRole([GlobalRole.SUPER_ADMIN]), async (req: AuthenticatedRequest, res: Response): Promise<any> => {
  const { id } = req.params;
  const { name, description } = req.body;

  try {
    const updated = await prisma.dashboard.update({
      where: { id },
      data: { name, description }
    });

    await createAuditLog(
      req.user!.id,
      'UPDATE_DASHBOARD',
      `Super admin updated dashboard details for: ${name} (${id})`,
      req.ip
    );

    return res.json(updated);
  } catch (error) {
    console.error('Update dashboard error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete dashboard (SUPER_ADMIN only)
router.delete('/:id', requireGlobalRole([GlobalRole.SUPER_ADMIN]), async (req: AuthenticatedRequest, res: Response): Promise<any> => {
  const { id } = req.params;

  try {
    const dashboard = await prisma.dashboard.findUnique({ where: { id } });
    if (!dashboard) {
      return res.status(404).json({ error: 'Dashboard not found' });
    }

    await prisma.dashboard.delete({ where: { id } });

    await createAuditLog(
      req.user!.id,
      'DELETE_DASHBOARD',
      `Super admin deleted dashboard: ${dashboard.name} (${id})`,
      req.ip
    );

    return res.json({ success: true });
  } catch (error) {
    console.error('Delete dashboard error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Save database connection details (SUPER_ADMIN only)
router.post('/:id/connection', requireGlobalRole([GlobalRole.SUPER_ADMIN]), async (req: AuthenticatedRequest, res: Response): Promise<any> => {
  const { id } = req.params;
  const { host, port, username, password, database, sslEnabled } = req.body;

  if (!host || !port || !username || !database) {
    return res.status(400).json({ error: 'Host, port, username, and database name are required' });
  }

  try {
    const dashboard = await prisma.dashboard.findUnique({ where: { id } });
    if (!dashboard) {
      return res.status(404).json({ error: 'Dashboard not found' });
    }

    const connection = await prisma.databaseConnection.upsert({
      where: { dashboardId: id },
      update: {
        host,
        port: parseInt(port),
        username,
        password: password !== undefined ? encrypt(password) : undefined,
        database,
        sslEnabled: !!sslEnabled
      },
      create: {
        dashboardId: id,
        host,
        port: parseInt(port),
        username,
        password: password ? encrypt(password) : '',
        database,
        sslEnabled: !!sslEnabled
      }
    });

    await createAuditLog(
      req.user!.id,
      'SAVE_CONNECTION',
      `Super admin saved database connection for dashboard ${dashboard.name} (${id})`,
      req.ip
    );

    // Omit password from output
    const { password: _, ...rest } = connection;
    return res.json(rest);
  } catch (error) {
    console.error('Save connection details error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Trigger database schema introspection (SUPER_ADMIN only)
router.post('/:id/introspect', requireGlobalRole([GlobalRole.SUPER_ADMIN]), async (req: AuthenticatedRequest, res: Response): Promise<any> => {
  const { id } = req.params;

  try {
    const dashboard = await prisma.dashboard.findUnique({
      where: { id },
      include: { connection: true }
    });

    if (!dashboard) {
      return res.status(404).json({ error: 'Dashboard not found' });
    }

    if (!dashboard.connection) {
      return res.status(400).json({ error: 'No database connection configured for this dashboard' });
    }

    const parsedModels = await introspectMySQLConnection(dashboard.connection);
    await syncDashboardSchema(id, parsedModels);
    await syncMySQLRelations(id, dashboard.connection);

    await createAuditLog(
      req.user!.id,
      'INTROSPECT_DATABASE',
      `Super admin triggered database introspection for dashboard: ${dashboard.name} (${id})`,
      req.ip
    );

    return res.json({ success: true, models: parsedModels });
  } catch (error: any) {
    console.error('Database introspection error:', error);
    return res.status(500).json({ error: `Introspection failed: ${error.message || error}` });
  }
});

// Upload Prisma schema text (SUPER_ADMIN only)
router.post('/:id/upload-schema', requireGlobalRole([GlobalRole.SUPER_ADMIN]), async (req: AuthenticatedRequest, res: Response): Promise<any> => {
  const { id } = req.params;
  const { schemaText } = req.body;

  if (!schemaText) {
    return res.status(400).json({ error: 'schemaText is required' });
  }

  try {
    const dashboard = await prisma.dashboard.findUnique({ where: { id } });
    if (!dashboard) {
      return res.status(404).json({ error: 'Dashboard not found' });
    }

    const parsedModels = parsePrismaSchemaText(schemaText);
    await syncDashboardSchema(id, parsedModels);

    await createAuditLog(
      req.user!.id,
      'UPLOAD_PRISMA_SCHEMA',
      `Super admin uploaded Prisma schema for dashboard: ${dashboard.name} (${id})`,
      req.ip
    );

    return res.json({ success: true, models: parsedModels });
  } catch (error: any) {
    console.error('Prisma schema upload parsing error:', error);
    return res.status(500).json({ error: `Schema parsing failed: ${error.message || error}` });
  }
});

// Update schema visibility / display configurations (SUPER_ADMIN only)
router.put('/:id/schema-config', requireGlobalRole([GlobalRole.SUPER_ADMIN]), async (req: AuthenticatedRequest, res: Response): Promise<any> => {
  const { id } = req.params;
  const { config } = req.body; // config: { models: Array<{ id, isVisible, displayName, fields: Array<{ id, isVisible, displayName }> }> }

  if (!config || !Array.isArray(config.models)) {
    return res.status(400).json({ error: 'Invalid configuration format' });
  }

  try {
    const dashboard = await prisma.dashboard.findUnique({ where: { id } });
    if (!dashboard) {
      return res.status(404).json({ error: 'Dashboard not found' });
    }

    await prisma.$transaction(async (tx) => {
      for (const modelCfg of config.models) {
        // Update model visibility
        await tx.schemaModel.update({
          where: { id: modelCfg.id, dashboardId: id },
          data: {
            isVisible: modelCfg.isVisible,
            displayName: modelCfg.displayName
          }
        });

        if (Array.isArray(modelCfg.fields)) {
          for (const fieldCfg of modelCfg.fields) {
            // Update field visibility
            await tx.schemaField.update({
              where: { id: fieldCfg.id, schemaModelId: modelCfg.id },
              data: {
                isVisible: fieldCfg.isVisible,
                displayName: fieldCfg.displayName
              }
            });
          }
        }
      }
    });

    await createAuditLog(
      req.user!.id,
      'UPDATE_SCHEMA_CONFIG',
      `Super admin updated schema visibility config for dashboard: ${dashboard.name} (${id})`,
      req.ip
    );

    return res.json({ success: true });
  } catch (error) {
    console.error('Save schema config error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
