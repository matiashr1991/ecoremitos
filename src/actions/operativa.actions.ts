"use server";

import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/auth-guard";
import { revalidatePath } from "next/cache";
import { getAuditRequestMeta } from "@/lib/audit";

export async function getGuiasDisponiblesTablet() {
  const session = await requireRole("delegacion", "admin");

  if (!session.user.delegacionId) return { error: "No tienes delegación asignada" };

  // Regla real de negocio:
  // Guía en blanco = guía de la delegación SIN remitos vinculados.
  const guias = await prisma.guia.findMany({
    where: {
      delegacionId: session.user.delegacionId,
      deletedAt: null,
      remitos: {
        none: {
          deletedAt: null,
        },
      },
    },
    select: {
      id: true,
      nrguia: true,
      fechaCarga: true,
    },
    orderBy: { nrguia: "asc" },
  });

  return { success: true, guias };
}

export async function buscarTitularPorDocumentoOperativa(query: string) {
  await requireRole("delegacion", "admin");

  const term = query.trim();
  if (!term) return { error: "Ingresá CUIT o DNI" };

  const digits = term.replace(/\D/g, "");

  const titulares = await prisma.titular.findMany({
    where: {
      deletedAt: null,
      OR: [
        digits
          ? {
              cuit: {
                contains: digits,
              },
            }
          : undefined,
        {
          razonSocial: {
            contains: term,
            mode: "insensitive",
          },
        },
      ].filter(Boolean) as Array<Record<string, unknown>>,
    },
    select: {
      id: true,
      razonSocial: true,
      cuit: true,
      guias: {
        where: {
          devuelto: false,
          estado: { in: ["vencida", "intervenida", "vigente", "asignada"] },
          deletedAt: null,
        },
        select: {
          nrguia: true,
          fechaEmision: true,
          fechaVencimiento: true,
          estado: true,
        }
      }
    },
    take: 20,
    orderBy: { razonSocial: "asc" },
  });

  if (titulares.length === 0) {
    return { error: "No se encontró titular para ese CUIT/DNI" };
  }

  // Verificar si el titular está bloqueado por falta de rendición (5 días hábiles de tolerancia)
  const titularesBloqueados = titulares.map(titular => {
    let bloqueado = false;
    const guiasAdeudadas: Array<{ nrguia: number, fechaEmision: string }> = [];
    
    if (titular.guias && titular.guias.length > 0) {
      const { differenceInBusinessDays } = require("date-fns");
      const hoy = new Date();
      
      titular.guias.forEach(guia => {
        if (guia.fechaVencimiento) {
          const diasVencida = differenceInBusinessDays(hoy, guia.fechaVencimiento);
          if (diasVencida > 5) {
            bloqueado = true;
            guiasAdeudadas.push({
              nrguia: guia.nrguia,
              fechaEmision: guia.fechaEmision 
                ? guia.fechaEmision.toISOString().slice(0, 10) 
                : "N/A"
            });
          }
        }
      });
    }
    
    return {
      id: titular.id,
      razonSocial: titular.razonSocial,
      cuit: titular.cuit,
      bloqueado,
      guiasAdeudadas
    };
  });

  return { success: true, titulares: titularesBloqueados };
}

