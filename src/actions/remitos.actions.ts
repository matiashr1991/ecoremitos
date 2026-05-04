"use server";

import { prisma } from "@/lib/db";
import { createRemitoSchema, createRemitosBulkSchema, updateRemitoSchema } from "@/lib/validators";
import { revalidatePath } from "next/cache";
import { requireRole, requireAuth } from "@/lib/auth-guard";
import { getAuditRequestMeta } from "@/lib/audit";

export async function getRemitos(params: {
  page?: number;
  pageSize?: number;
  search?: string;
  estado?: string;
  delegacionId?: number;
  guiaId?: number;
  soloLibres?: boolean;
}) {
  const { page = 1, pageSize = 20, search, estado, guiaId, soloLibres } = params;
  let { delegacionId } = params;

  const session = await requireAuth();
  if (session.user.role === "delegacion") {
    if (!session.user.delegacionId) return { remitos: [], total: 0, pages: 0 };
    delegacionId = session.user.delegacionId;
  }

  const where: Record<string, unknown> = { deletedAt: null };
  if (estado) where.estado = estado;
  if (delegacionId) where.delegacionId = delegacionId;
  if (guiaId) where.guiaId = guiaId;
  if (soloLibres) where.guiaId = null;
  if (search) {
    const num = parseInt(search);
    if (!isNaN(num)) {
      where.OR = [
        { nrremito: num },
        { guia: { nrguia: num } }
      ];
    }
  }

  const [remitos, total] = await Promise.all([
    prisma.remito.findMany({
      where,
      include: { guia: true, delegacion: true },
      orderBy: { nrremito: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.remito.count({ where }),
  ]);

  return { remitos, total, pages: Math.ceil(total / pageSize) };
}

export async function createRemito(data: unknown) {
  const session = await requireRole("admin", "recaudacion");
  const auditMeta = await getAuditRequestMeta();

  const parsed = createRemitoSchema.safeParse(data);
  if (!parsed.success) return { error: parsed.error.flatten().fieldErrors };

  try {
    const remito = await prisma.$transaction(async (tx) => {
      const created = await tx.remito.create({
        data: {
          nrremito: parsed.data.nrremito,
          guiaId: parsed.data.guiaId,
          delegacionId: parsed.data.delegacionId,
          observaciones: parsed.data.observaciones || null,
          estado: parsed.data.guiaId ? "vinculado" : "disponible",
          fechaVinculacion: parsed.data.guiaId ? new Date() : null,
        },
      });

      await tx.auditLog.create({
        data: {
          userId: session.user.id,
          userEmail: session.user.email,
          ipAddress: auditMeta.ipAddress,
          userAgent: auditMeta.userAgent,
          action: "CREATE_REMITO",
          entityType: "Remito",
          entityId: created.id,
          newValues: {
            nrremito: created.nrremito,
            estado: created.estado,
            guiaId: created.guiaId,
            delegacionId: created.delegacionId,
          },
        },
      });

      return created;
    });
    revalidatePath("/remitos");
    revalidatePath("/");
    return { success: true, remito };
  } catch (e: unknown) {
    const err = e as { code?: string };
    if (err.code === "P2002") return { error: { nrremito: ["Ya existe un remito con ese número"] } };
    return { error: { _form: ["Error al crear el remito"] } };
  }
}

export async function createRemitosBulk(data: unknown) {
  await requireRole("admin", "recaudacion");
  const auditMeta = await getAuditRequestMeta();

  const parsed = createRemitosBulkSchema.safeParse(data);
  if (!parsed.success) return { error: parsed.error.flatten().fieldErrors };

  const { desde, hasta, delegacionId } = parsed.data;
  let created = 0;
  const errors: string[] = [];

  for (let i = desde; i <= hasta; i++) {
    try {
      await prisma.remito.create({
        data: { nrremito: i, delegacionId, estado: "disponible" },
      });
      created++;
    } catch {
      errors.push(`Remito ${i} ya existe`);
    }
  }

  revalidatePath("/remitos");
  revalidatePath("/");

  // AGREGADO: Log de auditoría para el historial de entregas
  const session = await requireAuth();
  await prisma.auditLog.create({
    data: {
      userId: session.user.id,
      userEmail: session.user.email,
      ipAddress: auditMeta.ipAddress,
      userAgent: auditMeta.userAgent,
      action: "CREATE_REMITOS_BULK",
      entityType: "Remito",
      newValues: { desde, hasta, count: created, delegacionId, errors: errors.length }
    }
  });

  return { success: true, created, errors };
}

export async function updateRemito(data: unknown) {
  const session = await requireRole("admin", "recaudacion");
  const auditMeta = await getAuditRequestMeta();

  const parsed = updateRemitoSchema.safeParse(data);
  if (!parsed.success) return { error: parsed.error.flatten().fieldErrors };
  const { id, ...updateData } = parsed.data;
  try {
    const remitoAntes = await prisma.remito.findUnique({
      where: { id },
      select: {
        id: true,
        nrremito: true,
        estado: true,
        guiaId: true,
        delegacionId: true,
        devuelto: true,
        observaciones: true,
      },
    });

    if (!remitoAntes) {
      return { error: { _form: ["Remito no encontrado"] } };
    }

    const remitoDespues = await prisma.remito.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        nrremito: true,
        estado: true,
        guiaId: true,
        delegacionId: true,
        devuelto: true,
        observaciones: true,
      },
    });

    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        userEmail: session.user.email,
        ipAddress: auditMeta.ipAddress,
        userAgent: auditMeta.userAgent,
        action: "UPDATE_REMITO",
        entityType: "Remito",
        entityId: id,
        oldValues: remitoAntes,
        newValues: remitoDespues,
      },
    });

    revalidatePath("/remitos");
    return { success: true };
  } catch {
    return { error: { _form: ["Error al actualizar"] } };
  }
}

