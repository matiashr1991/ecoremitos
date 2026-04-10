import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { LogOut } from "lucide-react";
import Link from "next/link";
import { ThemeToggle } from "@/components/shared/theme-toggle";

export default async function TabletLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth.api.getSession({ headers: await headers() });
  
  // Protect route
  if (!session?.user) {
    redirect("/login");
  }

  if (session.user.role !== "delegacion" && session.user.role !== "admin") {
    // Or whatever error page.
    redirect("/");
  }

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-zinc-50 dark:bg-zinc-950">
      <header className="flex h-14 shrink-0 items-center justify-between border-b border-zinc-200 bg-white px-4 dark:border-zinc-800 dark:bg-zinc-900 shadow-sm">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-600 text-white font-bold">
            E
          </div>
          <h1 className="text-lg font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
            Operativa Delegación
          </h1>
        </div>

        <div className="flex items-center gap-3">
          <span className="hidden sm:inline-block text-sm font-medium text-zinc-500 dark:text-zinc-400">
            {session.user.name}
          </span>
          <ThemeToggle />
          <Link
            href="/api/auth/sign-out"
            className="rounded-md p-2 text-zinc-500 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
            prefetch={false}
          >
            <LogOut className="h-5 w-5" />
          </Link>
        </div>
      </header>
      <main className="flex-1 overflow-x-hidden overflow-y-auto w-full max-w-4xl mx-auto p-4 sm:p-6 pb-24">
        {children}
      </main>
    </div>
  );
}
