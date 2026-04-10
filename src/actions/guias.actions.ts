"use server";


import { prisma } from "@/lib/db";
import { createGuiaSchema, createGuiasBulkSchema, updateGuiaSchema } from "@/lib/validators";
import { revalidatePath } from "next/cache";
import { requireRole, requireAuth } from "@/lib/auth-guard";
import { getAuditRequestMeta } from "@/lib/audit";

export async function getGuias(params: {
  page?: number;
  pageSize?: number;
  search?: string;
  estado?: string;
  delegacionId?: number;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}) {
  const { page = 1, pageSize = 20, search, estado, sortOrder = "desc" } = params;
  let { delegacionId, sortBy = "nrguia" } = params;

  // Sanitizar sortBy para evitar errores de columnas inexistentes
  const validSortColumns = ["id", "nrguia", "tipo", "estado", "delegacionId", "titularId", "destino", "fechaCarga", "fechaEmision", "fechaVencimiento", "createdAt", "updatedAt"];
  if (!validSortColumns.includes(sortBy)) {
    sortBy = "nrguia";
  }

  // Sanitizar sortOrder
  const finalSortOrder = (sortOrder === "asc" || sortOrder === "desc") ? sortOrder : "desc";

  const session = await requireAuth();
  if (session.user.role === "delegacion") {
    if (!session.user.delegacionId) return { guias: [], total: 0, pages: 0 };
    delegacionId = session.user.delegacionId;
  }

  const where: Record<string, unknown> = { deletedAt: null };
  if (estado) {
    if (estado === "deposito") {
      where.OR = [{ tipo: "deposito" }, { deposito: true }];
    } else if (estado === "normal") {
      where.AND = [{ tipo: "normal" }, { deposito: false }];
    } else {
      where.estado = estado;
    }
  }
  if (delegacionId) where.delegacionId = delegacionId;
  if (search) {
    const num = parseInt(search);
    if (!isNaN(num)) {
      where.nrguia = num;
    }
  }
  // Mapear sortBy a un objeto de ordenamiento estático para evitar errores de claves dinámicas
  const getOrderBy = (field: string, order: "asc" | "desc") => {
    const map: Record<string, any> = {
      id: { id: order },
      nrguia: { nrguia: order },
      tipo: { tipo: order },
      estado: { estado: order },
      delegacionId: { delegacionId: order },
      titularId: { titularId: order },
      destino: { destino: order },
      fechaCarga: { fechaCarga: order },
      fechaEmision: { fechaEmision: order },
      fechaVencimiento: { fechaVencimiento: order },
      createdAt: { createdAt: order },
      updatedAt: { updatedAt: order },
    };
    return map[field] || { nrguia: "desc" };
  };

  const guias = await prisma.guia.findMany({
    where,
    select: {
      id: true,
      nrguia: true,
      tipo: true,
      deposito: true,
      estado: true,
      fechaCarga: true,
      fechaEmision: true,
      fechaVencimiento: true,
      prorrogada: true,
      observaciones: true,
      delegacion: { select: { nombre: true, id: true } },
      titular: { select: { razonSocial: true, cuit: true, id: true } },
      imagenes: {
        select: {
          id: true,
          filename: true,
          storagePath: true,
          latitude: true,
          longitude: true,
          gpsAccuracy: true,
          gpsCapturedAt: true,
        },
      },
      remitos: { select: { nrremito: true }, where: { deletedAt: null } },
      _count: { select: { remitos: true } } 
    },
    orderBy: getOrderBy(sortBy, finalSortOrder),
    skip: (page - 1) * pageSize,
    take: pageSize,
  });
  const total = await prisma.guia.count({ where });
  return { guias: guias as any, total, pages: Math.ceil(total / pageSize) };

  return { guias, total, pages: Math.ceil(total / pageSize) };
}

