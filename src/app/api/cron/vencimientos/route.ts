import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

/**
 * Endpoint para marcar guías como vencidas automáticamente.
 * Se espera que corra una vez al día (ej: Vercel Cron).
 */
export async function GET(request: NextRequest) {
  // Opcional: Proteger con un token simple para evitar ejecuciones maliciosas
  const authHeader = request.headers.get('authorization');
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response('Unauthorized', { status: 401 });
  }

  try {
    const ipAddress = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || request.headers.get("x-real-ip") || null;
    const userAgent = request.headers.get("user-agent") || null;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // 1. Buscar guías vigentes o emitidas con fecha de vencimiento pasada
    const guiasVencidas = await prisma.guia.findMany({
      where: {
        estado: { in: ["vigente", "emitida", "asignada"] },
        fechaVencimiento: { lt: today },
        tipo: "normal",
        deposito: false,
        deletedAt: null,
      },
      select: { id: true, nrguia: true }
    });

    if (guiasVencidas.length === 0) {
      return NextResponse.json({ message: "No hay guías para vencer hoy", count: 0 });
    }

    const ids = guiasVencidas.map(g => g.id);

    // 2. Marcar guías como vencidas y anular remitos vinculados que no estén entregados
    const result = await prisma.$transaction(async (tx) => {
      // Update guías
      const updateGuias = await tx.guia.updateMany({
        where: { id: { in: ids } },
        data: { estado: "vencida" }
      });

      // Anular remitos vinculados (que no hayan sido entregados o devueltos)
      const updateRemitos = await tx.remito.updateMany({
        where: {
          guiaId: { in: ids },
          estado: { in: ["disponible", "vinculado", "en_transito"] }
        },
        data: { estado: "anulado", observaciones: "Anulado automáticamente por vencimiento de guía" }
      });

      // Registrar en log general (sin userId ya que es sistema)
      await tx.auditLog.create({
        data: {
          action: "CRON_VENCIMIENTO_AUTOMATICO",
          entityType: "System",
          ipAddress,
          userAgent,
          newValues: {
            guiasVencidas: guiasVencidas.length,
            idsVencidos: ids,
            remitosAnulados: updateRemitos.count
          }
        }
      });

      return { guias: updateGuias.count, remitos: updateRemitos.count };
    });

    return NextResponse.json({ 
      success: true, 
      message: `Proceso completado. ${result.guias} guías marcadas como vencidas.`,
      details: result 
    });

  } catch (error: any) {
    console.error("Error en CRON vencimientos:", error);
    return NextResponse.json({ error: "Error interno en el proceso de vencimientos" }, { status: 500 });
  }
}
