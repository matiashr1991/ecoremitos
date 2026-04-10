"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  FileText,
  Truck,
  Building2,
  Users,
  Shield,
  ClipboardList,
  ChevronLeft,
  ChevronRight,
  TreePine,
  TabletSmartphone,
  PackageOpen,
  ClipboardCheck,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { useSession } from "@/lib/auth-client";

type NavItem = {
  name: string;
  href: string;
  icon: typeof LayoutDashboard;
  roles?: string[]; // If undefined, visible to all authenticated users
};

const navigation: NavItem[] = [
  { name: "Panel Operativo", href: "/", icon: LayoutDashboard },
  { name: "Guías", href: "/guias", icon: FileText, roles: ["admin", "recaudacion", "central", "control", "auditor", "carga"] },
  { name: "Remitos", href: "/remitos", icon: Truck, roles: ["admin", "recaudacion", "central", "control", "auditor", "carga"] },
  { name: "Habilitaciones", href: "/entregas", icon: PackageOpen, roles: ["admin", "recaudacion"] },
  { name: "Ingreso de Datos", href: "/carga", icon: ClipboardCheck, roles: ["admin", "carga", "control"] },
  { name: "Delegaciones", href: "/delegaciones", icon: Building2, roles: ["admin", "recaudacion", "central"] },
  { name: "Productores / Titulares", href: "/titulares", icon: Users, roles: ["admin", "recaudacion", "central"] },
  { name: "Gestión de Agentes", href: "/usuarios", icon: Shield, roles: ["admin"] },
  { name: "Registro de Actividades", href: "/admin/audit-log", icon: ClipboardList, roles: ["admin", "auditor"] },
];

export function Sidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const { data: session } = useSession();
  const userRole = (session?.user as Record<string, unknown>)?.role as string || "control";

  // Filter navigation items based on user role
  const visibleNav = navigation.filter((item) => {
    if (!item.roles) return true;
    return item.roles.includes(userRole);
  });

  return (
    <aside
      className={cn(
        "relative flex h-screen flex-col border-r border-zinc-200 bg-white transition-all duration-300 dark:border-zinc-800 dark:bg-zinc-950",
        collapsed ? "w-[68px]" : "w-64"
      )}
    >
      {/* Logo */}
      <div className="flex h-16 items-center gap-3 border-b border-zinc-200 px-4 dark:border-zinc-800">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-500 to-green-600 text-white shadow-lg shadow-emerald-500/25">
          <TreePine className="h-5 w-5" />
        </div>
        {!collapsed && (
          <div className="flex flex-col">
            <span className="text-sm font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
              ECOREMITOS
            </span>
            <span className="text-[10px] font-medium text-zinc-500 dark:text-zinc-500 uppercase tracking-wider">
              Control Forestal
            </span>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
        {visibleNav.map((item) => {
          const isActive =
            item.href === "/"
              ? pathname === "/"
              : pathname.startsWith(item.href);
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                "group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-150",
                isActive
                  ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400"
                  : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800/50 dark:hover:text-zinc-100"
              )}
              title={collapsed ? item.name : undefined}
            >
              <item.icon
                className={cn(
                  "h-5 w-5 shrink-0 transition-colors",
                  isActive
                    ? "text-emerald-600 dark:text-emerald-400"
                    : "text-zinc-400 group-hover:text-zinc-600 dark:text-zinc-500 dark:group-hover:text-zinc-300"
                )}
              />
              {!collapsed && <span>{item.name}</span>}
            </Link>
          );
        })}
      </nav>

      {/* Role badge */}
      {!collapsed && (
        <div className="border-t border-zinc-200 px-4 py-3 dark:border-zinc-800">
          <span className="inline-flex items-center rounded-full bg-zinc-100 px-2.5 py-0.5 text-[10px] font-medium uppercase tracking-wider text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
            {userRole}
          </span>
        </div>
      )}

      {/* Collapse button */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="absolute -right-3 top-20 flex h-6 w-6 items-center justify-center rounded-full border border-zinc-200 bg-white text-zinc-400 shadow-sm transition-colors hover:text-zinc-600 dark:border-zinc-700 dark:bg-zinc-900 dark:hover:text-zinc-200"
      >
        {collapsed ? (
          <ChevronRight className="h-3 w-3" />
        ) : (
          <ChevronLeft className="h-3 w-3" />
        )}
      </button>
    </aside>
  );
}
