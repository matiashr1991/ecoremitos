import { getRemitos } from "@/actions/remitos.actions";
import { getDelegaciones } from "@/actions/delegaciones.actions";
import { RemitosClient } from "./remitos-client";

export default async function RemitosPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; search?: string; estado?: string; delegacionId?: string }>;
}) {
  const params = await searchParams;
  const page = parseInt(params.page || "1");
  const { remitos, total, pages } = await getRemitos({
    page,
    search: params.search,
    estado: params.estado,
    delegacionId: params.delegacionId ? parseInt(params.delegacionId) : undefined,
  });
  const delegaciones = await getDelegaciones();

  return (
    <RemitosClient
      remitos={JSON.parse(JSON.stringify(remitos))}
      total={total}
      pages={pages}
      currentPage={page}
      delegaciones={JSON.parse(JSON.stringify(delegaciones))}
      currentFilters={{
        search: params.search || "",
        estado: params.estado || "",
        delegacionId: params.delegacionId || "",
      }}
    />
  );
}
