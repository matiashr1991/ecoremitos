"use client";

import { useState } from "react";
import { ArrowLeft, CheckCircle2, Search, Loader2 } from "lucide-react";
import { rendirGuiaOperativa } from "@/actions/operativa.actions";
import { toast } from "sonner";

interface RendirGuiaWizardProps {
  onBack: () => void;
}

export function RendirGuiaWizard({ onBack }: RendirGuiaWizardProps) {
  const [nrguia, setNrguia] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nrguia) return;

    setLoading(true);
    try {
      const num = parseInt(nrguia, 10);
      const res = await rendirGuiaOperativa(num);

      if (res?.error) {
        toast.error(res.error);
      } else if (res?.success) {
        toast.success(res.mensaje);
        setSuccess(true);
      }
    } catch (error) {
      toast.error("Ocurrió un error al procesar la rendición.");
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="w-full max-w-2xl mx-auto mt-12">
        <div className="bg-white dark:bg-zinc-900 border border-emerald-200 dark:border-emerald-900/50 rounded-2xl p-8 text-center shadow-lg">
          <div className="flex justify-center mb-6">
            <div className="w-20 h-20 bg-emerald-100 dark:bg-emerald-900/30 rounded-full flex items-center justify-center text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="w-10 h-10" />
            </div>
          </div>
          <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50 mb-2">
            ¡Guía Rendida Exitosamente!
          </h2>
          <p className="text-zinc-500 dark:text-zinc-400 mb-8">
            La guía {nrguia} ha sido marcada como devuelta físicamente en la delegación. El titular ha sido desbloqueado.
          </p>
          <div className="flex justify-center gap-4">
            <button
              type="button"
              className="bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-900 dark:text-white px-6 py-3 rounded-xl text-lg font-medium transition-all"
              onClick={onBack}
            >
              Volver al Inicio
            </button>
            <button
              type="button"
              className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-3 rounded-xl text-lg font-medium shadow-md transition-all active:scale-95"
              onClick={() => {
                setNrguia("");
                setSuccess(false);
              }}
            >
              Rendir otra Guía
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <button 
          type="button"
          onClick={onBack} 
          className="p-2 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-zinc-700 dark:text-zinc-300" />
        </button>
        <div>
          <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
            Rendición de Guía Física
          </h2>
          <p className="text-zinc-500 dark:text-zinc-400 text-sm">
            Ingresá el número de la guía que el titular ha devuelto a la delegación.
          </p>
        </div>
      </div>

      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 shadow-sm">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <label htmlFor="nrguia" className="block text-base font-medium text-zinc-900 dark:text-zinc-100">
              Número de Guía
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400" />
              <input
                id="nrguia"
                type="number"
                placeholder="Ej. 12345"
                value={nrguia}
                onChange={(e) => setNrguia(e.target.value)}
                className="w-full text-lg pl-10 pr-4 py-3 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-transparent text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                autoFocus
                required
                min={1}
              />
            </div>
            <p className="text-xs text-zinc-500 mt-2">
              Se validará que la guía pertenezca a esta delegación y no haya sido rendida previamente.
            </p>
          </div>

          <div className="pt-4 flex justify-end">
            <button 
              type="submit" 
              disabled={!nrguia || loading} 
              className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl text-lg disabled:opacity-50 flex items-center justify-center gap-2 transition-all min-w-[150px]"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Procesando
                </>
              ) : (
                "Rendir Guía"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