export async function buscarGuiaPorNumeroOperativa(nrguia: number) {
  const session = await requireRole("delegacion", "admin");

  if (!session.user.delegacionId) {
    return { error: "No tienes delegación asignada" };
  }

  if (!Number.isInteger(nrguia) || nrguia <= 0) {
    return { error: "Número de guía inválido" };
  }

  const guia = await prisma.guia.findFirst({
    where: {
      nrguia,
      delegacionId: session.user.delegacionId,
      deletedAt: null,
    },
    select: {
      id: true,
      nrguia: true,
      estado: true,
      tipo: true,
      deposito: true,
      prorrogada: true,
      fechaVencimiento: true,
      _count: {
        select: {
          remitos: {
            where: {
              deletedAt: null,
            },
          },
        },
      },
    },
  });

  if (!guia) {
    return { error: "La guía no existe en tu delegación" };
  }

  const remitosVinculados = guia._count.remitos;
  const esEnBlancoReal = remitosVinculados === 0;
  const esDeposito = guia.tipo === "deposito" || guia.deposito;
  const puedeProrrogar = !esDeposito && remitosVinculados > 0 && guia.estado === "vencida" && !guia.prorrogada;

  if (esEnBlancoReal) {
    return {
      success: true,
      modo: "operativa",
      guia: {
        id: guia.id,
        nrguia: guia.nrguia,
      },
    };
  }

  if (puedeProrrogar) {
    return {
      success: true,
      modo: "prorroga",
      guia: {
        id: guia.id,
        nrguia: guia.nrguia,
        estado: guia.estado,
        fechaVencimiento: guia.fechaVencimiento,
      },
      mensaje:
        "Esta guía está usada y vencida. Podés aplicar una única prórroga de 30 días.",
    };
  }

  if (esDeposito) {
    return {
      error: "Las guías de depósito no tienen vencimiento ni prórroga.",
    };
  }

  if (guia.estado === "vigente") {
    return {
      error: "Esta guía todavía está vigente. Solo corresponde prórroga cuando esté vencida.",
    };
  }

  if (guia.estado !== "vencida") {
    return {
      error: `Esta guía no está vencida (estado actual: ${guia.estado}).`,
    };
  }

  if (guia.prorrogada) {
    return {
      error: "Esta guía ya utilizó su única prórroga de 30 días.",
    };
  }

  return {
    error:
      "La guía ya fue utilizada y no está disponible para nueva operativa ni para prórroga.",
  };
}

export async function prorrogarGuiaOperativa(guiaId: number) {
  const session = await requireRole("delegacion", "admin");
  const auditMeta = await getAuditRequestMeta();

  try {
    const guia = await prisma.guia.findUnique({
      where: { id: guiaId },
      select: {
        id: true,
        nrguia: true,
        estado: true,
        tipo: true,
        deposito: true,
        prorrogada: true,
        fechaVencimiento: true,
        delegacionId: true,
        remitos: {
          where: { deletedAt: null },
          select: { id: true },
        },
      },
    });

    if (!guia) return { error: "Guía no encontrada" };

    if (session.user.role === "delegacion" && guia.delegacionId !== session.user.delegacionId) {
      return { error: "No podés prorrogar guías de otra delegación" };
    }

    if (guia.remitos.length === 0) {
      return { error: "La guía no tiene remitos vinculados, no corresponde prórroga" };
    }

    if (guia.tipo === "deposito" || guia.deposito) {
      return { error: "Las guías de depósito no tienen vencimiento ni prórroga" };
    }

    if (guia.estado !== "vencida") {
      return { error: "Solo se puede prorrogar una guía vencida" };
    }

    if (guia.prorrogada) {
      return { error: "Esta guía ya utilizó su única prórroga" };
    }

    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    const nuevaFecha = new Date(hoy);
    nuevaFecha.setDate(nuevaFecha.getDate() + 30);

    await prisma.$transaction(async (tx) => {
      await tx.guia.update({
        where: { id: guia.id },
        data: {
          fechaVencimiento: nuevaFecha,
          estado: "vigente",
          prorrogada: true,
          updatedBy: session.user.id,
        },
      });

      await tx.auditLog.create({
        data: {
          userId: session.user.id,
          userEmail: session.user.email,
          ipAddress: auditMeta.ipAddress,
          userAgent: auditMeta.userAgent,
          action: "PRORROGAR_GUIA_OPERATIVA",
          entityType: "Guia",
          entityId: guia.id,
          oldValues: {
            estado: guia.estado,
            fechaVencimiento: guia.fechaVencimiento,
            prorrogada: guia.prorrogada,
          },
          newValues: {
            estado: "vigente",
            fechaVencimiento: nuevaFecha.toISOString().split("T")[0],
            prorrogada: true,
            via: "operativa",
          },
        },
      });
    });

    revalidatePath("/guias");
    revalidatePath("/operativa");
    return {
      success: true,
      fechaVencimiento: nuevaFecha.toISOString().split("T")[0],
      mensaje: "Prórroga otorgada correctamente (+30 días desde hoy).",
    };
  } catch (e) {
    console.error(e);
    return { error: "Error al prorrogar guía" };
  }
}