export async function deleteRemito(id: number) {
  const session = await requireRole("admin", "recaudacion");
  const auditMeta = await getAuditRequestMeta();

  try {
    const remito = await prisma.remito.findUnique({ where: { id } });
    if (!remito) return { error: "Remito no encontrado" };

    await prisma.$transaction(async (tx) => {
      const nuevoNr = remito.nrremito > 0 ? -remito.nrremito : remito.nrremito;

      await tx.remito.update({
        where: { id },
        data: {
          deletedAt: new Date(),
          nrremito: nuevoNr,
        },
      });

      await tx.auditLog.create({
        data: {
          userId: session.user.id,
          userEmail: session.user.email,
          ipAddress: auditMeta.ipAddress,
          userAgent: auditMeta.userAgent,
          action: "DELETE_REMITO",
          entityType: "Remito",
          entityId: id,
          oldValues: {
            nrremito: remito.nrremito,
            estado: remito.estado,
            guiaId: remito.guiaId,
            delegacionId: remito.delegacionId,
          },
          newValues: {
            deletedAt: true,
            nrremito: nuevoNr,
          },
        },
      });
    });
    revalidatePath("/remitos");
    revalidatePath("/");
    return { success: true };
  } catch (e) {
    return { error: "Error al eliminar el remito" };
  }
}

export async function previewVinculacionRemitos(numeros: number[], delegacionId: number) {
  // Any authenticated user can preview
  const remitos = await prisma.remito.findMany({
    where: {
      nrremito: { in: numeros },
      delegacionId,
      deletedAt: null
    },
    select: { nrremito: true, estado: true, delegacionId: true }
  });

  const resultados = numeros.map(n => {
    const r = remitos.find((rem: any) => rem.nrremito === n);
    if (!r) return { numero: n, status: "error", message: "No pertenece a su delegación o no existe" };
    if (r.estado !== "disponible") return { numero: n, status: "warning", message: `Ya está usado (${r.estado})` };
    return { numero: n, status: "ok", message: "Disponible" };
  });

  return resultados;
}

