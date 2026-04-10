"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Users, Plus, Search, Pencil, Trash2, MoreVertical } from "lucide-react";
import {
  ModalWrapper, EmptyState, Pagination, SearchInput, FormField,
  inputStyles, btnPrimary, btnSecondary,
} from "@/components/shared/ui-components";
import { createTitular, updateTitular, deleteTitular } from "@/actions/titulares.actions";

type Titular = {
  id: number; razonSocial: string; cuit: string; email: string | null;
  telefono: string | null; direccion: string | null;
  _count: { guias: number };
};

export function TitularesClient({
  titulares, total, pages, currentPage, currentSearch,
}: {
  titulares: Titular[]; total: number; pages: number; currentPage: number; currentSearch: string;
}) {
  const router = useRouter();
  const [search, setSearch] = useState(currentSearch);
  const [showCreate, setShowCreate] = useState(false);
  const [editItem, setEditItem] = useState<Titular | null>(null);
  const [actionMenu, setActionMenu] = useState<number | null>(null);

  const handleSearch = () => {
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    router.push(`/titulares?${params.toString()}`);
  };

  const handlePageChange = (p: number) => {
    const params = new URLSearchParams();
    params.set("page", p.toString());
    if (search) params.set("search", search);
    router.push(`/titulares?${params.toString()}`);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">Titulares</h1>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">Personas y empresas titulares de guías forestales</p>
        </div>
        <button onClick={() => setShowCreate(true)} className={btnPrimary}>
          <Plus className="h-4 w-4" /> Nuevo titular
        </button>
      </div>

      <div className="flex items-center gap-3 rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
        <SearchInput value={search} onChange={setSearch} placeholder="Buscar por nombre o CUIT..." />
        <button onClick={handleSearch} className={btnPrimary}>
          <Search className="h-4 w-4" /> Buscar
        </button>
      </div>

      <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
        {titulares.length === 0 ? (
          <EmptyState icon={<Users className="h-12 w-12" />} title="Sin titulares" description="Creá un nuevo titular o ajustá la búsqueda" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900">
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-zinc-500">Razón Social</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-zinc-500">CUIT</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-zinc-500">Email</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-zinc-500">Teléfono</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-zinc-500">Guías</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-zinc-500">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                {titulares.map((t) => (
                  <tr key={t.id} className="transition-colors hover:bg-zinc-50/50 dark:hover:bg-zinc-800/30">
                    <td className="px-4 py-3 text-sm font-medium text-zinc-900 dark:text-zinc-100">{t.razonSocial}</td>
                    <td className="px-4 py-3 text-sm font-mono text-zinc-600 dark:text-zinc-400">{t.cuit}</td>
                    <td className="px-4 py-3 text-sm text-zinc-600 dark:text-zinc-400">{t.email || "—"}</td>
                    <td className="px-4 py-3 text-sm text-zinc-600 dark:text-zinc-400">{t.telefono || "—"}</td>
                    <td className="px-4 py-3 text-center">
                      <span className="inline-flex h-6 min-w-6 items-center justify-center rounded-full bg-emerald-100 px-1.5 text-xs font-semibold text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400">
                        {t._count.guias}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="relative inline-block">
                        <button
                          onClick={() => setActionMenu(actionMenu === t.id ? null : t.id)}
                          className="rounded-lg p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
                        >
                          <MoreVertical className="h-4 w-4" />
                        </button>
                        {actionMenu === t.id && (
                          <div className="absolute right-0 top-full z-20 mt-1 w-36 overflow-hidden rounded-lg border border-zinc-200 bg-white shadow-lg dark:border-zinc-700 dark:bg-zinc-800">
                            <button onClick={() => { setEditItem(t); setActionMenu(null); }} className="flex w-full items-center gap-2 px-3 py-2 text-sm text-zinc-700 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-700">
                              <Pencil className="h-3.5 w-3.5" /> Editar
                            </button>
                            <button onClick={async () => { if (confirm("¿Eliminar?")) { await deleteTitular(t.id); setActionMenu(null); } }} className="flex w-full items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/30">
                              <Trash2 className="h-3.5 w-3.5" /> Eliminar
                            </button>
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Pagination page={currentPage} pages={pages} total={total} onPageChange={handlePageChange} />
      <CreateTitularModal open={showCreate} onClose={() => setShowCreate(false)} />
      {editItem && <EditTitularModal titular={editItem} onClose={() => setEditItem(null)} />}
    </div>
  );
}

function CreateTitularModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [isPending, startTransition] = useTransition();
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      const res = await createTitular({
        razonSocial: fd.get("razonSocial"), cuit: fd.get("cuit"), email: fd.get("email"),
        telefono: fd.get("telefono"), direccion: fd.get("direccion"),
      });
      if (res.error) setErrors(res.error as Record<string, string[]>);
      else onClose();
    });
  };
  return (
    <ModalWrapper open={open} onClose={onClose} title="Nuevo Titular">
      <form onSubmit={handleSubmit} className="space-y-4">
        <FormField label="Razón Social" id="razonSocial" error={errors.razonSocial}>
          <input name="razonSocial" id="razonSocial" required className={inputStyles} placeholder="Empresa S.A." />
        </FormField>
        <FormField label="CUIT" id="cuit" error={errors.cuit}>
          <input name="cuit" id="cuit" required className={inputStyles} placeholder="XX-XXXXXXXX-X" />
        </FormField>
        <div className="grid grid-cols-2 gap-4">
          <FormField label="Email" id="email"><input name="email" id="email" type="email" className={inputStyles} /></FormField>
          <FormField label="Teléfono" id="telefono"><input name="telefono" id="telefono" className={inputStyles} /></FormField>
        </div>
        <FormField label="Dirección" id="direccion"><input name="direccion" id="direccion" className={inputStyles} /></FormField>
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={onClose} className={btnSecondary}>Cancelar</button>
          <button type="submit" disabled={isPending} className={btnPrimary}>{isPending ? "Creando..." : "Crear"}</button>
        </div>
      </form>
    </ModalWrapper>
  );
}

function EditTitularModal({ titular, onClose }: { titular: Titular; onClose: () => void }) {
  const [isPending, startTransition] = useTransition();
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      const res = await updateTitular({
        id: titular.id, razonSocial: fd.get("razonSocial"), cuit: fd.get("cuit"), email: fd.get("email"),
        telefono: fd.get("telefono"), direccion: fd.get("direccion"),
      });
      if (res.error) setErrors(res.error as Record<string, string[]>);
      else onClose();
    });
  };
  return (
    <ModalWrapper open={true} onClose={onClose} title={`Editar: ${titular.razonSocial}`}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <FormField label="Razón Social" id="razonSocial" error={errors.razonSocial}>
          <input name="razonSocial" id="razonSocial" defaultValue={titular.razonSocial} required className={inputStyles} />
        </FormField>
        <FormField label="CUIT" id="cuit" error={errors.cuit}>
          <input name="cuit" id="cuit" defaultValue={titular.cuit} required className={inputStyles} />
        </FormField>
        <div className="grid grid-cols-2 gap-4">
          <FormField label="Email" id="email"><input name="email" id="email" type="email" defaultValue={titular.email || ""} className={inputStyles} /></FormField>
          <FormField label="Teléfono" id="telefono"><input name="telefono" id="telefono" defaultValue={titular.telefono || ""} className={inputStyles} /></FormField>
        </div>
        <FormField label="Dirección" id="direccion"><input name="direccion" id="direccion" defaultValue={titular.direccion || ""} className={inputStyles} /></FormField>
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={onClose} className={btnSecondary}>Cancelar</button>
          <button type="submit" disabled={isPending} className={btnPrimary}>{isPending ? "Guardando..." : "Guardar"}</button>
        </div>
      </form>
    </ModalWrapper>
  );
}
