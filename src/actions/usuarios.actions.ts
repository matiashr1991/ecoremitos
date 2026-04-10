"use server";

import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth-guard";
import { auth } from "@/lib/auth";
import { hashPassword } from "better-auth/crypto";
import { z } from "zod";
import type { UserRole } from "@prisma/client";

const updateUserPasswordSchema = z.object({
  id: z.string().min(1),
  newPassword: z.string().min(8, "La contraseña debe tener al menos 8 caracteres").max(128),
});

const userRoleSchema = z.enum([
  "admin",
  "central",
  "delegacion",
  "control",
  "auditor",
  "recaudacion",
  "fiscalizador",
  "carga",
]);

export async function getUsers() {
  await requireRole("admin");

  const users = await prisma.user.findMany({
    where: { deletedAt: null },
    include: { delegacion: true },
    orderBy: { createdAt: "desc" },
  });
  
  return { users };
}

export async function createUser(data: { name: string; email: string; role: string; delegacionId?: number; password?: string }) {
  await requireRole("admin");

  if (!data.email || !data.name || !data.role) return { error: "Faltan campos obligatorios" };

  try {
    const existing = await prisma.user.findUnique({ where: { email: data.email } });
    if (existing) return { error: "El email ya está en uso" };

    const parsedRole = userRoleSchema.safeParse(data.role);
    if (!parsedRole.success) return { error: "Rol inválido" };

    // CUIDADO: No pasamos request/headers para que no inicie sesion local del admin
    await auth.api.signUpEmail({
      body: {
        email: data.email,
        password: data.password || "12345678", // default password
        name: data.name,
      },
    });

    await prisma.user.update({
      where: { email: data.email },
      data: {
        role: parsedRole.data,
        delegacionId: data.delegacionId || null,
      },
    });

    revalidatePath("/usuarios");
    return { success: true };
  } catch (e) {
    console.error("Error creating user:", e);
    return { error: "Error al crear el usuario" };
  }
}

export async function deleteUser(id: string) {
  const session = await requireRole("admin");
  if (session.user.id === id) return { error: "No puedes eliminar tu propia cuenta" };

  try {
    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) return { error: "Usuario no encontrado" };

    await prisma.user.update({ 
      where: { id },
      data: { 
        deletedAt: new Date(),
        email: `${user.email} (eliminado ${Date.now()})`
      }
    });
    revalidatePath("/usuarios");
    return { success: true };
  } catch (e) {
    console.error("Error deleting user:", e);
    return { error: "Error al eliminar el usuario" };
  }
}

export async function updateUserRole(id: string, data: { role: string; delegacionId?: number }) {
  const session = await requireRole("admin");
  if (session.user.id === id) return { error: "No puedes modificar tus propios permisos" };

  const parsedRole = userRoleSchema.safeParse(data.role);
  if (!parsedRole.success) return { error: "Rol inválido" };

  try {
    await prisma.user.update({
      where: { id },
      data: {
        role: parsedRole.data as UserRole,
        delegacionId: data.delegacionId || null,
      }
    });
    revalidatePath("/usuarios");
    return { success: true };
  } catch {
    return { error: "Error al actualizar usuario" };
  }
}

export async function updateUserPassword(data: { id: string; newPassword: string }) {
  const session = await requireRole("admin");
  if (session.user.id === data.id) {
    return { error: "Por seguridad, no puedes cambiar tu propia contraseña desde Gestión de Agentes" };
  }

  const parsed = updateUserPasswordSchema.safeParse(data);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message || "Datos inválidos" };
  }

  try {
    const user = await prisma.user.findUnique({ where: { id: parsed.data.id } });
    if (!user || user.deletedAt) return { error: "Usuario no encontrado" };

    const hashedPassword = await hashPassword(parsed.data.newPassword);

    await prisma.$transaction(async (tx) => {
      const credential = await tx.account.findFirst({
        where: { userId: parsed.data.id, providerId: "credential" },
        select: { id: true },
      });

      if (credential) {
        await tx.account.update({
          where: { id: credential.id },
          data: { password: hashedPassword },
        });
      } else {
        await tx.account.create({
          data: {
            userId: parsed.data.id,
            providerId: "credential",
            accountId: parsed.data.id,
            password: hashedPassword,
          },
        });
      }

      await tx.session.deleteMany({ where: { userId: parsed.data.id } });
    });

    revalidatePath("/usuarios");
    return { success: true };
  } catch (e) {
    console.error("Error updating password:", e);
    return { error: "Error al actualizar contraseña" };
  }
}
