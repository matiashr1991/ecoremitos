import { getGuias } from "@/actions/guias.actions";
import { getDelegaciones } from "@/actions/delegaciones.actions";
import { GuiasClient } from "./guias-client";
import { requireAuth } from "@/lib/auth-guard";

export default async function GuiasPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; search?: string; estado?: string; delegacionId?: string }>;
}) {
  const params = await searchParams;
  const page = parseInt(params.page || "1");
  const { guias, total, pages } = await getGuias({
    page,
    search: params.search,
    estado: params.estado,
    delegacionId: params.delegacionId ? parseInt(params.delegacionId) : undefined,
  });

  const delegaciones = await getDelegaciones();
  const session = await requireAuth();

  return (
    <GuiasClient
      guias={JSON.parse(JSON.stringify(guias))}
      total={total}
      pages={pages}
      currentPage={page}
      delegaciones={JSON.parse(JSON.stringify(delegaciones))}
      currentRole={session.user.role}
      currentFilters={{
        search: params.search || "",
        estado: params.estado || "",
        delegacionId: params.delegacionId || "",
      }}
    />
  );
}
