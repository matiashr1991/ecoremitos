"use client";

import { LogOut } from "lucide-react";
import { signOut } from "@/lib/auth-client";
import { useRouter } from "next/navigation";

export function TabletLogoutButton() {
  const router = useRouter();

  const handleSignOut = async () => {
    await signOut({
      fetchOptions: {
        onSuccess: () => {
          router.push("/login");
          router.refresh();
        },
      },
    });
  };

  return (
    <button
      onClick={handleSignOut}
      className="rounded-md p-2 text-zinc-500 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
      title="Cerrar sesión"
    >
      <LogOut className="h-5 w-5" />
    </button>
  );
}
