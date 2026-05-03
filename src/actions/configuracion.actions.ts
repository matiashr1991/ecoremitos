"use server";

import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/auth-guard";
import { revalidatePath } from "next/cache";

export async function getConfig(clave: string): Promise<string | null> {
  const config = await prisma.configuracion.findUnique({
    where: { clave },
  });
  return config?.valor || null;
}

export async function setConfig(clave: string, valor: string) {
  const session = await requireRole("admin");
  if (!session) return { error: "No autorizado" };

  try {
    await prisma.configuracion.upsert({
      where: { clave },
      update: { valor },
      create: { clave, valor },
    });
    
    revalidatePath("/admin/configuracion");
    return { success: true };
  } catch (error) {
    console.error("Error guardando configuracion:", error);
    return { error: "Error al guardar la configuración" };
  }
}
