import { getUsers } from "@/actions/admin.actions";
import { getDelegaciones } from "@/actions/delegaciones.actions";
import { AdminClient } from "./admin-client";

export default async function AdminPage() {
  const users = await getUsers();
  const delegaciones = await getDelegaciones();

  return (
    <AdminClient
      users={JSON.parse(JSON.stringify(users))}
      delegaciones={JSON.parse(JSON.stringify(delegaciones))}
    />
  );
}