export async function createGuia(data: unknown) {
  const session = await requireRole("admin", "recaudacion");
  const auditMeta = await getAuditRequestMeta();

  const parsed = createGuiaSchema.safeParse(data);
  if (!parsed.success) return { error: parsed.error.flatten().fieldErrors };

  try {
    const guia = await prisma.$transaction(async (tx) => {
      const created = await tx.guia.create({
        data: {
          nrguia: parsed.data.nrguia,
          tipo: parsed.data.tipo,
          deposito: parsed.data.tipo === "deposito",
          delegacionId: parsed.data.delegacionId,
          titularId: parsed.data.titularId,
          destino: parsed.data.destino || null,
          fechaEmision: parsed.data.fechaEmision ? new Date(parsed.data.fechaEmision) : null,
          fechaVencimiento:
            parsed.data.tipo === "deposito"
              ? null
              : parsed.data.fechaVencimiento
                ? new Date(parsed.data.fechaVencimiento)
                : null,
          observaciones: parsed.data.observaciones || null,
          estado: parsed.data.delegacionId ? "asignada" : "en_blanco",
        },
      });

      await tx.auditLog.create({
        data: {
          userId: session.user.id,
          userEmail: session.user.email,
          ipAddress: auditMeta.ipAddress,
          userAgent: auditMeta.userAgent,
          action: "CREATE_GUIA",
          entityType: "Guia",
          entityId: created.id,
          newValues: {
            nrguia: created.nrguia,
            tipo: created.tipo,
            estado: created.estado,
            delegacionId: created.delegacionId,
            titularId: created.titularId,
            fechaEmision: created.fechaEmision,
            fechaVencimiento: created.fechaVencimiento,
            deposito: created.deposito,
          },
        },
      });

      return created;
    });
    revalidatePath("/guias");
    revalidatePath("/");
    return { success: true, guia };
  } catch (e: unknown) {
    const err = e as { code?: string };
    if (err.code === "P2002") return { error: { nrguia: ["Ya existe una guía con ese número"] } };
    return { error: { _form: ["Error al crear la guía"] } };
  }
}

export async function createGuiasBulk(data: unknown) {
  await requireRole("admin", "recaudacion");
  const auditMeta = await getAuditRequestMeta();

  const parsed = createGuiasBulkSchema.safeParse(data);
  if (!parsed.success) return { error: parsed.error.flatten().fieldErrors };

  const { desde, hasta, delegacionId } = parsed.data;
  const guias = [];
  const errors: string[] = [];

  for (let i = desde; i <= hasta; i++) {
    try {
      const guia = await prisma.guia.create({
        data: {
          nrguia: i,
          delegacionId: delegacionId,
          estado: delegacionId ? "asignada" : "en_blanco",
        },
      });
      guias.push(guia);
    } catch {
      errors.push(`Guía ${i} ya existe`);
    }
  }

  revalidatePath("/guias");
  revalidatePath("/");

  // AGREGADO: Log de auditoría para el historial de entregas
  const session = await requireAuth();
  await prisma.auditLog.create({
    data: {
      userId: session.user.id,
      userEmail: session.user.email,
      ipAddress: auditMeta.ipAddress,
      userAgent: auditMeta.userAgent,
      action: "CREATE_GUIAS_BULK",
      entityType: "Guia",
      newValues: { desde, hasta, count: guias.length, delegacionId, errors: errors.length }
    }
  });

  return { success: true, created: guias.length, errors };
}

export async function updateGuia(data: unknown) {
  const session = await requireRole("admin", "recaudacion", "central", "control");
  const auditMeta = await getAuditRequestMeta();

  const parsed = updateGuiaSchema.safeParse(data);
  if (!parsed.success) return { error: parsed.error.flatten().fieldErrors };

  const { id, ...updateData } = parsed.data;
  const processedData: Record<string, unknown> = {};
  let tipoActualizado: "normal" | "deposito" | null = null;

  for (const [key, value] of Object.entries(updateData)) {
    if (value !== undefined) {
      if (key === "tipo" && (value === "normal" || value === "deposito")) {
        tipoActualizado = value;
      }
      if (key.startsWith("fecha") && typeof value === "string" && value) {
        processedData[key] = new Date(value);
      } else {
        processedData[key] = value === "" ? null : value;
      }
    }
  }

  if (session.user.role === "central" || session.user.role === "control") {
    for (const key of Object.keys(processedData)) {
      if (key !== "estado" && key !== "observaciones") {
        delete processedData[key];
      }
    }
  }

  if (tipoActualizado === "deposito") {
    processedData.deposito = true;
    processedData.fechaVencimiento = null;
    if (processedData.estado === "vencida") {
      processedData.estado = "vigente";
    }
  }

  if (tipoActualizado === "normal") {
    processedData.deposito = false;
  }

  try {
    const guiaAntes = await prisma.guia.findUnique({
      where: { id },
      select: {
        id: true,
        nrguia: true,
        tipo: true,
        estado: true,
        delegacionId: true,
        titularId: true,
        destino: true,
        fechaEmision: true,
        fechaVencimiento: true,
        observaciones: true,
        deposito: true,
        prorrogada: true,
      },
    });

    if (!guiaAntes) {
      return { error: { _form: ["Guía no encontrada"] } };
    }

    const guiaDespues = await prisma.guia.update({
      where: { id },
      data: processedData,
      select: {
        id: true,
        nrguia: true,
        tipo: true,
        estado: true,
        delegacionId: true,
        titularId: true,
        destino: true,
        fechaEmision: true,
        fechaVencimiento: true,
        observaciones: true,
        deposito: true,
        prorrogada: true,
      },
    });

    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        userEmail: session.user.email,
        ipAddress: auditMeta.ipAddress,
        userAgent: auditMeta.userAgent,
        action: "UPDATE_GUIA",
        entityType: "Guia",
        entityId: id,
        oldValues: guiaAntes,
        newValues: guiaDespues,
      },
    });

    revalidatePath("/guias");
    revalidatePath("/");
    return { success: true };
  } catch {
    return { error: { _form: ["Error al actualizar la guía"] } };
  }
}

