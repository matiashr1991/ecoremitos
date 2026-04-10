"use client";

import { useState, useTransition } from "react";
import { Plus, Trash2, Shield, User as UserIcon, KeyRound } from "lucide-react";
import {
  ModalWrapper,
  FormField, inputStyles, btnPrimary, btnSecondary,
} from "@/components/shared/ui-components";
import { createUser, deleteUser, updateUserPassword, updateUserRole } from "@/actions/usuarios.actions";

type User = {
  id: string;
  name: string;
  email: string;
  role: string;
  createdAt: string;
  delegacion?: { id: number; nombre: string } | null;
};

type Delegacion = { id: number; nombre: string };

const ROLE_LABELS: Record<string, string> = {
  admin: "Administrador Global",
  recaudacion: "Recaudación (Sede Central)",
  delegacion: "Operario Delegación",
  control: "Control / Consultas",
};

export function UsuariosClient({ users, delegaciones }: { users: User[], delegaciones: Delegacion[] }) {
  const [showCreate, setShowCreate] = useState(false);
  const [editRole, setEditRole] = useState<User | null>(null);
  const [editPassword, setEditPassword] = useState<User | null>(null);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">Usuarios y Permisos</h1>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            Gestión interna de cuentas de acceso y delegaciones asignadas
          </p>
        </div>
        <div>
          <button onClick={() => setShowCreate(true)} className={btnPrimary}>
            <Plus className="h-4 w-4" />
            Nuevo Usuario
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900">
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">Nombre / Email</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">Rol</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">Delegación</th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {users.map((user) => (
                <tr key={user.id} className="transition-colors hover:bg-zinc-50/50 dark:hover:bg-zinc-800/30">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400">
                        <UserIcon className="h-4 w-4" />
                      </div>
                      <div>
                        <div className="font-medium text-zinc-900 dark:text-zinc-100">{user.name}</div>
                        <div className="text-xs text-zinc-500 dark:text-zinc-400">{user.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-zinc-100 px-2.5 py-0.5 text-xs font-medium text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
                       {ROLE_LABELS[user.role] || user.role}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-zinc-600 dark:text-zinc-400">
                    {user.role === "delegacion" ? (
                       <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                         {user.delegacion?.nombre || "Sin Asignar ⚠️"}
                       </span>
                    ) : (
                       <span className="text-zinc-400 italic">Acceso Global</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
             
                    <button
                      onClick={() => setEditRole(user)}
                      className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
                      title="Editar Permisos"
                    >
                      <Shield className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => setEditPassword(user)}
                      className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
                      title="Editar Contraseña"
                    >
                      <KeyRound className="h-4 w-4" />
                    </button>
                    <button
                      onClick={async () => {
                        if (confirm(`¿Eliminar cuenta de ${user.email}?`)) {
                          await deleteUser(user.id);
                        }
                      }}
                      className="rounded-lg p-1.5 text-red-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/30 dark:hover:text-red-400"
                      title="Eliminar Cuenta"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                    
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <CreateUserModal open={showCreate} onClose={() => setShowCreate(false)} delegaciones={delegaciones} />
      {editRole && (
         <EditRoleModal user={editRole} onClose={() => setEditRole(null)} delegaciones={delegaciones} />
      )}
      {editPassword && (
        <EditPasswordModal user={editPassword} onClose={() => setEditPassword(null)} />
      )}
    </div>
  );
}

function CreateUserModal({ open, onClose, delegaciones }: { open: boolean; onClose: () => void; delegaciones: Delegacion[] }) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const [role, setRole] = useState("control");

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      const res = await createUser({
        name: fd.get("name") as string,
        email: fd.get("email") as string,
        role: fd.get("role") as string,
        password: fd.get("password") as string,
        delegacionId: fd.get("delegacionId") ? parseInt(fd.get("delegacionId") as string) : undefined
      });
      if (res.error) setError(res.error);
      else onClose();
    });
  };

  return (
    <ModalWrapper open={open} onClose={onClose} title="Crear Usuario">
      <form onSubmit={handleSubmit} className="space-y-4">
        <FormField label="Nombre completo" id="name">
          <input name="name" id="name" required className={inputStyles} placeholder="Ej: Juan Pérez" />
        </FormField>
        <FormField label="Correo electrónico" id="email">
          <input name="email" id="email" type="email" required className={inputStyles} placeholder="correo@ejemplo.com" />
        </FormField>
        <FormField label="Contraseña" id="password">
          <input name="password" id="password" type="password" required className={inputStyles} placeholder="Mínimo 8 caracteres" />
        </FormField>
        
        <FormField label="Rol de Sistema" id="role">
          <select name="role" id="role" className={inputStyles} value={role} onChange={(e) => setRole(e.target.value)}>
            <option value="control">Control (Solo lectura)</option>
            <option value="delegacion">Operario Delegación</option>
            <option value="recaudacion">Recaudación (Sede Central)</option>
            <option value="admin">Administrador Global</option>
          </select>
        </FormField>

        {role === "delegacion" && (
          <FormField label="Asignar a Delegación Física" id="delegacionId">
            <select name="delegacionId" id="delegacionId" className={inputStyles} required>
              <option value="">Seleccione delegación...</option>
              {delegaciones.map(d => <option key={d.id} value={d.id}>{d.nombre}</option>)}
            </select>
            <p className="text-xs text-amber-600 mt-1">Este operario SOLO verá datos de esta Sede.</p>
          </FormField>
        )}

        {error && <p className="text-sm text-red-500">{error}</p>}
        
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={onClose} className={btnSecondary} disabled={isPending}>Cancelar</button>
          <button type="submit" disabled={isPending} className={btnPrimary}>
            {isPending ? "Creando..." : "Crear cuenta"}
          </button>
        </div>
      </form>
    </ModalWrapper>
  );
}

