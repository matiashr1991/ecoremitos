"use client";

import { useState, useTransition } from "react";
import {
  Shield, Plus, Pencil, Trash2, UserCheck, UserX,
} from "lucide-react";
import {
  ModalWrapper, EmptyState, FormField,
  inputStyles, btnPrimary, btnSecondary,
} from "@/components/shared/ui-components";
import { createUser, updateUser, deleteUser } from "@/actions/admin.actions";

type User = {
  id: string;
  name: string;
  email: string;
  role: string | null;
  banned: boolean | null;
  createdAt: string;
  delegacion: { id: number; nombre: string } | null;
};

type Delegacion = { id: number; nombre: string };

const roleLabels: Record<string, { label: string; color: string }> = {
  admin: { label: "Administrador", color: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400" },
  recaudacion: { label: "Recaudación", color: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400" },
  delegacion: { label: "Delegación", color: "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-400" },
  central: { label: "Central", color: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400" },
  control: { label: "Control", color: "bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-400" },
  auditor: { label: "Auditor", color: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400" },
  fiscalizador: { label: "Fiscalizador", color: "bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-400" },
};

export function AdminClient({ users, delegaciones }: { users: User[]; delegaciones: Delegacion[] }) {
  const [showCreate, setShowCreate] = useState(false);
  const [editUser, setEditUser] = useState<User | null>(null);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
            Administración de Usuarios
          </h1>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            Gestión de cuentas, roles y permisos
          </p>
        </div>
        <button onClick={() => setShowCreate(true)} className={btnPrimary}>
          <Plus className="h-4 w-4" /> Nuevo usuario
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {Object.entries(roleLabels).map(([role, { label }]) => {
          const count = users.filter((u) => u.role === role).length;
          return (
            <div key={role} className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
              <p className="text-sm text-zinc-500 dark:text-zinc-400">{label}</p>
              <p className="mt-1 text-2xl font-bold text-zinc-900 dark:text-zinc-50">{count}</p>
            </div>
          );
        })}
      </div>

      {/* Users table */}
      <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
        {users.length === 0 ? (
          <EmptyState icon={<Shield className="h-12 w-12" />} title="Sin usuarios" description="Creá el primer usuario" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900">
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-zinc-500">Usuario</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-zinc-500">Rol</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-zinc-500">Delegación</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-zinc-500">Estado</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-zinc-500">Creado</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-zinc-500">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                {users.map((user) => {
                  const roleInfo = roleLabels[user.role || "consulta"] || roleLabels.consulta;
                  return (
                    <tr key={user.id} className="transition-colors hover:bg-zinc-50/50 dark:hover:bg-zinc-800/30">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-emerald-500 to-green-600 text-sm font-bold text-white">
                            {user.name?.charAt(0).toUpperCase() || "U"}
                          </div>
                          <div>
                            <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">{user.name}</p>
                            <p className="text-xs text-zinc-500 dark:text-zinc-400">{user.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${roleInfo.color}`}>
                          {roleInfo.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-zinc-600 dark:text-zinc-400">
                        {user.delegacion?.nombre || "—"}
                      </td>
                      <td className="px-4 py-3">
                        {user.banned ? (
                          <span className="inline-flex items-center gap-1 text-xs text-red-600 dark:text-red-400">
                            <UserX className="h-3.5 w-3.5" /> Bloqueado
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400">
                            <UserCheck className="h-3.5 w-3.5" /> Activo
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm text-zinc-500 dark:text-zinc-400">
                        {new Date(user.createdAt).toLocaleDateString("es-AR")}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => setEditUser(user)}
                            className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
                            title="Editar"
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button
                            onClick={async () => {
                              if (confirm(`¿Eliminar a ${user.name}? Esta acción no se puede deshacer.`)) {
                                await deleteUser(user.id);
                              }
                            }}
                            className="rounded-lg p-1.5 text-zinc-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/30 dark:hover:text-red-400"
                            title="Eliminar"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <CreateUserModal open={showCreate} onClose={() => setShowCreate(false)} delegaciones={delegaciones} />
      {editUser && <EditUserModal user={editUser} onClose={() => setEditUser(null)} delegaciones={delegaciones} />}
    </div>
  );
}

function CreateUserModal({ open, onClose, delegaciones }: { open: boolean; onClose: () => void; delegaciones: Delegacion[] }) {
  const [isPending, startTransition] = useTransition();
  const [errors, setErrors] = useState<Record<string, string[]>>({});

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      const res = await createUser({
        name: fd.get("name") as string,
        email: fd.get("email") as string,
        password: fd.get("password") as string,
        role: fd.get("role") as string,
        delegacionId: fd.get("delegacionId") ? parseInt(fd.get("delegacionId") as string) : null,
      });
      if (res.error) setErrors(res.error as Record<string, string[]>);
      else onClose();
    });
  };

  return (
    <ModalWrapper open={open} onClose={onClose} title="Nuevo Usuario">
      <form onSubmit={handleSubmit} className="space-y-4">
        <FormField label="Nombre" id="name">
          <input name="name" id="name" required className={inputStyles} placeholder="Nombre completo" />
        </FormField>
        <FormField label="Email" id="email">
          <input name="email" id="email" type="email" required className={inputStyles} placeholder="usuario@email.com" />
        </FormField>
        <FormField label="Contraseña" id="password">
          <input name="password" id="password" type="password" required minLength={8} className={inputStyles} placeholder="Min. 8 caracteres" />
        </FormField>
        <div className="grid grid-cols-2 gap-4">
          <FormField label="Rol" id="role">
            <select name="role" id="role" className={inputStyles}>
              <option value="control">Control</option>
              <option value="recaudacion">Recaudación</option>
              <option value="delegacion">Delegación</option>
              <option value="central">Central</option>
              <option value="auditor">Auditor</option>
              <option value="fiscalizador">Fiscalizador</option>
              <option value="admin">Administrador</option>
            </select>
          </FormField>
          <FormField label="Delegación" id="delegacionId">
            <select name="delegacionId" id="delegacionId" className={inputStyles}>
              <option value="">Sin asignar</option>
              {delegaciones.map((d) => (
                <option key={d.id} value={d.id}>{d.nombre}</option>
              ))}
            </select>
          </FormField>
        </div>
        {errors._form && <p className="text-sm text-red-500">{errors._form[0]}</p>}
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={onClose} className={btnSecondary}>Cancelar</button>
          <button type="submit" disabled={isPending} className={btnPrimary}>
            {isPending ? "Creando..." : "Crear usuario"}
          </button>
        </div>
      </form>
    </ModalWrapper>
  );
}

function EditUserModal({ user, onClose, delegaciones }: { user: User; onClose: () => void; delegaciones: Delegacion[] }) {
  const [isPending, startTransition] = useTransition();
  const [errors, setErrors] = useState<Record<string, string[]>>({});

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      const res = await updateUser({
        id: user.id,
        name: fd.get("name") as string,
        role: fd.get("role") as string,
        delegacionId: fd.get("delegacionId") ? parseInt(fd.get("delegacionId") as string) : null,
        banned: fd.get("banned") === "true",
      });
      if (res.error) setErrors(res.error as Record<string, string[]>);
      else onClose();
    });
  };

  return (
    <ModalWrapper open={true} onClose={onClose} title={`Editar: ${user.name}`}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <FormField label="Nombre" id="name">
          <input name="name" id="name" defaultValue={user.name} required className={inputStyles} />
        </FormField>
        <div className="grid grid-cols-2 gap-4">
          <FormField label="Rol" id="role">
            <select name="role" id="role" defaultValue={user.role || "control"} className={inputStyles}>
              <option value="admin">Administrador</option>
              <option value="recaudacion">Recaudación</option>
              <option value="delegacion">Delegación</option>
              <option value="central">Central</option>
              <option value="control">Control</option>
              <option value="auditor">Auditor</option>
              <option value="fiscalizador">Fiscalizador</option>
            </select>
          </FormField>
          <FormField label="Delegación" id="delegacionId">
            <select name="delegacionId" id="delegacionId" defaultValue={user.delegacion?.id || ""} className={inputStyles}>
              <option value="">Sin asignar</option>
              {delegaciones.map((d) => (
                <option key={d.id} value={d.id}>{d.nombre}</option>
              ))}
            </select>
          </FormField>
        </div>
        <FormField label="Estado" id="banned">
          <select name="banned" id="banned" defaultValue={user.banned ? "true" : "false"} className={inputStyles}>
            <option value="false">Activo</option>
            <option value="true">Bloqueado</option>
          </select>
        </FormField>
        <p className="text-xs text-zinc-500 dark:text-zinc-400">
          Email: {user.email} (no se puede cambiar)
        </p>
        {errors._form && <p className="text-sm text-red-500">{errors._form[0]}</p>}
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={onClose} className={btnSecondary}>Cancelar</button>
          <button type="submit" disabled={isPending} className={btnPrimary}>
            {isPending ? "Guardando..." : "Guardar"}
          </button>
        </div>
      </form>
    </ModalWrapper>
  );
}
