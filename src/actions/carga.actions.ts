"use server";

import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/auth-guard";
import { revalidatePath } from "next/cache";
import { getAuditRequestMeta } from "@/lib/audit";

/**
 * Busca una guía por su número para iniciar el proceso de carga manual.
 * Valida si ya fue procesada anteriormente.
 */
export async function buscarGuiaParaCarga(nrguia: number) {
  await requireRole("admin", "carga", "control");

  const guia = await prisma.guia.findFirst({
    where: { 
      nrguia,
      deletedAt: null 
    },
    include: {
      delegacion: true,
      titular: true,
      remitos: true,
    }
  });

  if (!guia) {
    return { error: "La guía número " + nrguia + " no existe en el sistema. Primero debe ser entregada por Recaudaciones." };
  }

  // Verificar si ya fue procesada
  const yaProcesada = !["en_blanco", "asignada"].includes(guia.estado);

  return { 
    guia, 
    yaProcesada,
    mensaje: yaProcesada ? `Esta guía ya tiene estado "${guia.estado}" y no puede ser cargada nuevamente.` : null
  };
}

/**
 * Guarda los datos de la guía cargada manualmente.
 * Previene la doble carga mediante una transacción y verificación de estado.
 */
export async function procesarCargaManual(data: {
  guiaId: number;
  delegacionId: number;
  titularId: number;
  tipo: "normal" | "deposito";
  destino: string;
  fechaEmision: string;
  fechaVencimiento: string;
  remitosIds: number[];
  observaciones?: string;
}) {
  const session = await requireRole("admin", "carga", "control");
  const auditMeta = await getAuditRequestMeta();

  try {
    return await prisma.$transaction(async (tx) => {
      // 1. Re-verificar estado dentro de la transacción para evitar race conditions
      const currentGuia = await tx.guia.findUnique({
        where: { id: data.guiaId },
        select: { estado: true }
      });

      if (!currentGuia || !["en_blanco", "asignada"].includes(currentGuia.estado)) {
        throw new Error("La guía ya fue procesada o no está disponible para carga.");
      }

      // 2. Actualizar Guía
      const updatedGuia = await tx.guia.update({
        where: { id: data.guiaId },
        data: {
          delegacionId: data.delegacionId,
          titularId: data.titularId,
          tipo: data.tipo,
          destino: data.destino,
          fechaEmision: new Date(data.fechaEmision),
          fechaVencimiento: new Date(data.fechaVencimiento),
          estado: data.remitosIds.length > 0 ? "vigente" : "asignada", // Pasa a estar vigente si tiene remitos
          observaciones: data.observaciones,
          updatedBy: session.user.email,
        }
      });

      // 3. Vincular Remitos
      if (data.remitosIds.length > 0) {
        await tx.remito.updateMany({
          where: { id: { in: data.remitosIds } },
          data: { 
            guiaId: data.guiaId, 
            estado: "vinculado" 
          }
        });
      }

      // 4. Auditoría
      await tx.auditLog.create({
        data: {
          userId: session.user.id,
          userEmail: session.user.email,
          ipAddress: auditMeta.ipAddress,
          userAgent: auditMeta.userAgent,
          action: "CARGA_MANUAL_BOSQUES",
          entityType: "Guia",
          entityId: data.guiaId,
          newValues: {
            estado: "vigente",
            remitosVinculados: data.remitosIds.length,
            titularId: data.titularId,
            via: "Carga Manual"
          }
        }
      });

      return updatedGuia;
    });

  } catch (error: any) {
    console.error("Error en carga manual:", error);
    return { error: error.message || "Error al procesar la carga" };
  } finally {
    revalidatePath("/guias");
    revalidatePath("/remitos");
    revalidatePath("/");
  }
}
