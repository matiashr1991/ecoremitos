import { getAuditLog } from "@/actions/admin.actions";
import { AuditLogClient } from "./audit-log-client";

export default async function AuditLogPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; search?: string; action?: string; entityType?: string }>;
}) {
  const params = await searchParams;
  const page = parseInt(params.page || "1");
  const { logs, total, pages } = await getAuditLog({
    page,
    search: params.search,
    action: params.action,
    entityType: params.entityType,
  });

  return (
    <AuditLogClient
      logs={JSON.parse(JSON.stringify(logs))}
      total={total}
      pages={pages}
      currentPage={page}
      currentFilters={{
        search: params.search || "",
        action: params.action || "",
        entityType: params.entityType || "",
      }}
    />
  );
}