export async function completarOperativaTablet(data: FormData) {
  const session = await requireRole("delegacion", "admin");
  const auditMeta = await getAuditRequestMeta();

  const guiaId = Number(data.get("guiaId"));
  const titularId = Number(data.get("titularId"));
  const fechaEmisionStr = data.get("fechaEmision") as string;
  const fechaVencimientoStr = data.get("fechaVencimiento") as string;
  const esDeposito = data.get("esDeposito") === "true";
  const remitosIds = JSON.parse(data.get("remitos") as string || "[]") as number[];
  const gpsRaw = data.get("gps") as string | null;

  if (!guiaId || !titularId || !fechaEmisionStr || (!esDeposito && !fechaVencimientoStr) || (!esDeposito && remitosIds.length === 0)) {
    return { error: "Faltan campos requeridos" };
  }

  if (!gpsRaw) {
    return { error: "GPS obligatorio: no se recibió ubicación del dispositivo" };
  }

  let gpsData: { lat: number; lng: number; accuracy?: number; timestamp?: number } | null = null;
  try {
    const parsed = JSON.parse(gpsRaw) as { lat?: number; lng?: number; accuracy?: number; timestamp?: number };
    if (typeof parsed.lat !== "number" || typeof parsed.lng !== "number") {
      return { error: "GPS inválido: faltan coordenadas" };
    }
    gpsData = {
      lat: parsed.lat,
      lng: parsed.lng,
      accuracy: parsed.accuracy,
      timestamp: parsed.timestamp,
    };
  } catch {
    return { error: "GPS inválido: formato incorrecto" };
  }

  // Files/Images handling
  const fotos = data.getAll("fotos") as File[];

  try {
    const fechaEmision = new Date(fechaEmisionStr);
    if (Number.isNaN(fechaEmision.getTime())) {
      return { error: "Fecha de emisión inválida" };
    }

    const fechaVencimiento = esDeposito
      ? null
      : new Date(fechaVencimientoStr);

    if (!esDeposito && (!fechaVencimiento || Number.isNaN(fechaVencimiento.getTime()))) {
      return { error: "Fecha de vencimiento inválida" };
    }

    const result = await prisma.$transaction(async (tx) => {
      // 0. Validar que la guía pertenezca a la delegación y siga "en blanco"
      const guiaDisponible = await tx.guia.findFirst({
        where: {
          id: guiaId,
          delegacionId: session.user.delegacionId,
          deletedAt: null,
          remitos: {
            none: {
              deletedAt: null,
            },
          },
        },
        select: { id: true },
      });

      if (!guiaDisponible) {
        throw new Error("La guía seleccionada no está disponible para esta delegación o ya tiene remitos vinculados.");
      }

      // 1. Update Guia
      const guia = await tx.guia.update({
        where: { id: guiaId },
        data: {
          titularId,
          fechaEmision,
          fechaVencimiento,
          deposito: esDeposito,
          estado: esDeposito ? "vigente" : remitosIds.length > 0 ? "vigente" : "asignada",
          updatedBy: session.user.id,
        },
      });

      // 2. Link remitos — only from SAME delegation
      if (remitosIds.length > 0) {
        await tx.remito.updateMany({
          where: {
            id: { in: remitosIds },
            estado: { in: ["disponible"] },
            delegacionId: session.user.delegacionId, // Security: only own remitos
          },
          data: {
            estado: "vinculado",
            guiaId: guia.id,
            updatedBy: session.user.id,
          },
        });
      }

      // 3. Save images to disk and metadata to DB
      const { writeFile, mkdir } = await import("fs/promises");
      const path = await import("path");
      const crypto = await import("crypto");
      
      const uploadDir = path.join(process.cwd(), "public", "uploads", "guias");
      
      try {
        await mkdir(uploadDir, { recursive: true });
      } catch (err) {
        console.error("Error creating upload directory", err);
      }

      for (const foto of fotos) {
        if (foto.size > 0) {
          const buffer = Buffer.from(await foto.arrayBuffer());
          const ext = path.extname(foto.name) || ".jpg";
          const now = new Date();
          const pad = (n: number) => String(n).padStart(2, "0");
          const fechaHora = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
          const uniqueFilename = `guia-${guia.nrguia}-${fechaHora}-${crypto.randomBytes(4).toString("hex")}${ext.toLowerCase()}`;
          const filePath = path.join(uploadDir, uniqueFilename);
          
          await writeFile(filePath, buffer);

          const createdImage = await tx.imagen.create({
            data: {
              guiaId: guia.id,
              filename: uniqueFilename,
              storagePath: `/api/uploads/guias/${uniqueFilename}`,
              contentType: foto.type,
              sizeBytes: foto.size,
              createdBy: session.user.id,
            },
          });

          // GPS por imagen para control de campo (si las columnas existen en DB)
          try {
            await tx.$executeRaw`
              UPDATE "imagenes"
              SET
                "latitude" = ${gpsData.lat},
                "longitude" = ${gpsData.lng},
                "gps_accuracy" = ${gpsData.accuracy ?? null},
                "gps_captured_at" = ${gpsData.timestamp ? new Date(gpsData.timestamp) : new Date()}
              WHERE "id" = ${createdImage.id}
            `;
          } catch {
            // Compatibilidad hacia atras: si la BD aun no tiene columnas GPS, no romper operativa.
          }
        }
      }

      // Audit Log
      await tx.auditLog.create({
        data: {
          userId: session.user.id,
          userEmail: session.user.email,
          ipAddress: auditMeta.ipAddress,
          userAgent: auditMeta.userAgent,
          action: "COMPLETAR_OPERATIVA_TABLET",
          entityType: "Guia",
          entityId: guia.id,
          newValues: {
            estado: "vigente",
            remitosVinculados: remitosIds.length,
            imagenesAdjuntas: fotos.length,
            titularId,
            ...(gpsData ? { gps: gpsData } : {})
          },
        },
      });
      
      return guia;
    });

    revalidatePath("/guias");
    revalidatePath("/remitos");
    return { success: true, guia: result };
  } catch (e: unknown) {
    console.error(e);
    return { error: "Error en la transacción operativa" };
  }
}

