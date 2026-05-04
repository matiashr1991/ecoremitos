"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { FileText, Plus, Search, MoreVertical, Pencil, Trash2, Package, Clock, Link2, Image as ImageIcon, MapPin, Download, ExternalLink } from "lucide-react";
import {
  StatusBadge, ModalWrapper, EmptyState, Pagination,
  SearchInput, SelectFilter, FormField, Badge,
  inputStyles, btnPrimary, btnSecondary, btnDanger,
} from "@/components/shared/ui-components";
import { createGuia, createGuiasBulk, updateGuia, deleteGuia, prorrogarGuia, blanquearGuia, resetearProrrogaGuia } from "@/actions/guias.actions";
import { previewVinculacionRemitos, vincularRemitosExactos } from "@/actions/remitos.actions";

type Guia = {
  id: number;
  nrguia: number;
  tipo: string;
  deposito: boolean;
  estado: string;
  destino: string | null;
  fechaEmision: string | null;
  fechaVencimiento: string | null;
  prorrogada: boolean;
  observaciones: string | null;
  delegacion: { id: number; nombre: string } | null;
  titular: { id: number; razonSocial: string; cuit: string } | null;
  _count: { remitos: number };
  remitos: { nrremito: number }[];
  imagenes: { id: number; filename: string; storagePath: string; latitude: number | null; longitude: number | null }[];
};

type Delegacion = { id: number; nombre: string };

const guiaEstadoOpciones = [
  { value: "en_blanco", label: "En blanco" },
  { value: "asignada", label: "Disponible" },
  { value: "vigente", label: "Vigente" },
  { value: "vencida", label: "Vencida" },
  { value: "intervenida", label: "Intervenida" },
  { value: "anulada", label: "Anulada" },
];

const guiaFiltroOpciones = [
  { value: "deposito", label: "Guías depósito" },
  { value: "normal", label: "Guías normales" },
  { value: "vencida", label: "Vencidas" },
  { value: "en_blanco", label: "En blanco" },
  { value: "asignada", label: "Disponible" },
  { value: "intervenida", label: "Intervenidas" },
];

