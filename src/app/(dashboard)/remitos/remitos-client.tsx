"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Truck, Plus, Search, Pencil, Trash2, MoreVertical, Package } from "lucide-react";
import {
  StatusBadge, ModalWrapper, EmptyState, Pagination, SearchInput, SelectFilter, FormField,
  inputStyles, btnPrimary, btnSecondary,
} from "@/components/shared/ui-components";
import { createRemito, createRemitosBulk, updateRemito, deleteRemito } from "@/actions/remitos.actions";

type Remito = {
  id: number; nrremito: number; estado: string; observaciones: string | null; devuelto: boolean;
  fechaVinculacion: string | null;
  guia: { id: number; nrguia: number; estado: string } | null;
  delegacion: { id: number; nombre: string } | null;
};
type Delegacion = { id: number; nombre: string };

const remitoEstados = [
  { value: "disponible", label: "Disponible" },
  { value: "vinculado", label: "Vinculado" },
  { value: "en_transito", label: "En tránsito" },
  { value: "entregado", label: "Entregado" },
  { value: "devuelto", label: "Devuelto" },
  { value: "anulado", label: "Anulado" },
];

export function RemitosClient({
  remitos, total, pages, currentPage, delegaciones, currentFilters,
}: {
  remitos: Remito[]; total: number; pages: number; currentPage: number;
  delegaciones: Delegacion[]; currentFilters: { search: string; estado: string; delegacionId: string };
}) {
  const router = useRouter();
  const [search, setSearch] = useState(currentFilters.search);
  const [estado, setEstado] = useState(currentFilters.estado);
  const [delegacionId, setDelegacionId] = useState(currentFilters.delegacionId);
  const [showCreate, setShowCreate] = useState(false);
  const [showBulk, setShowBulk] = useState(false);
  const [editItem, setEditItem] = useState<Remito | null>(null);
  const [actionMenu, setActionMenu] = useState<number | null>(null);

  const applyFilters = () => {
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (estado) params.set("estado", estado);
    if (delegacionId) params.set("delegacionId", delegacionId);
    router.push(`/remitos?${params.toString()}`);
  };

  const handlePageChange = (p: number) => {
    const params = new URLSearchParams();
    params.set("page", p.toString());
    if (search) params.set("search", search);
    if (estado) params.set("estado", estado);
    if (delegacionId) params.set("delegacionId", delegacionId);
    router.push(`/remitos?${params.toString()}`);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">Remitos</h1>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">Gestión de remitos de transporte forestal</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setShowBulk(true)} className={btnSecondary}><Package className="h-4 w-4" /> Carga masiva</button>
          <button onClick={() => setShowCreate(true)} className={btnPrimary}><Plus className="h-4 w-4" /> Nuevo remito</button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
        <SearchInput value={search} onChange={setSearch} placeholder="Buscar Nro remito o guía..." />
        <SelectFilter value={estado} onChange={setEstado} options={remitoEstados} placeholder="Todos los estados" />
        <SelectFilter value={delegacionId} onChange={setDelegacionId}
          options={delegaciones.map((d) => ({ value: d.id.toString(), label: d.nombre }))} placeholder="Todas las delegaciones" />
        <button onClick={applyFilters} className={btnPrimary}><Search className="h-4 w-4" /> Buscar</button>
      </div>

      <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
        {remitos.length === 0 ? (
          <EmptyState icon={<Truck className="h-12 w-12" />} title="No hay remitos" description="Creá un nuevo remito o ajustá los filtros" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900">
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-zinc-500">Nro</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-zinc-500">Estado</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-zinc-500">Guía</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-zinc-500">Vinculado</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-zinc-500">Delegación</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-zinc-500">Observaciones</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-zinc-500">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                {remitos.map((r) => (
                  <tr key={r.id} className="transition-colors hover:bg-zinc-50/50 dark:hover:bg-zinc-800/30">
                    <td className="whitespace-nowrap px-4 py-3 text-sm font-bold text-zinc-900 dark:text-zinc-100">#{r.nrremito}</td>
                    <td className="px-4 py-3"><StatusBadge status={r.estado} /></td>
                    <td className="px-4 py-3 text-sm text-zinc-600 dark:text-zinc-400">
                      {r.guia ? (
                        <div className="flex flex-col">
                          <span className="font-medium text-blue-600 dark:text-blue-400">#{r.guia.nrguia}</span>
                          {r.guia.estado === "intervenida" && (
                            <span className="text-[10px] font-extrabold text-red-600 animate-pulse">BLOQUEADO</span>
                          )}
                          {r.guia.estado === "vencida" && (
                            <span className="text-[10px] font-extrabold text-orange-600">VENCIDO</span>
                          )}
                        </div>
                      ) : "—"}
                    </td>
                    <td className="px-4 py-3 text-xs text-zinc-500">
                      {r.fechaVinculacion ? new Date(r.fechaVinculacion).toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "—"}
                    </td>
                    <td className="px-4 py-3 text-sm text-zinc-600 dark:text-zinc-400">{r.delegacion?.nombre || "—"}</td>
                    <td className="px-4 py-3 text-sm text-zinc-500 dark:text-zinc-400 max-w-xs truncate">{r.observaciones || "—"}</td>
                    <td className="px-4 py-3 text-right">
                      <div className="relative inline-block">
                        <button onClick={() => setActionMenu(actionMenu === r.id ? null : r.id)}
                          className="rounded-lg p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600 dark:hover:bg-zinc-800 dark:hover:text-zinc-200">
                          <MoreVertical className="h-4 w-4" />
                        </button>
                        {actionMenu === r.id && (
                          <div className="absolute right-0 top-full z-20 mt-1 w-36 overflow-hidden rounded-lg border border-zinc-200 bg-white shadow-lg dark:border-zinc-700 dark:bg-zinc-800">
                            <button onClick={() => { setEditItem(r); setActionMenu(null); }} className="flex w-full items-center gap-2 px-3 py-2 text-sm text-zinc-700 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-700">
                              <Pencil className="h-3.5 w-3.5" /> Editar
                            </button>
                            <button onClick={async () => { if (confirm("¿Eliminar?")) { await deleteRemito(r.id); setActionMenu(null); } }}
                              className="flex w-full items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/30">
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

      <CreateRemitoModal open={showCreate} onClose={() => setShowCreate(false)} delegaciones={delegaciones} />
      <BulkRemitosModal open={showBulk} onClose={() => setShowBulk(false)} delegaciones={delegaciones} />
      {editItem && <EditRemitoModal remito={editItem} onClose={() => setEditItem(null)} delegaciones={delegaciones} />}
    </div>
  );
}

function CreateRemitoModal({ open, onClose, delegaciones }: { open: boolean; onClose: () => void; delegaciones: Delegacion[] }) {
  const [isPending, startTransition] = useTransition();
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      const res = await createRemito({
        nrremito: parseInt(fd.get("nrremito") as string),
        guiaId: fd.get("guiaId") ? parseInt(fd.get("guiaId") as string) : null,
        delegacionId: fd.get("delegacionId") ? parseInt(fd.get("delegacionId") as string) : null,
        observaciones: fd.get("observaciones") as string,
      });
      if (res.error) setErrors(res.error as Record<string, string[]>);
      else onClose();
    });
  };
  return (
    <ModalWrapper open={open} onClose={onClose} title="Nuevo Remito">
      <form onSubmit={handleSubmit} className="space-y-4">
        <FormField label="Nro Remito" id="nrremito" error={errors.nrremito}>
          <input name="nrremito" id="nrremito" type="number" required className={inputStyles} placeholder="5678" />
        </FormField>
        <FormField label="Nro Guía (vincular)" id="guiaId">
          <input name="guiaId" id="guiaId" type="number" className={inputStyles} placeholder="Opcional" />
        </FormField>
        <FormField label="Delegación" id="delegacionId">
          <select name="delegacionId" id="delegacionId" className={inputStyles}>
            <option value="">Sin asignar</option>
            {delegaciones.map((d) => <option key={d.id} value={d.id}>{d.nombre}</option>)}
          </select>
        </FormField>
        <FormField label="Observaciones" id="observaciones">
          <textarea name="observaciones" id="observaciones" className={inputStyles} rows={2} />
        </FormField>
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={onClose} className={btnSecondary}>Cancelar</button>
          <button type="submit" disabled={isPending} className={btnPrimary}>{isPending ? "Creando..." : "Crear"}</button>
        </div>
      </form>
    </ModalWrapper>
  );
}

