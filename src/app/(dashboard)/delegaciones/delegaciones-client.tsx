"use client";

import { useState, useTransition } from "react";
import { Building2, Plus, Pencil, Trash2, Users, FileText, Truck } from "lucide-react";
import {
  ModalWrapper, EmptyState, FormField,
  inputStyles, btnPrimary, btnSecondary,
} from "@/components/shared/ui-components";
import { createDelegacion, updateDelegacion, deleteDelegacion } from "@/actions/delegaciones.actions";

type Delegacion = {
  id: number; nombre: string; email: string | null; telefono: string | null; direccion: string | null; activa: boolean;
  _count: { guias: number; remitos: number; usuarios: number };
  stats?: {
    guiasVirgenes: number;
    guiasUsadas: number;
    remitosVirgenes: number;
    remitosUsados: number;
  }
};

export function DelegacionesClient({ delegaciones, userRole }: { delegaciones: Delegacion[], userRole: string }) {
  const [showCreate, setShowCreate] = useState(false);
  const [editItem, setEditItem] = useState<Delegacion | null>(null);

  const isAdmin = userRole === "admin";
  const canEdit = isAdmin || userRole === "recaudacion";

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">Delegaciones</h1>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            Administración de delegaciones forestales
          </p>
        </div>
        {canEdit && (
          <button onClick={() => setShowCreate(true)} className={btnPrimary}>
            <Plus className="h-4 w-4" /> Nueva delegación
          </button>
        )}
      </div>

      {delegaciones.length === 0 ? (
        <EmptyState icon={<Building2 className="h-12 w-12" />} title="Sin delegaciones" description="Creá la primera delegación" />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {delegaciones.map((d) => (
            <div key={d.id} className="group rounded-xl border border-zinc-200 bg-white p-5 shadow-sm transition-all hover:shadow-md dark:border-zinc-800 dark:bg-zinc-950">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-violet-500 to-purple-600 text-white">
                    <Building2 className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-zinc-900 dark:text-zinc-50">{d.nombre}</h3>
                    {d.email && <p className="text-xs text-zinc-500 dark:text-zinc-400">{d.email}</p>}
                  </div>
                </div>
                <div className="flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                  {canEdit && (
                    <button onClick={() => setEditItem(d)} className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600 dark:hover:bg-zinc-800 dark:hover:text-zinc-200">
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                  )}
                  {isAdmin && (
                    <button
                      onClick={async () => {
                        if (confirm("¿Eliminar?")) {
                          const res = await deleteDelegacion(d.id);
                          if (res.error) alert(res.error);
                        }
                      }}
                      className="rounded-lg p-1.5 text-zinc-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/30 dark:hover:text-red-400"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              </div>
              <div className="mt-4 flex flex-col gap-3 border-t border-zinc-100 pt-4 dark:border-zinc-800">
                
                <div className="flex flex-col gap-1.5">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-zinc-600 dark:text-zinc-400 font-medium flex items-center gap-1.5">
                      <FileText className="h-3.5 w-3.5" /> Guías (Total {d._count.guias})
                    </span>
                    <span className="text-zinc-800 dark:text-zinc-200 font-bold">
                       {d.stats?.guiasUsadas} <span className="text-zinc-400">usadas</span> / {d.stats?.guiasVirgenes} <span className="text-zinc-400">blanco</span>
                    </span>
                  </div>
                  <div className="w-full h-2 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden flex">
                    <div className="h-full bg-blue-500" style={{ width: `${d._count.guias > 0 ? ((d.stats?.guiasUsadas || 0) / d._count.guias) * 100 : 0}%` }} />
                    <div className="h-full bg-blue-200 dark:bg-blue-900/50" style={{ width: `${d._count.guias > 0 ? ((d.stats?.guiasVirgenes || 0) / d._count.guias) * 100 : 0}%` }} />
                  </div>
                </div>

                <div className="flex flex-col gap-1.5">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-zinc-600 dark:text-zinc-400 font-medium flex items-center gap-1.5">
                      <Truck className="h-3.5 w-3.5" /> Remitos (Total {d._count.remitos})
                    </span>
                    <span className="text-zinc-800 dark:text-zinc-200 font-bold">
                       {d.stats?.remitosUsados} <span className="text-zinc-400">usadas</span> / {d.stats?.remitosVirgenes} <span className="text-zinc-400">blanco</span>
                    </span>
                  </div>
                  <div className="w-full h-2 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden flex">
                    <div className="h-full bg-emerald-500" style={{ width: `${d._count.remitos > 0 ? ((d.stats?.remitosUsados || 0) / d._count.remitos) * 100 : 0}%` }} />
                    <div className="h-full bg-emerald-200 dark:bg-emerald-900/50" style={{ width: `${d._count.remitos > 0 ? ((d.stats?.remitosVirgenes || 0) / d._count.remitos) * 100 : 0}%` }} />
                  </div>
                </div>

                <div className="flex items-center gap-1.5 text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                  <Users className="h-3.5 w-3.5" /> {d._count.usuarios} usuarios
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <CreateDelegacionModal open={showCreate} onClose={() => setShowCreate(false)} />
      {editItem && <EditDelegacionModal delegacion={editItem} onClose={() => setEditItem(null)} />}
    </div>
  );
}

function CreateDelegacionModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [isPending, startTransition] = useTransition();
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      const res = await createDelegacion({
        nombre: fd.get("nombre"), email: fd.get("email"), telefono: fd.get("telefono"), direccion: fd.get("direccion"),
      });
      if (res.error) setErrors(res.error as Record<string, string[]>);
      else onClose();
    });
  };
  return (
    <ModalWrapper open={open} onClose={onClose} title="Nueva Delegación">
      <form onSubmit={handleSubmit} className="space-y-4">
        <FormField label="Nombre" id="nombre" error={errors.nombre}>
          <input name="nombre" id="nombre" required className={inputStyles} placeholder="Ej: Delegación Norte" />
        </FormField>
        <FormField label="Email" id="email" error={errors.email}>
          <input name="email" id="email" type="email" className={inputStyles} placeholder="ejemplo@email.com" />
        </FormField>
        <div className="grid grid-cols-2 gap-4">
          <FormField label="Teléfono" id="telefono">
            <input name="telefono" id="telefono" className={inputStyles} placeholder="+54 ..." />
          </FormField>
          <FormField label="Dirección" id="direccion">
            <input name="direccion" id="direccion" className={inputStyles} placeholder="Calle 123" />
          </FormField>
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={onClose} className={btnSecondary}>Cancelar</button>
          <button type="submit" disabled={isPending} className={btnPrimary}>
            {isPending ? "Creando..." : "Crear"}
          </button>
        </div>
      </form>
    </ModalWrapper>
  );
}

