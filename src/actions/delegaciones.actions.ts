"use server";

import { prisma } from "@/lib/db";
import { createDelegacionSchema, updateDelegacionSchema } from "@/lib/validators";
import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth-guard";
import { getAuditRequestMeta } from "@/lib/audit";

export async function getDelegaciones() {
  // Cualquier usuario autenticado puede ver delegaciones (la UI filtra lo que muestra)
  const delegaciones = await prisma.delegacion.findMany({
    where: { deletedAt: null },
    include: {
      _count: { select: { guias: true, remitos: true, usuarios: true } },
    },
    orderBy: { nombre: "asc" },
  });

  // Calculate detailed counts for Recaudacion (Talonarios)
  // Regla de negocio:
  // - Guía "en blanco/virgen": no tiene ningún remito vinculado
  // - Remito "en blanco/virgen": no tiene guía vinculada
  const result = await Promise.all(delegaciones.map(async (d: any) => {
    const [guiasVirgenes, remitosVirgenes] = await Promise.all([
      prisma.guia.count({
        where: {
          delegacionId: d.id,
          deletedAt: null,
          remitos: { none: { deletedAt: null } },
        },
      }),
      prisma.remito.count({
        where: {
          delegacionId: d.id,
          deletedAt: null,
          guiaId: null,
        },
      }),
    ]);
    return {
      ...d,
      stats: {
        guiasVirgenes,
        guiasUsadas: d._count.guias - guiasVirgenes,
        remitosVirgenes,
        remitosUsados: d._count.remitos - remitosVirgenes,
      }
    };
  }));

  return result;
}

export async function createDelegacion(data: unknown) {
  const session = await requireRole("admin", "recaudacion");
  const auditMeta = await getAuditRequestMeta();

  const parsed = createDelegacionSchema.safeParse(data);
  if (!parsed.success) return { error: parsed.error.flatten().fieldErrors };

  try {
    const delegacion = await prisma.$transaction(async (tx) => {
      const created = await tx.delegacion.create({
        data: {
          nombre: parsed.data.nombre,
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
          action: "CREATE_DELEGACION",
          entityType: "Delegacion",
          entityId: created.id,
          newValues: {
            nombre: created.nombre,
            email: created.email,
            telefono: created.telefono,
            direccion: created.direccion,
            activa: created.activa,
          },
        },
      });

      return created;
    });
    revalidatePath("/delegaciones");
    return { success: true, delegacion };
  } catch (e: unknown) {
    const err = e as { code?: string };
    if (err.code === "P2002") return { error: { nombre: ["Ya existe una delegación con ese nombre"] } };
    return { error: { _form: ["Error al crear la delegación"] } };
  }
}

export async function updateDelegacion(data: unknown) {
  const session = await requireRole("admin", "recaudacion");
  const auditMeta = await getAuditRequestMeta();

  const parsed = updateDelegacionSchema.safeParse(data);
  if (!parsed.success) return { error: parsed.error.flatten().fieldErrors };

  const { id, ...updateData } = parsed.data;
  try {
    const delegacionAntes = await prisma.delegacion.findUnique({
      where: { id },
      select: {
        id: true,
        nombre: true,
        email: true,
        telefono: true,
        direccion: true,
        activa: true,
      },
    });

    if (!delegacionAntes) {
      return { error: { _form: ["Delegación no encontrada"] } };
    }

    const delegacionDespues = await prisma.delegacion.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        nombre: true,
        email: true,
        telefono: true,
        direccion: true,
        activa: true,
      },
    });

    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        userEmail: session.user.email,
        ipAddress: auditMeta.ipAddress,
        userAgent: auditMeta.userAgent,
        action: "UPDATE_DELEGACION",
        entityType: "Delegacion",
        entityId: id,
        oldValues: delegacionAntes,
        newValues: delegacionDespues,
      },
    });

    revalidatePath("/delegaciones");
    return { success: true };
  } catch {
    return { error: { _form: ["Error al actualizar"] } };
  }
}

export async function deleteDelegacion(id: number) {
  const session = await requireRole("admin");
  const auditMeta = await getAuditRequestMeta();

  try {
    const delegacion = await prisma.delegacion.findUnique({ where: { id } });
    if (!delegacion) return { error: "Delegación no encontrada." };

    // Use a transaction to desvinculate all child entities THEN soft-delete
    await prisma.$transaction(async (tx: any) => {
      // 1. Desvincular guías asignadas a esta delegación
      await tx.guia.updateMany({
        where: { delegacionId: id },
        data: { delegacionId: null },
      });

      // 2. Desvincular remitos asignados a esta delegación
      await tx.remito.updateMany({
        where: { delegacionId: id },
        data: { delegacionId: null },
      });

      // 3. Desvincular usuarios de esta delegación
      await tx.user.updateMany({
        where: { delegacionId: id },
        data: { delegacionId: null },
      });

      // 4. Soft delete con timestamp único para evitar colisión unique
      const nuevoNombre = `${delegacion.nombre} (eliminada ${Date.now()})`;
      await tx.delegacion.update({
        where: { id },
        data: {
          deletedAt: new Date(),
          activa: false,
          nombre: nuevoNombre,
        },
      });

      await tx.auditLog.create({
        data: {
          userId: session.user.id,
          userEmail: session.user.email,
          ipAddress: auditMeta.ipAddress,
          userAgent: auditMeta.userAgent,
          action: "DELETE_DELEGACION",
          entityType: "Delegacion",
          entityId: id,
          oldValues: {
            nombre: delegacion.nombre,
            activa: delegacion.activa,
          },
          newValues: {
            deletedAt: true,
            activa: false,
            nombre: nuevoNombre,
          },
        },
      });
    });

    revalidatePath("/delegaciones");
    return { success: true };
  } catch (e: any) {
    console.error("Error deleting delegacion:", e);
    return { error: e.message || "Error interno al eliminar la delegación." };
  }
}