function BulkRemitosModal({ open, onClose, delegaciones }: { open: boolean; onClose: () => void; delegaciones: Delegacion[] }) {
  const [isPending, startTransition] = useTransition();
  const [result, setResult] = useState<{ created?: number; errors?: string[] } | null>(null);
  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      const res = await createRemitosBulk({
        desde: parseInt(fd.get("desde") as string),
        hasta: parseInt(fd.get("hasta") as string),
        delegacionId: fd.get("delegacionId") ? parseInt(fd.get("delegacionId") as string) : null,
      });
      if (res.error) {} else setResult(res);
    });
  };
  return (
    <ModalWrapper open={open} onClose={() => { onClose(); setResult(null); }} title="Carga Masiva de Remitos">
      {result ? (
        <div className="space-y-4">
          <div className="rounded-lg bg-emerald-50 p-4 dark:bg-emerald-950/30">
            <p className="text-sm font-medium text-emerald-700 dark:text-emerald-400">✅ {result.created} remitos creados</p>
          </div>
          {result.errors && result.errors.length > 0 && (
            <div className="rounded-lg bg-amber-50 p-4 dark:bg-amber-950/30">
              <p className="mb-2 text-sm font-medium text-amber-700 dark:text-amber-400">⚠️ Errores:</p>
              <ul className="list-disc pl-5 text-xs text-amber-600">{result.errors.map((e, i) => <li key={i}>{e}</li>)}</ul>
            </div>
          )}
          <button onClick={() => { onClose(); setResult(null); }} className={btnPrimary + " w-full justify-center"}>Cerrar</button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Desde Nro" id="desde"><input name="desde" id="desde" type="number" required className={inputStyles} /></FormField>
            <FormField label="Hasta Nro" id="hasta"><input name="hasta" id="hasta" type="number" required className={inputStyles} /></FormField>
          </div>
          <FormField label="Delegación" id="delegacionId">
            <select name="delegacionId" id="delegacionId" className={inputStyles}>
              <option value="">Sin asignar</option>
              {delegaciones.map((d) => <option key={d.id} value={d.id}>{d.nombre}</option>)}
            </select>
          </FormField>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className={btnSecondary}>Cancelar</button>
            <button type="submit" disabled={isPending} className={btnPrimary}>{isPending ? "Creando..." : "Crear remitos"}</button>
          </div>
        </form>
      )}
    </ModalWrapper>
  );
}