export async function deleteGuia(id: number) {
  const session = await requireRole("admin", "recaudacion");
  const auditMeta = await getAuditRequestMeta();

  try {
    const guia = await prisma.guia.findUnique({ where: { id } });
    if (!guia) return { error: "Guía no encontrada" };

    await prisma.$transaction(async (tx) => {
      const nuevoNr = guia.nrguia > 0 ? -guia.nrguia : guia.nrguia;

      await tx.guia.update({
        where: { id },
        data: {
          deletedAt: new Date(),
          nrguia: nuevoNr,
        },
      });

      await tx.auditLog.create({
        data: {
          userId: session.user.id,
          userEmail: session.user.email,
          ipAddress: auditMeta.ipAddress,
          userAgent: auditMeta.userAgent,
          action: "DELETE_GUIA",
          entityType: "Guia",
          entityId: id,
          oldValues: {
            nrguia: guia.nrguia,
            estado: guia.estado,
            delegacionId: guia.delegacionId,
          },
          newValues: {
            deletedAt: true,
            nrguia: nuevoNr,
          },
        },
      });
    });
    revalidatePath("/guias");
    revalidatePath("/");
    return { success: true };
  } catch (e) {
    return { error: "Error al eliminar la guía" };
  }
}

export async function blanquearGuia(id: number) {
  const session = await requireRole("admin");
  const auditMeta = await getAuditRequestMeta();

  try {
    const guia = await prisma.guia.findUnique({
      where: { id },
      select: {
        id: true,
        nrguia: true,
        estado: true,
        delegacionId: true,
        titularId: true,
        destino: true,
        fechaEmision: true,
        fechaVencimiento: true,
        fechaEntrega: true,
        deposito: true,
        devuelto: true,
      },
    });

    if (!guia) return { error: "Guía no encontrada" };

    await prisma.$transaction(async (tx) => {
      const remitos = await tx.remito.findMany({
        where: {
          guiaId: id,
          deletedAt: null,
        },
        select: { id: true, nrremito: true },
      });

      const imagenesGuia = await tx.imagen.findMany({
        where: {
          guiaId: id,
          deletedAt: null,
        },
        select: { id: true },
      });

      await tx.remito.updateMany({
        where: {
          guiaId: id,
          deletedAt: null,
        },
        data: {
          guiaId: null,
          estado: "disponible",
          fechaVinculacion: null,
          updatedBy: session.user.id,
        },
      });

      await tx.imagen.updateMany({
        where: {
          guiaId: id,
          deletedAt: null,
        },
        data: {
          deletedAt: new Date(),
        },
      });

      await tx.guia.update({
        where: { id },
        data: {
          estado: "en_blanco",
          titularId: null,
          destino: null,
          fechaEmision: null,
          fechaVencimiento: null,
          fechaEntrega: null,
          deposito: false,
          devuelto: false,
          prorrogada: false,
          updatedBy: session.user.id,
          observaciones: "Blanqueada por administrador",
        },
      });

      await tx.auditLog.create({
        data: {
          userId: session.user.id,
          userEmail: session.user.email,
          ipAddress: auditMeta.ipAddress,
          userAgent: auditMeta.userAgent,
          action: "BLANQUEAR_GUIA",
          entityType: "Guia",
          entityId: guia.id,
          oldValues: {
            estado: guia.estado,
            titularId: guia.titularId,
            destino: guia.destino,
            fechaEmision: guia.fechaEmision,
            fechaVencimiento: guia.fechaVencimiento,
            fechaEntrega: guia.fechaEntrega,
            deposito: guia.deposito,
            devuelto: guia.devuelto,
          },
          newValues: {
            estado: "en_blanco",
            remitosDesvinculados: remitos.map((r) => r.nrremito),
            remitosCantidad: remitos.length,
            imagenesEliminadas: imagenesGuia.length,
          },
        },
      });
    });

    revalidatePath("/guias");
    revalidatePath("/remitos");
    revalidatePath("/");
    return { success: true };
  } catch (e) {
    console.error(e);
    return { error: "Error al blanquear la guía" };
  }
}

