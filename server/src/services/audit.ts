import prisma from '../lib/prisma.js';

export async function createAuditLog(
  userId: string | null,
  action: string,
  details: string,
  ipAddress?: string
) {
  try {
    await prisma.auditLog.create({
      data: {
        userId,
        action,
        details,
        ipAddress: ipAddress || null
      }
    });
  } catch (error) {
    console.error('Failed to create audit log:', error);
  }
}
