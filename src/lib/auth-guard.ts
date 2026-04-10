"use server";

import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import type { UserRole } from "@prisma/client";

export type AuthSession = {
  user: {
    id: string;
    name: string;
    email: string;
    role: UserRole;
    delegacionId: number | null;
  };
};

/**
 * Verifica que el usuario tenga uno de los roles permitidos.
 * Lanza error si no está autenticado o no tiene el rol requerido.
 */
export async function requireRole(...allowedRoles: UserRole[]): Promise<AuthSession> {
  const session = await auth.api.getSession({ headers: await headers() });

  if (!session?.user) {
    throw new Error("No autenticado");
  }

  // Verificar si el usuario fue dado de baja lógica
  if ((session.user as any).deletedAt) {
    throw new Error("Su cuenta ha sido desactivada");
  }

  const userRole = (session.user as Record<string, unknown>).role as UserRole;

  if (!allowedRoles.includes(userRole)) {
    throw new Error(`Acceso denegado. Rol requerido: ${allowedRoles.join(", ")}`);
  }

  return {
    user: {
      id: session.user.id,
      name: session.user.name,
      email: session.user.email,
      role: userRole,
      delegacionId: (session.user as Record<string, unknown>).delegacionId as number | null,
    },
  };
}

/**
 * Obtiene la sesión sin verificar rol.
 * Lanza error si no está autenticado.
 */
export async function requireAuth(): Promise<AuthSession> {
  const session = await auth.api.getSession({ headers: await headers() });

  if (!session?.user) {
    throw new Error("No autenticado");
  }

  // Verificar si el usuario fue dado de baja lógica
  if ((session.user as any).deletedAt) {
    throw new Error("Su cuenta ha sido desactivada");
  }

  return {
    user: {
      id: session.user.id,
      name: session.user.name,
      email: session.user.email,
      role: ((session.user as Record<string, unknown>).role as UserRole) || "control",
      delegacionId: (session.user as Record<string, unknown>).delegacionId as number | null,
    },
  };
}
