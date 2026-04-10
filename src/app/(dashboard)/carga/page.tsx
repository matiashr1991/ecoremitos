import { prisma } from "@/lib/db";
import { CargaClient } from "./carga-client";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Carga Manual | ECOREMITOS",
  description: "Sistema de carga de guías y remitos físicos",
};

export default async function CargaPage() {
  const delegaciones = await prisma.delegacion.findMany({
    where: { activa: true, deletedAt: null },
    orderBy: { nombre: "asc" },
    select: { id: true, nombre: true }
  });

  return <CargaClient delegaciones={delegaciones} />;
}
