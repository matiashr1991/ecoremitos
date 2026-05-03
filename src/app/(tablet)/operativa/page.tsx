import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { prisma } from "@/lib/db";
import { OperativaDashboard } from "@/components/tablet/operativa-dashboard";

export default async function OperativaTabletPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user?.delegacionId) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center text-zinc-500">
        <h2 className="text-xl font-semibold mb-2">Acceso Denegado</h2>
        <p>Tu usuario no tiene asociada una delegación operativa válida.</p>
      </div>
    );
  }

  const delegacionId = session.user.delegacionId;

  // 1. Fetch available Remitos for the delegation
  const remitosDisponibles = await prisma.remito.findMany({
    where: {
      delegacionId,
      estado: "disponible",
      deletedAt: null,
    },
    select: {
      id: true,
      nrremito: true,
    },
    orderBy: { nrremito: "asc" },
  });

  return (
    <div className="w-full">
      <OperativaDashboard remitos={remitosDisponibles} />
    </div>
  );
}