export function GuiasClient({
  guias, total, pages, currentPage, delegaciones, currentFilters, currentRole,
}: {
  guias: Guia[];
  total: number;
  pages: number;
  currentPage: number;
  delegaciones: Delegacion[];
  currentRole: string;
  currentFilters: { search: string; estado: string; delegacionId: string };
}) {
  const router = useRouter();
  const [search, setSearch] = useState(currentFilters.search);
  const [estado, setEstado] = useState(currentFilters.estado);
  const [delegacionId, setDelegacionId] = useState(currentFilters.delegacionId);
  const [showCreate, setShowCreate] = useState(false);
  const [showBulk, setShowBulk] = useState(false);
  const [editGuia, setEditGuia] = useState<Guia | null>(null);
  const [vincularGuia, setVincularGuia] = useState<Guia | null>(null);
  const [viewPhotos, setViewPhotos] = useState<Guia | null>(null);
  const [actionMenu, setActionMenu] = useState<number | null>(null);

  const applyFilters = () => {
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (estado) params.set("estado", estado);
    if (delegacionId) params.set("delegacionId", delegacionId);
    router.push(`/guias?${params.toString()}`);
  };

  const handlePageChange = (p: number) => {
    const params = new URLSearchParams();
    params.set("page", p.toString());
    if (search) params.set("search", search);
    if (estado) params.set("estado", estado);
    if (delegacionId) params.set("delegacionId", delegacionId);
    router.push(`/guias?${params.toString()}`);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">Guías</h1>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            Gestión de guías de transporte forestal
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setShowBulk(true)} className={btnSecondary}>
            <Package className="h-4 w-4" />
            Carga masiva
          </button>
          <button onClick={() => setShowCreate(true)} className={btnPrimary}>
            <Plus className="h-4 w-4" />
            Nueva guía
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
        <SearchInput value={search} onChange={setSearch} placeholder="Buscar Nro guía..." />
        <SelectFilter
          value={estado}
          onChange={setEstado}
          options={guiaFiltroOpciones}
          placeholder="Todas"
        />
        <SelectFilter
          value={delegacionId}
          onChange={setDelegacionId}
          options={delegaciones.map((d) => ({ value: d.id.toString(), label: d.nombre }))}
          placeholder="Todas las delegaciones"
        />
        <button onClick={applyFilters} className={btnPrimary}>
          <Search className="h-4 w-4" /> Buscar
        </button>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
        {guias.length === 0 ? (
          <EmptyState
            icon={<FileText className="h-12 w-12" />}
            title="No hay guías"
            description="Creá una nueva guía o ajustá los filtros de búsqueda"
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900">
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">Nro</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">Estado</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">Tipo</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">Delegación</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">Titular</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">Destino</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">Remitos</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                {guias.map((guia) => {
                  const esDeposito = guia.tipo === "deposito" || guia.deposito;
                  const puedeProrrogar = !esDeposito && guia.estado === "vencida" && !guia.prorrogada && guia._count.remitos > 0;

                  return (
                  <tr key={guia.id} className="transition-colors hover:bg-zinc-50/50 dark:hover:bg-zinc-800/30">
                    <td className="whitespace-nowrap px-4 py-3 text-sm font-bold text-zinc-900 dark:text-zinc-100">
                      #{guia.nrguia}
                    </td>
                    <td className="px-4 py-3"><StatusBadge status={guia.estado} /></td>
                    <td className="px-4 py-3 text-sm text-zinc-600 dark:text-zinc-400 capitalize">{guia.tipo}</td>
                    <td className="px-4 py-3 text-sm text-zinc-600 dark:text-zinc-400">
                      {guia.delegacion?.nombre || "—"}
                    </td>
                    <td className="px-4 py-3 text-sm text-zinc-600 dark:text-zinc-400">
                      {guia.titular ? (
                        <div>
                          <div className="font-medium">{guia.titular.razonSocial}</div>
                          <div className="text-xs text-zinc-400">{guia.titular.cuit}</div>
                        </div>
                      ) : "—"}
                    </td>
                    <td className="px-4 py-3 text-sm text-zinc-600 dark:text-zinc-400">{guia.destino || "—"}</td>
                    <td className="px-4 py-3 text-sm min-w-[120px]">
                      <div className="flex flex-col gap-1">
                        <span className="inline-flex h-5 w-fit px-1.5 items-center justify-center rounded-full bg-zinc-100 text-[10px] font-bold text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
                          {guia._count.remitos} remitos
                        </span>
                        {guia.remitos.length > 0 && (
                          <div className="text-[10px] text-zinc-500 max-w-[150px] line-clamp-2">
                            {guia.remitos.map(r => r.nrremito).join(", ")}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="relative">
                        <button
                          onClick={() => setActionMenu(actionMenu === guia.id ? null : guia.id)}
                          className="rounded-lg p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
                        >
                          <MoreVertical className="h-4 w-4" />
                        </button>
                        {actionMenu === guia.id && (
                          <div className="absolute right-0 top-full z-20 mt-1 w-36 overflow-hidden rounded-lg border border-zinc-200 bg-white shadow-lg dark:border-zinc-700 dark:bg-zinc-800">
                            <button
                              onClick={() => { setEditGuia(guia); setActionMenu(null); }}
                              className="flex w-full items-center gap-2 px-3 py-2 text-sm text-zinc-700 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-700"
                            >
                              <Pencil className="h-3.5 w-3.5" /> Editar
                            </button>
                            <button
                              onClick={() => { setViewPhotos(guia); setActionMenu(null); }}
                              className="flex w-full items-center gap-2 px-3 py-2 text-sm text-blue-600 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-950/30"
                            >
                              <ImageIcon className="h-3.5 w-3.5" /> Ver Fotos
                            </button>
                            {puedeProrrogar && (
                              <button
                                onClick={async () => {
                                  if (confirm("¿Prorrogar esta guía por 30 días desde hoy?")) {
                                    await prorrogarGuia(guia.id);
                                    setActionMenu(null);
                                  }
                                }}
                                className="flex w-full items-center gap-2 px-3 py-2 text-sm text-blue-600 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-950/30"
                              >
                                <Clock className="h-3.5 w-3.5" /> Prorrogar
                              </button>
                            )}
                            {currentRole === "admin" && guia.prorrogada && !esDeposito && (
                              <button
                                onClick={async () => {
                                  if (confirm("Esto va a habilitar nuevamente la prórroga única para esta guía. ¿Continuar?")) {
                                    const res = await resetearProrrogaGuia(guia.id);
                                    if (res.error) {
                                      alert(res.error);
                                    }
                                    setActionMenu(null);
                                  }
                                }}
                                className="flex w-full items-center gap-2 px-3 py-2 text-sm text-amber-700 hover:bg-amber-50 dark:text-amber-400 dark:hover:bg-amber-950/30"
                              >
                                <Clock className="h-3.5 w-3.5" /> Reset Prórroga
                              </button>
                            )}
                            {!esDeposito && (
                              <button
                                onClick={() => { setVincularGuia(guia); setActionMenu(null); }}
                                className="flex w-full items-center gap-2 px-3 py-2 text-sm text-emerald-600 hover:bg-emerald-50 dark:text-emerald-400 dark:hover:bg-emerald-950/30"
                              >
                                <Link2 className="h-3.5 w-3.5" /> Asignar Remitos
                              </button>
                            )}
                            <button
                              onClick={async () => {
                                if (
                                  confirm(
                                    `Vas a blanquear la guía #${guia.nrguia}.\n\nEsto desvincula sus remitos y limpia titular/fechas/datos operativos.\n\n¿Continuar?`
                                  )
                                ) {
                                  const res = await blanquearGuia(guia.id);
                                  if (res.error) {
                                    alert(res.error);
                                  }
                                  setActionMenu(null);
                                }
                              }}
                              className="flex w-full items-center gap-2 px-3 py-2 text-sm text-amber-600 hover:bg-amber-50 dark:text-amber-400 dark:hover:bg-amber-950/30"
                            >
                              <Package className="h-3.5 w-3.5" /> Blanquear
                            </button>
                            <div className="my-1 border-t border-zinc-200 dark:border-zinc-700" />
                            <button
                              onClick={async () => {
                                if (confirm("¿Eliminar esta guía?")) {
                                  await deleteGuia(guia.id);
                                  setActionMenu(null);
                                }
                              }}
                              className="flex w-full items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/30"
                            >
                              <Trash2 className="h-3.5 w-3.5" /> Eliminar
                            </button>
                          </div>
                        )}
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

      <Pagination page={currentPage} pages={pages} total={total} onPageChange={handlePageChange} />

      {/* Create modal */}
      <CreateGuiaModal open={showCreate} onClose={() => setShowCreate(false)} delegaciones={delegaciones} />
      <BulkGuiasModal open={showBulk} onClose={() => setShowBulk(false)} delegaciones={delegaciones} />
      {editGuia && (
        <EditGuiaModal guia={editGuia} onClose={() => setEditGuia(null)} delegaciones={delegaciones} />
      )}
      {vincularGuia && (
        <VincularRemitosModal guia={vincularGuia} onClose={() => setVincularGuia(null)} />
      )}
      {viewPhotos && (
        <ViewPhotosModal guia={viewPhotos} onClose={() => setViewPhotos(null)} />
      )}
    </div>
  );
}

function CreateGuiaModal({ open, onClose, delegaciones }: { open: boolean; onClose: () => void; delegaciones: Delegacion[] }) {
  const [isPending, startTransition] = useTransition();
  const [errors, setErrors] = useState<Record<string, string[]>>({});

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      const result = await createGuia({
        nrguia: parseInt(fd.get("nrguia") as string),
        tipo: fd.get("tipo") as string,
        delegacionId: fd.get("delegacionId") ? parseInt(fd.get("delegacionId") as string) : null,
        destino: fd.get("destino") as string,
        fechaEmision: fd.get("fechaEmision") as string,
        fechaVencimiento: fd.get("fechaVencimiento") as string,
        observaciones: fd.get("observaciones") as string,
      });
      if (result.error) setErrors(result.error as Record<string, string[]>);
      else onClose();
    });
  };

  return (
    <ModalWrapper open={open} onClose={onClose} title="Nueva Guía">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <FormField label="Nro Guía" id="nrguia" error={errors.nrguia}>
            <input name="nrguia" id="nrguia" type="number" required className={inputStyles} placeholder="1234" />
          </FormField>
          <FormField label="Tipo" id="tipo">
            <select name="tipo" id="tipo" className={inputStyles}>
              <option value="normal">Normal</option>
              <option value="deposito">Depósito</option>
            </select>
          </FormField>
        </div>
        <FormField label="Delegación" id="delegacionId">
          <select name="delegacionId" id="delegacionId" className={inputStyles}>
            <option value="">Sin asignar</option>
            {delegaciones.map((d) => <option key={d.id} value={d.id}>{d.nombre}</option>)}
          </select>
        </FormField>
        <FormField label="Destino" id="destino">
          <input name="destino" id="destino" className={inputStyles} placeholder="Ciudad, Provincia" />
        </FormField>
        <div className="grid grid-cols-2 gap-4">
          <FormField label="Fecha Emisión" id="fechaEmision">
            <input name="fechaEmision" id="fechaEmision" type="date" className={inputStyles} />
          </FormField>
          <FormField label="Fecha Vencimiento" id="fechaVencimiento">
            <input name="fechaVencimiento" id="fechaVencimiento" type="date" className={inputStyles} />
          </FormField>
        </div>
        <FormField label="Observaciones" id="observaciones">
          <textarea name="observaciones" id="observaciones" className={inputStyles} rows={2} />
        </FormField>
        {errors._form && <p className="text-sm text-red-500">{errors._form[0]}</p>}
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={onClose} className={btnSecondary}>Cancelar</button>
          <button type="submit" disabled={isPending} className={btnPrimary}>
            {isPending ? "Creando..." : "Crear guía"}
          </button>
        </div>
      </form>
    </ModalWrapper>
  );
}

function BulkGuiasModal({ open, onClose, delegaciones }: { open: boolean; onClose: () => void; delegaciones: Delegacion[] }) {
  const [isPending, startTransition] = useTransition();
  const [result, setResult] = useState<{ created?: number; errors?: string[] } | null>(null);
  const [errors, setErrors] = useState<Record<string, string[]>>({});

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      const res = await createGuiasBulk({
        desde: parseInt(fd.get("desde") as string),
        hasta: parseInt(fd.get("hasta") as string),
        delegacionId: fd.get("delegacionId") ? parseInt(fd.get("delegacionId") as string) : null,
      });
      if (res.error) setErrors(res.error as Record<string, string[]>);
      else setResult(res);
    });
  };

  return (
    <ModalWrapper open={open} onClose={() => { onClose(); setResult(null); }} title="Carga Masiva de Guías">
      {result ? (
        <div className="space-y-4">
          <div className="rounded-lg bg-emerald-50 p-4 dark:bg-emerald-950/30">
            <p className="text-sm font-medium text-emerald-700 dark:text-emerald-400">
              ✅ {result.created} guías creadas correctamente
            </p>
          </div>
          {result.errors && result.errors.length > 0 && (
            <div className="rounded-lg bg-amber-50 p-4 dark:bg-amber-950/30">
              <p className="mb-2 text-sm font-medium text-amber-700 dark:text-amber-400">⚠️ Errores:</p>
              <ul className="list-disc pl-5 text-xs text-amber-600 dark:text-amber-400">
                {result.errors.map((e, i) => <li key={i}>{e}</li>)}
              </ul>
            </div>
          )}
          <button onClick={() => { onClose(); setResult(null); }} className={btnPrimary + " w-full justify-center"}>
            Cerrar
          </button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Desde Nro" id="desde" error={errors.desde}>
              <input name="desde" id="desde" type="number" required className={inputStyles} placeholder="1" />
            </FormField>
            <FormField label="Hasta Nro" id="hasta" error={errors.hasta}>
              <input name="hasta" id="hasta" type="number" required className={inputStyles} placeholder="100" />
            </FormField>
          </div>
          <FormField label="Delegación" id="delegacionId">
            <select name="delegacionId" id="delegacionId" className={inputStyles}>
              <option value="">Sin asignar</option>
              {delegaciones.map((d) => <option key={d.id} value={d.id}>{d.nombre}</option>)}
            </select>
          </FormField>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className={btnSecondary}>Cancelar</button>
            <button type="submit" disabled={isPending} className={btnPrimary}>
              {isPending ? "Creando..." : "Crear guías"}
            </button>
          </div>
        </form>
      )}
    </ModalWrapper>
  );
}

