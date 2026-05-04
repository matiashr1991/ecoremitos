import { getTitulares } from "@/actions/titulares.actions";
import { TitularesClient } from "./titulares-client";

export default async function TitularesPage({
  searchParams,
}: {
  searchParams: Promise<{ 
    page?: string; 
    search?: string;
    hasGuias?: string;
    sortBy?: string;
    sortOrder?: string;
  }>;
}) {
  const params = await searchParams;
  const page = parseInt(params.page || "1");
  const hasGuias = params.hasGuias === "true";
  const sortBy = (params.sortBy as any) || "razonSocial";
  const sortOrder = (params.sortOrder as any) || "asc";

  const { titulares, total, pages } = await getTitulares({ 
    search: params.search, 
    page,
    hasGuias,
    sortBy,
    sortOrder
  });

  return (
    <TitularesClient
      titulares={JSON.parse(JSON.stringify(titulares))}
      total={total}
      pages={pages}
      currentPage={page}
      currentSearch={params.search || ""}
      currentHasGuias={hasGuias}
      currentSortBy={sortBy}
      currentSortOrder={sortOrder}
    />
  );
}
