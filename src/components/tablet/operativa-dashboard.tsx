"use client";

import { useState } from "react";
import { TabletWizard } from "./tablet-wizard";
import { RendirGuiaWizard } from "./rendir-guia-wizard";
import { FileCheck, FileOutput } from "lucide-react";

interface OperativaDashboardProps {
  remitos: any[];
}

export function OperativaDashboard({ remitos }: OperativaDashboardProps) {
  const [view, setView] = useState<"home" | "otorgar" | "rendir">("home");

  if (view === "otorgar") {
    return <TabletWizard remitos={remitos} onBack={() => setView("home")} />;
  }

  if (view === "rendir") {
    return <RendirGuiaWizard onBack={() => setView("home")} />;
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-8">
      <div className="text-center space-y-2 mb-8">
        <h2 className="text-3xl font-bold text-zinc-900 dark:text-zinc-50">
          Panel de Operativa
        </h2>
        <p className="text-zinc-500 dark:text-zinc-400">
          Seleccioná la acción que deseas realizar.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-3xl">
        <button
          onClick={() => setView("otorgar")}
          className="flex flex-col items-center justify-center gap-4 p-12 bg-white dark:bg-zinc-900 border-2 border-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 rounded-2xl transition-all shadow-sm hover:shadow-md group"
        >
          <div className="p-4 bg-emerald-100 dark:bg-emerald-900/50 rounded-full text-emerald-600 dark:text-emerald-400 group-hover:scale-110 transition-transform">
            <FileOutput className="w-12 h-12" />
          </div>
          <div className="text-center">
            <h3 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50 mb-2">Otorgar Guía</h3>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">Iniciar una nueva operación y vincular remitos</p>
          </div>
        </button>

        <button
          onClick={() => setView("rendir")}
          className="flex flex-col items-center justify-center gap-4 p-12 bg-white dark:bg-zinc-900 border-2 border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-950/30 rounded-2xl transition-all shadow-sm hover:shadow-md group"
        >
          <div className="p-4 bg-blue-100 dark:bg-blue-900/50 rounded-full text-blue-600 dark:text-blue-400 group-hover:scale-110 transition-transform">
            <FileCheck className="w-12 h-12" />
          </div>
          <div className="text-center">
            <h3 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50 mb-2">Rendir Guía</h3>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">Marcar una guía vencida como devuelta físicamente</p>
          </div>
        </button>
      </div>
    </div>
  );
}