function EditGuiaModal({ guia, onClose, delegaciones }: { guia: Guia; onClose: () => void; delegaciones: Delegacion[] }) {
  const [isPending, startTransition] = useTransition();
  const [errors, setErrors] = useState<Record<string, string[]>>({});

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      const result = await updateGuia({
        id: guia.id,
        estado: fd.get("estado") as string,
        tipo: fd.get("tipo") as string,
        delegacionId: fd.get("delegacionId") ? parseInt(fd.get("delegacionId") as string) : null,
        destino: fd.get("destino") as string,
        fechaEmision: fd.get("fechaEmision") as string,
        fechaVencimiento: fd.get("fechaVencimiento") as string,
        observaciones: fd.get("observaciones") as string,
      });
      if (result.error) setErrors(result.error as Record<string, string[]>);
      else onClose();
    });
  };

  const fmt = (d: string | null) => d ? new Date(d).toISOString().split("T")[0] : "";

  return (
    <ModalWrapper open={true} onClose={onClose} title={`Editar Guía #${guia.nrguia}`}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <FormField label="Estado" id="estado">
            <select name="estado" id="estado" defaultValue={guia.estado} className={inputStyles}>
              {guiaEstadoOpciones.map((e) => (
                <option key={e.value} value={e.value}>{e.label}</option>
              ))}
            </select>
          </FormField>
          <FormField label="Tipo" id="tipo">
            <select name="tipo" id="tipo" defaultValue={guia.tipo} className={inputStyles}>
              <option value="normal">Normal</option>
              <option value="deposito">Depósito</option>
            </select>
          </FormField>
        </div>
        <FormField label="Delegación" id="delegacionId">
          <select name="delegacionId" id="delegacionId" defaultValue={guia.delegacion?.id || ""} className={inputStyles}>
            <option value="">Sin asignar</option>
            {delegaciones.map((d) => <option key={d.id} value={d.id}>{d.nombre}</option>)}
          </select>
        </FormField>
        <FormField label="Destino" id="destino">
          <input name="destino" id="destino" defaultValue={guia.destino || ""} className={inputStyles} />
        </FormField>
        <div className="grid grid-cols-2 gap-4">
          <FormField label="Fecha Emisión" id="fechaEmision">
            <input name="fechaEmision" id="fechaEmision" type="date" defaultValue={fmt(guia.fechaEmision)} className={inputStyles} />
          </FormField>
          <FormField label="Fecha Vencimiento" id="fechaVencimiento">
            <input name="fechaVencimiento" id="fechaVencimiento" type="date" defaultValue={fmt(guia.fechaVencimiento)} className={inputStyles} />
          </FormField>
        </div>
        <FormField label="Observaciones" id="observaciones">
          <textarea name="observaciones" id="observaciones" defaultValue={guia.observaciones || ""} className={inputStyles} rows={2} />
        </FormField>
        {errors._form && <p className="text-sm text-red-500">{errors._form[0]}</p>}
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={onClose} className={btnSecondary}>Cancelar</button>
          <button type="submit" disabled={isPending} className={btnPrimary}>
            {isPending ? "Guardando..." : "Guardar cambios"}
          </button>
        </div>
      </form>
    </ModalWrapper>
  );
}