function EditRoleModal({ user, onClose, delegaciones }: { user: User; onClose: () => void; delegaciones: Delegacion[] }) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const [role, setRole] = useState(user.role);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      const res = await updateUserRole(user.id, {
        role: fd.get("role") as string,
        delegacionId: fd.get("delegacionId") ? parseInt(fd.get("delegacionId") as string) : undefined
      });
      if (res.error) setError(res.error);
      else onClose();
    });
  };

  return (
    <ModalWrapper open={true} onClose={onClose} title={`Modificar Permisos: ${user.name}`}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <FormField label="Rol de Sistema" id="role">
          <select name="role" id="role" className={inputStyles} value={role} onChange={(e) => setRole(e.target.value)}>
            <option value="control">Control (Solo lectura)</option>
            <option value="delegacion">Operario Delegación</option>
            <option value="recaudacion">Recaudación (Sede Central)</option>
            <option value="admin">Administrador Global</option>
          </select>
        </FormField>

        {role === "delegacion" && (
          <FormField label="Asignar a Delegación Física" id="delegacionId">
            <select name="delegacionId" id="delegacionId" className={inputStyles} defaultValue={user.delegacion?.id} required>
              <option value="">Seleccione delegación...</option>
              {delegaciones.map(d => <option key={d.id} value={d.id}>{d.nombre}</option>)}
            </select>
          </FormField>
        )}

        {error && <p className="text-sm text-red-500">{error}</p>}
        
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={onClose} className={btnSecondary} disabled={isPending}>Cancelar</button>
          <button type="submit" disabled={isPending} className={btnPrimary}>
            {isPending ? "Guardando..." : "Guardar Persmisos"}
          </button>
        </div>
      </form>
    </ModalWrapper>
  );
}

function EditPasswordModal({ user, onClose }: { user: User; onClose: () => void }) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState("");

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const password = String(fd.get("password") || "");
    const confirmPassword = String(fd.get("confirmPassword") || "");

    if (password.length < 8) {
      setError("La contraseña debe tener al menos 8 caracteres");
      return;
    }

    if (password !== confirmPassword) {
      setError("Las contraseñas no coinciden");
      return;
    }

    startTransition(async () => {
      const res = await updateUserPassword({ id: user.id, newPassword: password });
      if (res.error) setError(res.error);
      else onClose();
    });
  };

  return (
    <ModalWrapper open={true} onClose={onClose} title={`Cambiar Contraseña: ${user.name}`}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <FormField label="Nueva contraseña" id="password">
          <input name="password" id="password" type="password" required className={inputStyles} placeholder="Mínimo 8 caracteres" />
        </FormField>

        <FormField label="Repetir contraseña" id="confirmPassword">
          <input name="confirmPassword" id="confirmPassword" type="password" required className={inputStyles} placeholder="Repetir contraseña" />
        </FormField>

        {error && <p className="text-sm text-red-500">{error}</p>}

        <p className="text-xs text-zinc-500 dark:text-zinc-400">
          Al cambiarla, se cierran las sesiones activas del usuario.
        </p>

        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={onClose} className={btnSecondary} disabled={isPending}>Cancelar</button>
          <button type="submit" disabled={isPending} className={btnPrimary}>
            {isPending ? "Guardando..." : "Guardar contraseña"}
          </button>
        </div>
      </form>
    </ModalWrapper>
  );
}