export async function rendirGuiaOperativa(nrguia: number) {
  const session = await requireRole("delegacion", "admin");
  const auditMeta = await getAuditRequestMeta();

  if (!Number.isInteger(nrguia) || nrguia <= 0) {
    return { error: "Número de guía inválido" };
  }

  try {
    const guia = await prisma.guia.findFirst({
      where: {
        nrguia,
        delegacionId: session.user.delegacionId,
        deletedAt: null,
      },
      select: {
        id: true,
        nrguia: true,
        devuelto: true,
        estado: true,
      },
    });

    if (!guia) {
      return { error: "La guía no existe en tu delegación" };
    }

    if (guia.devuelto) {
      return { error: "Esta guía ya se encuentra rendida." };
    }

    if (guia.estado === "en_blanco") {
      return { error: "No se pueden rendir guías en blanco." };
    }

    await prisma.$transaction(async (tx) => {
      await tx.guia.update({
        where: { id: guia.id },
        data: {
          devuelto: true,
          updatedBy: session.user.id,
        },
      });

      await tx.auditLog.create({
        data: {
          userId: session.user.id,
          userEmail: session.user.email,
          ipAddress: auditMeta.ipAddress,
          userAgent: auditMeta.userAgent,
          action: "RENDICION_GUIA_FISICA",
          entityType: "Guia",
          entityId: guia.id,
          newValues: {
            devuelto: true,
            via: "operativa",
          },
        },
      });
    });

    revalidatePath("/guias");
    revalidatePath("/operativa");
    return { success: true, mensaje: `La guía ${nrguia} ha sido rendida exitosamente.` };
  } catch (error) {
    console.error(error);
    return { error: "Error al rendir la guía física." };
  }
}
