"use server";

import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireRole } from "@/lib/auth-guard";
import { getAuditRequestMeta } from "@/lib/audit";
import { toCsvValue } from "@/lib/csv";

const updateUserSchema = z.object({
  id: z.string(),
  name: z.string().min(2).optional(),
  email: z.string().email().optional(),
  // Fix #7: All 7 roles from the schema
  role: z.enum(["admin", "central", "delegacion", "control", "auditor", "recaudacion", "fiscalizador"]).optional(),
  delegacionId: z.number().int().optional().nullable(),
});

export async function getUsers() {
  await requireRole("admin");
  return prisma.user.findMany({
    where: { deletedAt: null },
    include: { delegacion: true },
    orderBy: { createdAt: "desc" },
  });
}

export async function updateUser(data: unknown) {
  const session = await requireRole("admin");
  const auditMeta = await getAuditRequestMeta();

  const parsed = updateUserSchema.safeParse(data);
  if (!parsed.success) return { error: parsed.error.flatten().fieldErrors };

  const { id, ...updateData } = parsed.data;
  try {
    const userAntes = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        delegacionId: true,
      },
    });

    if (!userAntes) {
      return { error: { _form: ["Usuario no encontrado"] } };
    }

    const userDespues = await prisma.user.update({
      where: { id },
      data: updateData as any,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        delegacionId: true,
      },
    });

    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        userEmail: session.user.email,
        ipAddress: auditMeta.ipAddress,
        userAgent: auditMeta.userAgent,
        action: "UPDATE_USER",
        entityType: "User",
        newValues: userDespues,
        oldValues: userAntes,
      },
    });

    revalidatePath("/admin");
    return { success: true };
  } catch {
    return { error: { _form: ["Error al actualizar usuario"] } };
  }
}

export async function deleteUser(id: string) {
  const session = await requireRole("admin");
  const auditMeta = await getAuditRequestMeta();
  
  // Prevent deleting yourself
  if (session.user.id === id) {
    return { error: "No puedes eliminarte a vos mismo." };
  }

  try {
    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) return { error: "Usuario no encontrado" };

    const nuevoEmail = `${user.email} (eliminado ${Date.now()})`;

    await prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id },
        data: {
          deletedAt: new Date(),
          email: nuevoEmail,
        },
      });

      await tx.auditLog.create({
        data: {
          userId: session.user.id,
          userEmail: session.user.email,
          ipAddress: auditMeta.ipAddress,
          userAgent: auditMeta.userAgent,
          action: "DELETE_USER",
          entityType: "User",
          oldValues: {
            id: user.id,
            email: user.email,
            role: user.role,
          },
          newValues: {
            deletedAt: true,
            email: nuevoEmail,
          },
        },
      });
    });

    revalidatePath("/admin");
    return { success: true };
  } catch {
    return { error: "Error al eliminar usuario" };
  }
}

export async function createUser(data: {
  name: string;
  email: string;
  password: string;
  role: string;
  delegacionId?: number | null;
}) {
  const session = await requireRole("admin");
  const auditMeta = await getAuditRequestMeta();

  try {
    const res = await fetch(
      `${process.env.BETTER_AUTH_URL || "http://localhost:3000"}/api/auth/sign-up/email`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Origin: process.env.BETTER_AUTH_URL || "http://localhost:3000",
        },
        body: JSON.stringify({
          name: data.name,
          email: data.email,
          password: data.password,
        }),
      }
    );
    const result = await res.json();

    if (result.user?.id) {
      await prisma.user.update({
        where: { id: result.user.id },
        data: {
          role: data.role as any,
          delegacionId: data.delegacionId || null,
        },
      });

      await prisma.auditLog.create({
        data: {
          userId: session.user.id,
          userEmail: session.user.email,
          ipAddress: auditMeta.ipAddress,
          userAgent: auditMeta.userAgent,
          action: "CREATE_USER",
          entityType: "User",
          newValues: {
            id: result.user.id,
            email: data.email,
            name: data.name,
            role: data.role,
            delegacionId: data.delegacionId || null,
          },
        },
      });

      revalidatePath("/admin");
      return { success: true };
    }

    return { error: { _form: [result.message || "Error al crear usuario"] } };
  } catch {
    return { error: { _form: ["Error de conexión"] } };
  }
}

// Audit log
export async function getAuditLog(params?: {
  page?: number;
  pageSize?: number;
  action?: string;
  entityType?: string;
  search?: string;
}) {
  await requireRole("admin", "auditor");

  const { page = 1, pageSize = 50, action, entityType, search } = params || {};
  const where: Record<string, unknown> = {};

  if (action) where.action = action;
  if (entityType) where.entityType = entityType;
  if (search) {
    where.OR = [
      { action: { contains: search, mode: "insensitive" } },
      { entityType: { contains: search, mode: "insensitive" } },
      { userEmail: { contains: search, mode: "insensitive" } },
    ];
  }

  const [logsList, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.auditLog.count({ where }),
  ]);

  const logs = logsList.map((log: any) => ({
    ...log,
    id: Number(log.id),
    entity: log.entityType || null,
    user: log.userId ? { name: log.userEmail?.split('@')[0] || 'Unknown', email: log.userEmail || '' } : null,
  }));

  return { logs, total, pages: Math.ceil(total / pageSize) };
}

export async function exportAuditLogCsv(params?: {
  action?: string;
  entityType?: string;
  search?: string;
}) {
  await requireRole("admin", "auditor");

  const { action, entityType, search } = params || {};
  const where: Record<string, unknown> = {};

  if (action) where.action = action;
  if (entityType) where.entityType = entityType;
  if (search) {
    where.OR = [
      { action: { contains: search, mode: "insensitive" } },
      { entityType: { contains: search, mode: "insensitive" } },
      { userEmail: { contains: search, mode: "insensitive" } },
    ];
  }

  const logs = await prisma.auditLog.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: 100000,
  });

  const header = [
    "id",
    "createdAt",
    "userEmail",
    "action",
    "entityType",
    "entityId",
    "ipAddress",
    "userAgent",
    "oldValues",
    "newValues",
  ];

  const rows = logs.map((log) => [
    toCsvValue(Number(log.id)),
    toCsvValue(log.createdAt.toISOString()),
    toCsvValue(log.userEmail),
    toCsvValue(log.action),
    toCsvValue(log.entityType),
    toCsvValue(log.entityId),
    toCsvValue(log.ipAddress),
    toCsvValue(log.userAgent),
    toCsvValue(log.oldValues),
    toCsvValue(log.newValues),
  ].join(","));

  const csv = [header.join(","), ...rows].join("\n");
  const fecha = new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");

  return {
    filename: `audit-log-${fecha}.csv`,
    content: csv,
    count: logs.length,
  };
}
