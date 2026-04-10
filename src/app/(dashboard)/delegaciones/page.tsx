import { getDelegaciones } from "@/actions/delegaciones.actions";
import { DelegacionesClient } from "./delegaciones-client";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";

export default async function DelegacionesPage() {
  const delegaciones = await getDelegaciones();
  const session = await auth.api.getSession({ headers: await headers() });
  const userRole = (session?.user as any)?.role || "control";
  
  return <DelegacionesClient delegaciones={JSON.parse(JSON.stringify(delegaciones))} userRole={userRole} />;
}
