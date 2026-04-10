"use server";

import { prisma } from "@/lib/db";
import { createTitularSchema, updateTitularSchema } from "@/lib/validators";
import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth-guard";
import { getAuditRequestMeta } from "@/lib/audit";

export async function getTitulares(params?: { search?: string; page?: number; pageSize?: number }) {
  const { search, page = 1, pageSize = 20 } = params || {};

  const where: Record<string, unknown> = { deletedAt: null, activo: true };
  if (search) {
    where.OR = [
      { razonSocial: { contains: search, mode: "insensitive" } },
      { cuit: { contains: search } },
    ];
  }

  const [titulares, total] = await Promise.all([
    prisma.titular.findMany({
      where,
      include: { _count: { select: { guias: true } } },
      orderBy: { razonSocial: "asc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.titular.count({ where }),
  ]);

  return { titulares, total, pages: Math.ceil(total / pageSize) };
}

export async function searchTitulares(query: string) {
  if (!query || query.length < 2) return [];
  return prisma.titular.findMany({
    where: {
      deletedAt: null,
      activo: true,
      OR: [
        { razonSocial: { contains: query, mode: "insensitive" } },
        { cuit: { contains: query } },
      ],
    },
    take: 10,
    orderBy: { razonSocial: "asc" },
  });
}

export async function createTitular(data: unknown) {
  const session = await requireRole("admin", "recaudacion");
  const auditMeta = await getAuditRequestMeta();

  const parsed = createTitularSchema.safeParse(data);
  if (!parsed.success) return { error: parsed.error.flatten().fieldErrors };

  try {
    const titular = await prisma.$transaction(async (tx) => {
      const created = await tx.titular.create({
        data: {
          razonSocial: parsed.data.razonSocial,
          cuit: parsed.data.cuit,
          email: parsed.data.email || null,
          telefono: parsed.data.telefono || null,
          direccion: parsed.data.direccion || null,
        },
      });

      await tx.auditLog.create({
        data: {
          userId: session.user.id,
          userEmail: session.user.email,
          ipAddress: auditMeta.ipAddress,
          userAgent: auditMeta.userAgent,
          action: "CREATE_TITULAR",
          entityType: "Titular",
          entityId: created.id,
          newValues: {
            razonSocial: created.razonSocial,
            cuit: created.cuit,
            email: created.email,
            telefono: created.telefono,
            direccion: created.direccion,
          },
        },
      });

      return created;
    });
    revalidatePath("/titulares");
    return { success: true, titular };
  } catch (e: unknown) {
    const err = e as { code?: string };
    if (err.code === "P2002") return { error: { cuit: ["Ya existe un titular con ese CUIT"] } };
    return { error: { _form: ["Error al crear el titular"] } };
  }
}

export async function updateTitular(data: unknown) {
  const session = await requireRole("admin", "recaudacion");
  const auditMeta = await getAuditRequestMeta();

  const parsed = updateTitularSchema.safeParse(data);
  if (!parsed.success) return { error: parsed.error.flatten().fieldErrors };
  const { id, ...updateData } = parsed.data;
  try {
    const titularAntes = await prisma.titular.findUnique({
      where: { id },
      select: {
        id: true,
        razonSocial: true,
        cuit: true,
        email: true,
        telefono: true,
        direccion: true,
        activo: true,
      },
    });

    if (!titularAntes) {
      return { error: { _form: ["Titular no encontrado"] } };
    }

    const titularDespues = await prisma.titular.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        razonSocial: true,
        cuit: true,
        email: true,
        telefono: true,
        direccion: true,
        activo: true,
      },
    });

    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        userEmail: session.user.email,
        ipAddress: auditMeta.ipAddress,
        userAgent: auditMeta.userAgent,
        action: "UPDATE_TITULAR",
        entityType: "Titular",
        entityId: id,
        oldValues: titularAntes,
        newValues: titularDespues,
      },
    });

    revalidatePath("/titulares");
    return { success: true };
  } catch {
    return { error: { _form: ["Error al actualizar"] } };
  }
}

export async function deleteTitular(id: number) {
  const session = await requireRole("admin", "recaudacion");
  const auditMeta = await getAuditRequestMeta();

  try {
    const titular = await prisma.titular.findUnique({ where: { id } });
    if (!titular) return { error: "Titular no encontrado" };

    await prisma.$transaction(async (tx) => {
      const nuevoCuit = `${titular.cuit}-DEL-${Date.now()}`;

      await tx.titular.update({
        where: { id },
        data: {
          deletedAt: new Date(),
          activo: false,
          cuit: nuevoCuit,
        },
      });

      await tx.auditLog.create({
        data: {
          userId: session.user.id,
          userEmail: session.user.email,
          ipAddress: auditMeta.ipAddress,
          userAgent: auditMeta.userAgent,
          action: "DELETE_TITULAR",
          entityType: "Titular",
          entityId: id,
          oldValues: {
            razonSocial: titular.razonSocial,
            cuit: titular.cuit,
            activo: titular.activo,
          },
          newValues: {
            deletedAt: true,
            activo: false,
            cuit: nuevoCuit,
          },
        },
      });
    });
    revalidatePath("/titulares");
    return { success: true };
  } catch (e) {
    return { error: "Error al eliminar el titular" };
  }
}
