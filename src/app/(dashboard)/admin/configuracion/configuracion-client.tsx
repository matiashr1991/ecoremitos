"use client";

import { useState, useTransition } from "react";
import { setConfig } from "@/actions/configuracion.actions";
import { btnPrimary, FormField, inputStyles } from "@/components/shared/ui-components";
import { Save, AlertCircle } from "lucide-react";
import { useRouter } from "next/navigation";

interface Props {
  initialBloqueoActivo: boolean;
  initialFechaCorte: string;
}

export function ConfiguracionClient({ initialBloqueoActivo, initialFechaCorte }: Props) {
  const [bloqueoActivo, setBloqueoActivo] = useState(initialBloqueoActivo);
  const [fechaCorte, setFechaCorte] = useState(initialFechaCorte);
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const router = useRouter();

  const handleSave = () => {
    startTransition(async () => {
      setMessage(null);
      const res1 = await setConfig("BLOQUEO_ACTIVO", bloqueoActivo ? "true" : "false");
      const res2 = await setConfig("FECHA_CORTE_BLOQUEO", fechaCorte);

      if (res1.error || res2.error) {
        setMessage({ type: "error", text: "Error al guardar la configuración." });
      } else {
        setMessage({ type: "success", text: "Configuración guardada correctamente." });
        router.refresh();
      }
    });
  };

  return (
    <div className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl p-6 space-y-8">
      <div>
        <h2 className="text-lg font-medium text-zinc-900 dark:text-zinc-100 mb-4">
          Regla de Bloqueo por Falta de Rendición
        </h2>
        <div className="bg-zinc-50 dark:bg-zinc-900/50 p-4 rounded-lg border border-zinc-200 dark:border-zinc-800 space-y-6">
          
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={bloqueoActivo}
              onChange={(e) => setBloqueoActivo(e.target.checked)}
              className="mt-1 w-5 h-5 text-emerald-600 focus:ring-emerald-500 border-zinc-300 rounded"
            />
            <div>
              <span className="block font-medium text-zinc-900 dark:text-zinc-100">
                Habilitar Bloqueo de Operativa
              </span>
              <span className="block text-sm text-zinc-500 dark:text-zinc-400 mt-1">
                Si está activado, los titulares que tengan guías vencidas por más de 5 días hábiles no podrán recibir nuevas guías.
              </span>
            </div>
          </label>

          {bloqueoActivo && (
            <div className="pl-8 space-y-4">
              <FormField label="Fecha de Corte (Ignorar guías viejas)" id="fecha_corte">
                <input
                  id="fecha_corte"
                  type="date"
                  value={fechaCorte}
                  onChange={(e) => setFechaCorte(e.target.value)}
                  className={`${inputStyles} max-w-md`}
                />
              </FormField>
              
              <div className="flex items-start gap-2 text-sm text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30 p-3 rounded-md">
                <AlertCircle className="w-5 h-5 shrink-0" />
                <p>
                  Si establecés una fecha, <strong>SOLO</strong> las guías emitidas a partir de ese día generarán un bloqueo. 
                  Las guías emitidas antes de esa fecha se mostrarán como "Adeudadas" pero el productor podrá seguir operando.
                  Dejá el campo vacío para que <strong>TODAS</strong> las guías adeudadas generen bloqueo.
                </p>
              </div>
            </div>
          )}

        </div>
      </div>

      <div className="pt-4 border-t border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
        <div>
          {message && (
            <p className={`text-sm font-medium ${message.type === "success" ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`}>
              {message.text}
            </p>
          )}
        </div>
        <button
          onClick={handleSave}
          disabled={isPending}
          className={`${btnPrimary} min-w-[120px]`}
        >
          {isPending ? (
            "Guardando..."
          ) : (
            <>
              <Save className="w-4 h-4" /> Guardar
            </>
          )}
        </button>
      </div>
    </div>
  );
}