function VincularRemitosModal({ guia, onClose }: { guia: Guia; onClose: () => void }) {
  const [isPending, startTransition] = useTransition();
  const [numerosText, setNumerosText] = useState("");
  const [preview, setPreview] = useState<{numero: number; status: string; message: string}[] | null>(null);
  const [generalError, setGeneralError] = useState("");

  const parseNumbers = (text: string) => {
    const raw = text.split(/[\s,-]+/).filter(Boolean);
    const nums: number[] = [];
    
    // We can support simple ranges like '100-105'
    text.split(/[\s,]+/).filter(Boolean).forEach(part => {
      if (part.includes('-')) {
        const [start, end] = part.split('-').map(Number);
        if (!isNaN(start) && !isNaN(end) && start <= end) {
          for (let i = start; i <= end; i++) nums.push(i);
        }
      } else {
        const val = parseInt(part);
        if (!isNaN(val)) nums.push(val);
      }
    });
    
    return Array.from(new Set(nums)).sort((a,b) => a - b);
  };

  const handlePreview = async () => {
    if (!guia.delegacion) {
      setGeneralError("La guía no tiene una delegación asignada.");
      return;
    }
    const nums = parseNumbers(numerosText);
    if (nums.length === 0) return;
    
    setGeneralError("");
    setPreview(null);
    const res = await previewVinculacionRemitos(nums, guia.delegacion.id);
    setPreview(res);
  };

  const handleVinculacion = () => {
    if (!preview) return;
    const validos = preview.filter(p => p.status === "ok").map(p => p.numero);
    if (validos.length === 0) return;

    startTransition(async () => {
      const res = await vincularRemitosExactos(guia.id, validos);
      if (res.error) {
        setGeneralError(res.error as string);
      } else {
        onClose();
      }
    });
  };

  const okCount = preview ? preview.filter(p => p.status === "ok").length : 0;

  return (
    <ModalWrapper open={true} onClose={onClose} title={`Asignar Remitos a Guía #${guia.nrguia}`}>
      <div className="space-y-4">
        {guia.delegacion ? (
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            Los remitos deben corresponder a la delegación <strong className="text-zinc-900 dark:text-zinc-200">{guia.delegacion.nombre}</strong>.
            Puedes ingresar números sueltos o rangos separados por comas o espacios.
            <br/><span className="text-xs text-zinc-500">Ejemplo: <code className="bg-zinc-100 dark:bg-zinc-800 px-1 rounded">77889, 77890-77895, 77900</code></span>
          </p>
        ) : (
          <div className="rounded-md bg-red-50 p-4 dark:bg-red-950/30">
             <p className="text-sm text-red-600 dark:text-red-400 font-medium pb-1">Error de Delegación</p>
             <p className="text-xs text-red-500 dark:text-red-400">Debes editar la guía y asignarle una Delegación antes de poder vincular remitos físicos a la misma.</p>
          </div>
        )}

        <textarea 
          disabled={!guia.delegacion || isPending}
          value={numerosText}
          onChange={(e) => { setNumerosText(e.target.value); setPreview(null); }}
          className={inputStyles} 
          rows={4}
          placeholder="Ej: 100, 101, 105-110"
        />

        {preview && (
          <div className="mt-4 rounded-xl border border-zinc-200 dark:border-zinc-800 overflow-hidden max-h-52 overflow-y-auto bg-zinc-50 dark:bg-zinc-900">
            <table className="w-full text-sm">
              <thead className="bg-zinc-100 dark:bg-zinc-800 sticky top-0">
                <tr>
                  <th className="px-3 py-2 text-left font-semibold text-zinc-600 dark:text-zinc-300">Nro Remito</th>
                  <th className="px-3 py-2 text-left font-semibold text-zinc-600 dark:text-zinc-300">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                {preview.map(p => (
                  <tr key={p.numero}>
                    <td className="px-3 py-2 font-medium">{p.numero}</td>
                    <td className="px-3 py-2">
                       {p.status === "ok" && <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-1 font-medium">✅ {p.message}</span>}
                       {p.status === "warning" && <span className="text-amber-600 dark:text-amber-400 flex items-center gap-1 font-medium">⚠️ {p.message}</span>}
                       {p.status === "error" && <span className="text-red-600 dark:text-red-400 flex items-center gap-1 font-medium">❌ {p.message}</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {generalError && <p className="text-sm text-red-500">{generalError}</p>}

        <div className="flex justify-end gap-2 pt-4">
          <button type="button" onClick={onClose} className={btnSecondary} disabled={isPending}>Cancelar</button>
          {!preview ? (
            <button 
               type="button" 
               className={btnPrimary} 
               onClick={handlePreview}
               disabled={numerosText.trim() === "" || !guia.delegacion}
            >
              Consultar números
            </button>
          ) : (
            <button 
              type="button" 
              className={btnPrimary} 
              disabled={isPending || okCount === 0}
              onClick={handleVinculacion}
            >
              {isPending ? "Vinculando..." : `Vincular ${okCount} remitos`}
            </button>
          )}
        </div>
      </div>
    </ModalWrapper>
  );
}

function ViewPhotosModal({ guia, onClose }: { guia: Guia; onClose: () => void }) {
  return (
    <ModalWrapper open={true} onClose={onClose} title={`Fotos de Guía #${guia.nrguia}`} maxWidthClass="max-w-5xl">
      <div className="space-y-6">
        {guia.imagenes && guia.imagenes.length > 0 ? (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3 max-h-[70vh] overflow-y-auto pr-1">
            {guia.imagenes.map((img) => {
              const imgSrc = img.storagePath.startsWith("/api/uploads/")
                ? img.storagePath
                : img.storagePath.replace(/^\/uploads\//, "/api/uploads/");
              return (
              <div key={img.id} className="group relative overflow-hidden rounded-xl border border-zinc-200 bg-zinc-100 dark:border-zinc-800 dark:bg-zinc-900">
                <div className="aspect-[4/3] relative flex items-center justify-center bg-zinc-200 dark:bg-zinc-950">
                  <img 
                    src={imgSrc} 
                    alt={img.filename} 
                    className="h-full w-full object-contain"
                  />
                </div>
                <div className="bg-white/90 p-3 backdrop-blur-sm dark:bg-zinc-950/90">
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate text-xs font-medium text-zinc-700 dark:text-zinc-300">
                      {img.filename}
                    </span>
                    {img.latitude && img.longitude ? (
                      <Badge variant="outline" className="h-6 gap-1 border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-900/50 dark:bg-blue-950/50 dark:text-blue-400">
                        <MapPin className="h-3 w-3" />
                        GPS OK
                      </Badge>
                    ) : (
                      <span className="text-[10px] text-zinc-400">Sin GPS</span>
                    )}
                  </div>
                  {img.latitude && img.longitude && (
                    <div className="mt-2 flex flex-col gap-1 rounded-lg bg-zinc-100 p-2 text-[10px] dark:bg-zinc-900">
                      <div className="flex justify-between">
                        <span className="text-zinc-500">Latitud:</span>
                        <span className="font-mono font-medium">{img.latitude.toFixed(6)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-zinc-500">Longitud:</span>
                        <span className="font-mono font-medium">{img.longitude.toFixed(6)}</span>
                      </div>
                      <a
                        href={`https://www.google.com/maps?q=${img.latitude},${img.longitude}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-1 inline-flex items-center justify-center gap-1 text-center font-bold text-blue-600 hover:underline dark:text-blue-400"
                      >
                        <ExternalLink className="h-3 w-3" /> Ver en Google Maps
                      </a>
                    </div>
                  )}
                  <div className="mt-3 flex items-center gap-2">
                    <a
                      href={imgSrc}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex flex-1 items-center justify-center gap-1 rounded-md border border-zinc-300 px-2 py-1 text-xs font-medium text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
                    >
                      <ExternalLink className="h-3 w-3" /> Ver grande
                    </a>
                    <a
                      href={imgSrc}
                      download={img.filename}
                      className="inline-flex flex-1 items-center justify-center gap-1 rounded-md bg-emerald-600 px-2 py-1 text-xs font-semibold text-white hover:bg-emerald-700"
                    >
                      <Download className="h-3 w-3" /> Descargar
                    </a>
                  </div>
                </div>
              </div>
              );
            })}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="mb-4 rounded-full bg-zinc-100 p-4 dark:bg-zinc-900">
              <ImageIcon className="h-8 w-8 text-zinc-400" />
            </div>
            <h3 className="text-lg font-medium text-zinc-900 dark:text-zinc-100">Sin fotos cargadas</h3>
            <p className="max-w-[250px] text-sm text-zinc-500">Esta guía aún no tiene imágenes asociadas para visualizar.</p>
          </div>
        )}
        <div className="flex justify-end pt-2">
          <button onClick={onClose} className={btnPrimary}>Cerrar</button>
        </div>
      </div>
    </ModalWrapper>
  );
}