export async function prorrogarGuia(id: number) {
  const session = await requireRole("admin", "recaudacion", "central", "delegacion");
  const auditMeta = await getAuditRequestMeta();

  try {
    const guia = await prisma.guia.findUnique({ 
      where: { id },
      select: { 
        id: true, 
        tipo: true,
        deposito: true,
        prorrogada: true, 
        fechaVencimiento: true, 
        fechaEmision: true,
        delegacionId: true,
        estado: true,
        _count: {
          select: {
            remitos: {
              where: { deletedAt: null },
            },
          },
        },
      }
    });

    if (!guia) return { error: "Guía no encontrada" };

    // Validar propiedad si es rol delegacion
    if (session.user.role === "delegacion" && guia.delegacionId !== session.user.delegacionId) {
      return { error: "No tiene permiso para prorrogar guías de otra delegación." };
    }

    if (guia.tipo === "deposito" || guia.deposito) {
      return { error: "Las guías de depósito no tienen vencimiento ni prórroga." };
    }

    if (guia._count.remitos === 0) {
      return { error: "La guía no tiene remitos vinculados, no corresponde prórroga." };
    }

    if (guia.estado !== "vencida") {
      return { error: "Solo se puede prorrogar una guía vencida." };
    }

    // Validar si ya fue prorrogada
    if (guia.prorrogada) {
      return { error: "Esta guía ya utilizó su única prórroga de 30 días." };
    }

    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    const nuevaFecha = new Date(hoy);
    nuevaFecha.setDate(nuevaFecha.getDate() + 30);

    const nuevoEstado = "vigente";

    await prisma.$transaction(async (tx: any) => {
      await tx.guia.update({
        where: { id },
        data: {
          fechaVencimiento: nuevaFecha,
          estado: nuevoEstado,
          prorrogada: true, // Marcar como ya usada
        },
      });

      await tx.auditLog.create({
        data: {
          userId: session.user.id,
          userEmail: session.user.email,
          ipAddress: auditMeta.ipAddress,
          userAgent: auditMeta.userAgent,
          action: "PRORROGAR_GUIA",
          entityType: "Guia",
          entityId: id,
          newValues: {
            estado: nuevoEstado,
            fechaVencimiento: nuevaFecha.toISOString().split('T')[0],
            detalle: `Prórroga única de +30 días aplicada.`,
          },
        }
      });
    });

    revalidatePath("/guias");
    revalidatePath("/");
    return { success: true };
  } catch (e) {
    console.error(e);
    return { error: "Error al prorrogar la guía" };
  }
}

export async function resetearProrrogaGuia(id: number) {
  const session = await requireRole("admin");
  const auditMeta = await getAuditRequestMeta();

  try {
    const guia = await prisma.guia.findUnique({
      where: { id },
      select: {
        id: true,
        nrguia: true,
        tipo: true,
        deposito: true,
        prorrogada: true,
      },
    });

    if (!guia) return { error: "Guía no encontrada" };

    if (guia.tipo === "deposito" || guia.deposito) {
      return { error: "Las guías de depósito no usan prórroga" };
    }

    if (!guia.prorrogada) {
      return { error: "La guía no tiene prórroga aplicada" };
    }

    await prisma.$transaction(async (tx) => {
      await tx.guia.update({
        where: { id },
        data: {
          prorrogada: false,
          updatedBy: session.user.id,
        },
      });

      await tx.auditLog.create({
        data: {
          userId: session.user.id,
          userEmail: session.user.email,
          ipAddress: auditMeta.ipAddress,
          userAgent: auditMeta.userAgent,
          action: "RESETEAR_PRORROGA_GUIA",
          entityType: "Guia",
          entityId: id,
          oldValues: {
            prorrogada: true,
          },
          newValues: {
            prorrogada: false,
            detalle: "Se habilitó nuevamente la prórroga única por decisión administrativa",
          },
        },
      });
    });

    revalidatePath("/guias");
    revalidatePath("/operativa");
    revalidatePath("/");
    return { success: true };
  } catch (e) {
    console.error(e);
    return { error: "Error al resetear la prórroga" };
  }
}

/**
 * Función para ser llamada por un CRON job diario.
 * Busca guías vigentes cuya fecha de vencimiento ya pasó y las marca como vencidas.
 */
export async function verificarVencimientos() {
  const now = new Date();
  now.setHours(0, 0, 0, 0);

  try {
    const result = await prisma.guia.updateMany({
      where: {
        estado: "vigente",
        tipo: "normal",
        deposito: false,
        fechaVencimiento: {
          lt: now
        },
        deletedAt: null,
      },
      data: {
        estado: "vencida"
      }
    });

    if (result.count > 0) {
      console.log(`[Cron] Se vencieron ${result.count} guías automáticamente.`);
      revalidatePath("/guias");
      revalidatePath("/");
    }

    return { success: true, count: result.count };
  } catch (error) {
    console.error("Error en verificarVencimientos:", error);
    return { error: "Error al procesar vencimientos automáticos" };
  }
}