function EditRemitoModal({ remito, onClose, delegaciones }: { remito: Remito; onClose: () => void; delegaciones: Delegacion[] }) {
  const [isPending, startTransition] = useTransition();
  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      await updateRemito({
        id: remito.id,
        estado: fd.get("estado") as string,
        delegacionId: fd.get("delegacionId") ? parseInt(fd.get("delegacionId") as string) : null,
        observaciones: fd.get("observaciones") as string,
      });
      onClose();
    });
  };
  return (
    <ModalWrapper open={true} onClose={onClose} title={`Editar Remito #${remito.nrremito}`}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <FormField label="Estado" id="estado">
          <select name="estado" id="estado" defaultValue={remito.estado} className={inputStyles}>
            {remitoEstados.map((e) => <option key={e.value} value={e.value}>{e.label}</option>)}
          </select>
        </FormField>
        <FormField label="Delegación" id="delegacionId">
          <select name="delegacionId" id="delegacionId" defaultValue={remito.delegacion?.id || ""} className={inputStyles}>
            <option value="">Sin asignar</option>
            {delegaciones.map((d) => <option key={d.id} value={d.id}>{d.nombre}</option>)}
          </select>
        </FormField>
        <FormField label="Observaciones" id="observaciones">
          <textarea name="observaciones" id="observaciones" defaultValue={remito.observaciones || ""} className={inputStyles} rows={2} />
        </FormField>
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={onClose} className={btnSecondary}>Cancelar</button>
          <button type="submit" disabled={isPending} className={btnPrimary}>{isPending ? "Guardando..." : "Guardar"}</button>
        </div>
      </form>
    </ModalWrapper>
  );
}
