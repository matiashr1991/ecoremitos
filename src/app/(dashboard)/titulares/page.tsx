import { getTitulares } from "@/actions/titulares.actions";
import { TitularesClient } from "./titulares-client";

export default async function TitularesPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; search?: string }>;
}) {
  const params = await searchParams;
  const page = parseInt(params.page || "1");
  const { titulares, total, pages } = await getTitulares({ search: params.search, page });

  return (
    <TitularesClient
      titulares={JSON.parse(JSON.stringify(titulares))}
      total={total}
      pages={pages}
      currentPage={page}
      currentSearch={params.search || ""}
    />
  );
}
