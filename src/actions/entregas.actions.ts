"use server";

import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/auth-guard";

/**
 * Obtiene el historial de entregas de talonarios basándose en el AuditLog.
 * Filtra por las acciones de creación masiva (bulk).
 */
export async function getEntregasHistory() {
  await requireRole("admin", "recaudacion", "central");

  const logs = await prisma.auditLog.findMany({
    where: {
      action: { in: ["CREATE_GUIAS_BULK", "CREATE_REMITOS_BULK"] },
    },
    orderBy: { createdAt: "desc" },
    take: 50, // Últimas 50 entregas
  });

  // Mapear los logs a un formato más amigable para la tabla
  return logs.map((log) => {
    const values = log.newValues as any;
    return {
      id: Number(log.id),
      fecha: log.createdAt,
      usuario: log.userEmail,
      tipo: log.action === "CREATE_GUIAS_BULK" ? "Guías" : "Remitos",
      rango: `${values?.desde || "?"} - ${values?.hasta || "?"}`,
      cantidad: values?.count || values?.created || 0,
      delegacionId: values?.delegacionId,
      // Nota: En una versión real, haríamos un Join o Map para traer el nombre de la delegación
    };
  });
}

/**
 * Obtiene la lista de delegaciones activas para el selector.
 */
export async function getDelegacionesEntregas() {
  await requireRole("admin", "recaudacion", "central");
  return await prisma.delegacion.findMany({
    where: { activa: true, deletedAt: null },
    orderBy: { nombre: "asc" },
    select: { id: true, nombre: true }
  });
}
