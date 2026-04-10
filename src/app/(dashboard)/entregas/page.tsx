import { getDelegacionesEntregas, getEntregasHistory } from "@/actions/entregas.actions";
import { EntregasClient } from "./entregas-client";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Entregas | ECOREMITOS",
  description: "Gestión de reparto de talonarios a delegaciones",
};

export default async function EntregasPage() {
  const [delegaciones, history] = await Promise.all([
    getDelegacionesEntregas(),
    getEntregasHistory(),
  ]);

  return <EntregasClient delegaciones={delegaciones} initialHistory={history} />;
}
