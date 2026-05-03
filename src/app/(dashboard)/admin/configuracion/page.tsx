import { getConfig } from "@/actions/configuracion.actions";
import { ConfiguracionClient } from "./configuracion-client";

export const metadata = {
  title: "Configuración Global | EcoRemitos",
};

export default async function ConfiguracionPage() {
  const bloqueoActivo = (await getConfig("BLOQUEO_ACTIVO")) === "true";
  const fechaCorteBloqueo = (await getConfig("FECHA_CORTE_BLOQUEO")) || "";

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
          Configuración Global
        </h1>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          Ajustes generales del sistema y reglas de negocio.
        </p>
      </div>

      <ConfiguracionClient
        initialBloqueoActivo={bloqueoActivo}
        initialFechaCorte={fechaCorteBloqueo}
      />
    </div>
  );
}