function EditDelegacionModal({ delegacion, onClose }: { delegacion: Delegacion; onClose: () => void }) {
  const [isPending, startTransition] = useTransition();
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      const res = await updateDelegacion({
        id: delegacion.id,
        nombre: fd.get("nombre"), email: fd.get("email"), telefono: fd.get("telefono"), direccion: fd.get("direccion"),
      });
      if (res.error) setErrors(res.error as Record<string, string[]>);
      else onClose();
    });
  };
  return (
    <ModalWrapper open={true} onClose={onClose} title={`Editar: ${delegacion.nombre}`}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <FormField label="Nombre" id="nombre" error={errors.nombre}>
          <input name="nombre" id="nombre" defaultValue={delegacion.nombre} required className={inputStyles} />
        </FormField>
        <FormField label="Email" id="email">
          <input name="email" id="email" type="email" defaultValue={delegacion.email || ""} className={inputStyles} />
        </FormField>
        <div className="grid grid-cols-2 gap-4">
          <FormField label="Teléfono" id="telefono">
            <input name="telefono" id="telefono" defaultValue={delegacion.telefono || ""} className={inputStyles} />
          </FormField>
          <FormField label="Dirección" id="direccion">
            <input name="direccion" id="direccion" defaultValue={delegacion.direccion || ""} className={inputStyles} />
          </FormField>
        </div>
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
