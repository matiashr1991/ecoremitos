import { getUsers } from "@/actions/usuarios.actions";
import { getDelegaciones } from "@/actions/delegaciones.actions";
import { requireRole } from "@/lib/auth-guard";
import { UsuariosClient } from "./usuarios-client";

export default async function UsuariosPage() {
  await requireRole("admin");
  const { users } = await getUsers();
  const delegaciones = await getDelegaciones();

  return (
    <UsuariosClient 
      users={JSON.parse(JSON.stringify(users))} 
      delegaciones={JSON.parse(JSON.stringify(delegaciones))} 
    />
  );
}
