"use client";

import { useRouter } from "next/navigation";
import { ClipboardList, Search } from "lucide-react";
import { EmptyState, Pagination, SearchInput, SelectFilter, ModalWrapper } from "@/components/shared/ui-components";
import { useMemo, useState } from "react";
import { exportAuditLogCsv } from "@/actions/admin.actions";

type AuditLog = {
  id: number;
  action: string;
  entity: string;
  entityType?: string | null;
  entityId: string | null;
  oldValues?: unknown;
  newValues?: unknown;
  ipAddress: string | null;
  userAgent?: string | null;
  createdAt: string;
  user: { name: string; email: string } | null;
};

function actionColor(action: string) {
  if (action.startsWith("CREATE")) return "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400";
  if (action.startsWith("UPDATE") || action.startsWith("PRORROGAR") || action.startsWith("RESETEAR")) return "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400";
  if (action.startsWith("DELETE") || action.startsWith("BLANQUEAR")) return "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400";
  if (action.startsWith("CRON")) return "bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-400";
  return "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300";
}

export function AuditLogClient({
  logs, total, pages, currentPage, currentFilters,
}: {
  logs: AuditLog[]; total: number; pages: number; currentPage: number;
  currentFilters: { search: string; action: string; entityType: string };
}) {
  const router = useRouter();
  const [search, setSearch] = useState(currentFilters.search);
  const [action, setAction] = useState(currentFilters.action);
  const [entityType, setEntityType] = useState(currentFilters.entityType);
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);
  const [exporting, setExporting] = useState(false);

  const actionOptions = useMemo(() => {
    const values = Array.from(new Set(logs.map((l) => l.action))).sort();
    return values.map((v) => ({ value: v, label: v }));
  }, [logs]);

  const entityOptions = useMemo(() => {
    const values = Array.from(new Set(logs.map((l) => l.entityType || l.entity).filter(Boolean) as string[])).sort();
    return values.map((v) => ({ value: v, label: v }));
  }, [logs]);

  const applyFilters = () => {
    const params = new URLSearchParams();
    params.set("page", "1");
    if (search) params.set("search", search);
    if (action) params.set("action", action);
    if (entityType) params.set("entityType", entityType);
    router.push(`/admin/audit-log?${params.toString()}`);
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      const res = await exportAuditLogCsv({ search, action, entityType });
      const blob = new Blob([res.content], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", res.filename);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } finally {
      setExporting(false);
    }
  };

  const handlePageChange = (p: number) => {
    const params = new URLSearchParams();
    params.set("page", String(p));
    if (search) params.set("search", search);
    if (action) params.set("action", action);
    if (entityType) params.set("entityType", entityType);
    router.push(`/admin/audit-log?${params.toString()}`);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
          Registro de Auditoría
        </h1>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          Historial de acciones realizadas en el sistema
        </p>
      </div>

      <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
        <div className="flex flex-wrap items-center gap-3 border-b border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-900">
          <SearchInput value={search} onChange={setSearch} placeholder="Buscar por acción, entidad o usuario..." />
          <SelectFilter value={action} onChange={setAction} options={actionOptions} placeholder="Todas las acciones" />
          <SelectFilter value={entityType} onChange={setEntityType} options={entityOptions} placeholder="Todas las entidades" />
          <button onClick={applyFilters} className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700">
            <Search className="h-4 w-4" /> Buscar
          </button>
          <button
            onClick={handleExport}
            disabled={exporting}
            className="inline-flex items-center gap-2 rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm font-semibold text-zinc-700 hover:bg-zinc-100 disabled:opacity-60 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800"
          >
            {exporting ? "Exportando..." : "Exportar CSV"}
          </button>
        </div>
        {logs.length === 0 ? (
          <EmptyState
            icon={<ClipboardList className="h-12 w-12" />}
            title="Sin registros"
            description="El registro de auditoría se irá completando con las acciones de los usuarios"
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900">
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-zinc-500">Fecha</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-zinc-500">Usuario</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-zinc-500">Acción</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-zinc-500">Entidad</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-zinc-500">ID</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-zinc-500">Detalle</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                {logs.map((log) => (
                  <tr key={log.id} className="transition-colors hover:bg-zinc-50/50 dark:hover:bg-zinc-800/30">
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-zinc-600 dark:text-zinc-400">
                      {new Date(log.createdAt).toLocaleString("es-AR")}
                    </td>
                    <td className="px-4 py-3 text-sm text-zinc-700 dark:text-zinc-300">
                      <div className="flex flex-col">
                        <span>{log.user?.name || "Sistema"}</span>
                        <span className="text-xs text-zinc-500">{log.user?.email || "Proceso automático"}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${actionColor(log.action)}`}>
                        {log.action}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-zinc-600 dark:text-zinc-400">{log.entityType || log.entity || "—"}</td>
                    <td className="px-4 py-3 text-sm font-mono text-zinc-500 dark:text-zinc-400">{log.entityId || "—"}</td>
                    <td className="px-4 py-3 text-sm text-zinc-500 dark:text-zinc-400">
                      <button
                        onClick={() => setSelectedLog(log)}
                        className="rounded-md border border-zinc-300 px-2 py-1 text-xs font-medium text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
                      >
                        Ver detalle
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <ModalWrapper
        open={!!selectedLog}
        onClose={() => setSelectedLog(null)}
        title={selectedLog ? `Auditoría #${selectedLog.id} - ${selectedLog.action}` : "Detalle"}
        maxWidthClass="max-w-4xl"
      >
        {selectedLog && (
          <div className="space-y-4 text-sm">
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-3 dark:border-zinc-800 dark:bg-zinc-900">
                <p><strong>Fecha:</strong> {new Date(selectedLog.createdAt).toLocaleString("es-AR")}</p>
                <p><strong>Usuario:</strong> {selectedLog.user?.email || "Sistema"}</p>
                <p><strong>Entidad:</strong> {selectedLog.entityType || selectedLog.entity || "—"}</p>
                <p><strong>Entity ID:</strong> {selectedLog.entityId || "—"}</p>
              </div>
              <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-3 dark:border-zinc-800 dark:bg-zinc-900">
                <p><strong>IP:</strong> {selectedLog.ipAddress || "—"}</p>
                <p><strong>User Agent:</strong> {selectedLog.userAgent || "—"}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <p className="mb-1 font-semibold text-zinc-700 dark:text-zinc-300">Old Values</p>
                <pre className="max-h-72 overflow-auto rounded-lg border border-zinc-200 bg-zinc-950 p-3 text-xs text-zinc-100 dark:border-zinc-800">
                  {JSON.stringify(selectedLog.oldValues ?? null, null, 2)}
                </pre>
              </div>
              <div>
                <p className="mb-1 font-semibold text-zinc-700 dark:text-zinc-300">New Values</p>
                <pre className="max-h-72 overflow-auto rounded-lg border border-zinc-200 bg-zinc-950 p-3 text-xs text-zinc-100 dark:border-zinc-800">
                  {JSON.stringify(selectedLog.newValues ?? null, null, 2)}
                </pre>
              </div>
            </div>
          </div>
        )}
      </ModalWrapper>

      <Pagination page={currentPage} pages={pages} total={total} onPageChange={handlePageChange} />
    </div>
  );
}
