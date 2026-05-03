"use client";

import { useSession, signOut } from "@/lib/auth-client";
import { ThemeToggle } from "./theme-toggle";
import { LogOut, User, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useRef, useEffect } from "react";

export function Navbar() {
  const { data: session, isPending } = useSession();
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

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
    <header className="relative z-50 flex h-16 items-center justify-between border-b border-zinc-200 bg-white/80 px-6 backdrop-blur-sm dark:border-zinc-800 dark:bg-zinc-950/80">
      <div>
        <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50 tracking-tight">
          ECOREMITOS <span className="text-zinc-400 font-normal ml-2">| Fiscalización y Trazabilidad</span>
        </h2>
      </div>

      <div className="flex items-center gap-3">
        <ThemeToggle />

        {isPending ? (
          <Loader2 className="h-5 w-5 animate-spin text-zinc-400" />
        ) : session?.user ? (
          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="flex items-center gap-2 rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm transition-colors hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800 dark:hover:bg-zinc-700"
            >
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-emerald-500 to-green-600 text-xs font-bold text-white">
                {session.user.name?.charAt(0).toUpperCase() || "U"}
              </div>
              <div className="hidden text-left md:block">
                <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                  {session.user.name}
                </p>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  {(session.user as Record<string, unknown>).role as string || "usuario"}
                </p>
              </div>
            </button>

            {menuOpen && (
              <div className="absolute right-0 top-full z-50 mt-2 w-48 overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-lg dark:border-zinc-700 dark:bg-zinc-800">
                <div className="border-b border-zinc-100 px-4 py-3 dark:border-zinc-700">
                  <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                    {session.user.name}
                  </p>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">
                    {session.user.email}
                  </p>
                </div>
                <div className="p-1">
                  <button className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-zinc-600 transition-colors hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-700">
                    <User className="h-4 w-4" />
                    Perfil
                  </button>
                  <button
                    onClick={handleSignOut}
                    className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-red-600 transition-colors hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/30"
                  >
                    <LogOut className="h-4 w-4" />
                    Cerrar sesión
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : null}
      </div>
    </header>
  );
}