export async function vincularRemitosExactos(guiaId: number, numeros: number[]) {
  const session = await requireRole("admin", "recaudacion", "delegacion");
  const auditMeta = await getAuditRequestMeta();

  try {
    // FIX #3: Validate the guía exists and get its delegacionId and state
    const guia = await prisma.guia.findUnique({ 
      where: { id: guiaId }, 
      select: { id: true, delegacionId: true, estado: true, tipo: true, deposito: true } 
    });
    if (!guia) return { error: "Guía no encontrada." };
    if (guia.tipo === "deposito" || guia.deposito) return { error: "Las guías de depósito no admiten remitos vinculados." };
    if (guia.estado === "intervenida") return { error: "No se pueden vincular remitos a una guía INTERVENIDA." };
    if (guia.estado === "vencida") return { error: "No se pueden vincular remitos a una guía VENCIDA." };
    if (!guia.delegacionId) return { error: "La guía no tiene delegación asignada." };

    // FIX #3: Only update remitos that belong to the SAME delegation as the guía
    const updateResult = await prisma.remito.updateMany({
      where: {
        nrremito: { in: numeros },
        estado: "disponible",
        delegacionId: guia.delegacionId, // <-- KEY FIX: validate delegation match
        deletedAt: null
      },
      data: {
        guiaId,
        estado: "vinculado",
        fechaVinculacion: new Date()
      }
    });

    // Audit
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        userEmail: session.user.email,
        ipAddress: auditMeta.ipAddress,
        userAgent: auditMeta.userAgent,
        action: "VINCULAR_REMITOS",
        entityType: "Guia",
        entityId: guiaId,
        newValues: { detalles: `Se vincularon ${updateResult.count} remitos: ${numeros.join(", ")}` },
      }
    });

    revalidatePath("/guias");
    revalidatePath("/remitos");
    return { success: true, count: updateResult.count };
  } catch (e) {
    console.error(e);
    return { error: "No se pudieron vincular todos los remitos. Verifique nuevamente." };
  }
}

export async function desvincularRemito(remitoId: number) {
  const session = await requireRole("admin", "delegacion", "control");
  const auditMeta = await getAuditRequestMeta();

  try {
    const remito = await prisma.remito.findUnique({
      where: { id: remitoId },
      select: { id: true, guiaId: true, delegacionId: true }
    });

    if (!remito?.guiaId) return { error: "El remito no está vinculado a ninguna guía." };

    // Si es delegacion, solo puede desvincular un remito propio
    if (session.user.role === "delegacion" && session.user.delegacionId !== remito.delegacionId) {
      return { error: "No tienes permiso para desvincular un remito de otra delegación." };
    }

    await prisma.$transaction(async (tx) => {
      await tx.remito.update({
        where: { id: remitoId },
        data: {
          guiaId: null,
          estado: "disponible",
          fechaVinculacion: null,
          updatedBy: session.user.id
        }
      });

      await tx.auditLog.create({
        data: {
          userId: session.user.id,
          userEmail: session.user.email,
          ipAddress: auditMeta.ipAddress,
          userAgent: auditMeta.userAgent,
          action: "DESVINCULAR_REMITO",
          entityType: "Remito",
          entityId: remitoId,
          oldValues: { guiaId: remito.guiaId },
          newValues: { guiaId: null, estado: "disponible" }
        }
      });
    });

    revalidatePath("/guias");
    revalidatePath("/remitos");
    return { success: true };
  } catch(e) {
    return { error: "Error al desvincular el remito." };
  }
}

/**
 * Obtiene remitos disponibles (sin guía vinculada) para una delegación específica.
 * Útil para el proceso de Carga Manual.
 */
export async function getRemitosDisponiblesDelegacion(delegacionId: number) {
  await requireRole("admin", "carga", "control", "delegacion");

  const remitos = await prisma.remito.findMany({
    where: {
      delegacionId,
      guiaId: null,
      estado: "disponible",
      deletedAt: null
    },
    orderBy: { nrremito: "asc" },
    select: { id: true, nrremito: true }
  });

  return { remitos };
}
