import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { syncExpiredGuias } from "@/actions/guias.actions";
import { cn } from "@/lib/utils";
import {
  FileText,
  Truck,
  Building2,
  Users,
  AlertTriangle,
  TrendingUp,
  Package,
} from "lucide-react";

async function getStats() {
  await syncExpiredGuias();
  const [
    guiasTotal,
    remitosTotal,
    delegacionesTotal,
    titularesTotal,
    guiasStock,
    remitosStock,
    guiasVigentes,
    remitosUso,
    guiasIncompletas,
    guiasPorEstado,
    recentActivity,
  ] = await Promise.all([
    prisma.guia.count({ where: { deletedAt: null } }),
    prisma.remito.count({ where: { deletedAt: null } }),
    prisma.delegacion.count({ where: { deletedAt: null, activa: true } }),
    prisma.titular.count({ where: { deletedAt: null, activo: true } }),
    prisma.guia.count({
      where: { deletedAt: null, estado: { in: ["en_blanco", "asignada"] } },
    }),
    prisma.remito.count({
      where: { deletedAt: null, estado: "disponible" },
    }),
    prisma.guia.count({
      where: { deletedAt: null, estado: "vigente", titularId: { not: null } },
    }),
    prisma.remito.count({
      where: { deletedAt: null, estado: { notIn: ["disponible", "anulado"] } },
    }),
    prisma.guia.count({
      where: { deletedAt: null, estado: "vigente", titularId: null },
    }),
    prisma.guia.groupBy({
      by: ["estado"],
      where: { deletedAt: null },
      _count: true,
    }),
    prisma.auditLog.findMany({
      take: 8,
      orderBy: { createdAt: "desc" },
    }),
  ]);

  return {
    guiasTotal,
    remitosTotal,
    delegacionesTotal,
    titularesTotal,
    guiasStock,
    remitosStock,
    guiasVigentes,
    remitosUso,
    guiasIncompletas,
    guiasPorEstado,
    recentActivity: recentActivity.map((log: any) => ({
      ...log,
      id: Number(log.id),
    })),
  };
}

function translateAction(action: string) {
  const actions: Record<string, string> = {
    CREATE_GUIA: "Creó una guía",
    UPDATE_GUIA: "Actualizó una guía",
    DELETE_GUIA: "Eliminó una guía",
    CREATE_REMITO: "Creó un remito",
    UPDATE_REMITO: "Actualizó un remito",
    VINCULAR_REMITOS: "Vinculó remitos",
    DESVINCULAR_REMITO: "Desvinculó un remito",
    PRORROGAR_GUIA: "Prorrogó vigencia",
    PRORROGAR_GUIA_OPERATIVA: "Prorrogó guía desde operativa",
    RESETEAR_PRORROGA_GUIA: "Reseteó prórroga de guía",
    BLANQUEAR_GUIA: "Blanqueó una guía",
    COMPLETAR_OPERATIVA_TABLET: "Completó operativa en tablet",
    CARGA_MANUAL_BOSQUES: "Cargó datos físicos (Carga)",
    CREATE_GUIAS_BULK: "Entregó lote de guías",
    CREATE_REMITOS_BULK: "Entregó lote de remitos",
    CREATE_DELEGACION: "Creó delegación",
    UPDATE_DELEGACION: "Actualizó delegación",
    DELETE_DELEGACION: "Eliminó delegación",
    CREATE_TITULAR: "Creó titular",
    UPDATE_TITULAR: "Actualizó titular",
    DELETE_TITULAR: "Eliminó titular",
    CREATE_USER: "Creó usuario",
    UPDATE_USER: "Actualizó usuario",
    DELETE_USER: "Eliminó usuario",
  };
  return actions[action] || action.replace(/_/g, " ").toLowerCase();
}

export default async function DashboardPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  const role = (session?.user as any)?.role;

  if (role === "carga") {
    redirect("/carga");
  }

  const stats = await getStats();

  const cards = [
    {
      title: "Guías en Stock",
      value: stats.guiasStock,
      icon: Package,
      color: "emerald",
      gradient: "from-emerald-500 to-green-600",
      bgLight: "bg-emerald-50",
      bgDark: "dark:bg-emerald-950/30",
      textColor: "text-emerald-700 dark:text-emerald-400",
    },
    {
      title: "Remitos en Stock",
      value: stats.remitosStock,
      icon: Truck,
      color: "blue",
      gradient: "from-blue-500 to-indigo-600",
      bgLight: "bg-blue-50",
      bgDark: "dark:bg-blue-950/30",
      textColor: "text-blue-700 dark:text-blue-400",
    },
    {
      title: "Titulares",
      value: stats.titularesTotal,
      icon: Users,
      color: "amber",
      gradient: "from-amber-500 to-orange-600",
      bgLight: "bg-amber-50",
      bgDark: "dark:bg-amber-950/30",
      textColor: "text-amber-700 dark:text-amber-400",
    },
    {
      title: "Guías en Uso",
      value: stats.guiasVigentes,
      icon: TrendingUp,
      color: "cyan",
      gradient: "from-cyan-500 to-teal-600",
      bgLight: "bg-cyan-50",
      bgDark: "dark:bg-cyan-950/30",
      textColor: "text-cyan-700 dark:text-cyan-400",
    },
    {
      title: "Remitos en Uso",
      value: stats.remitosUso,
      icon: Truck,
      color: "indigo",
      gradient: "from-indigo-500 to-blue-600",
      bgLight: "bg-indigo-50",
      bgDark: "dark:bg-indigo-950/30",
      textColor: "text-indigo-700 dark:text-indigo-400",
    },
    {
      title: "Guías sin Titular",
      value: stats.guiasIncompletas,
      icon: AlertTriangle,
      color: "red",
      gradient: "from-red-500 to-rose-600",
      bgLight: "bg-red-50",
      bgDark: "dark:bg-red-950/30",
      textColor: "text-red-700 dark:text-red-400",
    },
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
          Dashboard
        </h1>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          Resumen general del sistema de gestión forestal
        </p>
      </div>

      {/* Stats grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((card) => (
          <div
            key={card.title}
            className="group relative overflow-hidden rounded-xl border border-zinc-200 bg-white p-6 shadow-sm transition-all duration-200 hover:shadow-md dark:border-zinc-800 dark:bg-zinc-950"
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
                  {card.title}
                </p>
                <p className="mt-2 text-3xl font-bold text-zinc-900 dark:text-zinc-50">
                  {card.value.toLocaleString("es-AR")}
                </p>
              </div>
              <div
                className={`flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br ${card.gradient} text-white shadow-lg transition-transform duration-200 group-hover:scale-110`}
              >
                <card.icon className="h-5 w-5" />
              </div>
            </div>
            {/* Decorative gradient line */}
            <div
              className={`absolute bottom-0 left-0 h-1 w-full bg-gradient-to-r ${card.gradient} opacity-0 transition-opacity duration-200 group-hover:opacity-100`}
            />
          </div>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Guías por Estado Chart (CSS Bars) */}
        <div className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-950">
          <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
            Guías por estado
          </h3>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            Distribución actual de guías según su estado
          </p>
          <div className="mt-8 space-y-4">
            {stats.guiasPorEstado
              .filter(item => item.estado !== "en_blanco")
              .sort((a, b) => {
                const order = ["intervenida", "vencida", "vigente", "asignada"];
                return order.indexOf(a.estado) - order.indexOf(b.estado);
              })
              .map((item: any) => {
                const percentage =
                  stats.guiasTotal > 0
                    ? (item._count / stats.guiasTotal) * 100
                    : 0;
                
                const labels: Record<string, string> = {
                  en_blanco: "En Blanco (Sin asignar)",
                  asignada: "Disponibles (En Delegación)",
                  vigente: "Vigentes (Con Remitos)",
                  vencida: "Vencidas (Expiradas)",
                  intervenida: "Intervenidas (Bloqueadas/Irregular)",
                };

                const barColors: Record<string, string> = {
                  vigente: "bg-emerald-500",
                  vencida: "bg-orange-500",
                  intervenida: "bg-red-600 animate-pulse",
                  asignada: "bg-blue-500",
                  en_blanco: "bg-zinc-400",
                };

                return (
                  <div key={item.estado} className="group space-y-1.5">
                    <div className="flex items-center justify-between text-xs font-semibold">
                      <span className="text-zinc-700 dark:text-zinc-300">
                        {labels[item.estado] || item.estado.replace(/_/g, " ")}
                      </span>
                      <span className="text-zinc-500">
                        {item._count} ({percentage.toFixed(1)}%)
                      </span>
                    </div>
                    <div className="h-2.5 w-full overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
                      <div
                        className={cn(
                          "h-full transition-all duration-1000 ease-out",
                          barColors[item.estado] || "bg-zinc-500"
                        )}
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                );
              })}
          </div>
        </div>

        {/* Actividad Reciente */}
        <div className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-950">
          <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
            Actividad reciente
          </h3>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            Últimas acciones realizadas en el sistema
          </p>
          <div className="mt-6 space-y-4">
            {stats.recentActivity.length > 0 ? (
              stats.recentActivity.map((log: any) => (
                <div key={log.id} className="flex items-start gap-3 text-sm">
                  <div className="mt-1 h-2 w-2 rounded-full bg-emerald-500" />
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center justify-between">
                      <p className="font-medium text-zinc-900 dark:text-zinc-100">
                        {translateAction(log.action)}
                      </p>
                      <span className="text-[10px] text-zinc-400 uppercase">
                        {new Date(log.createdAt).toLocaleTimeString("es-AR", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400 line-clamp-1">
                      {log.userEmail?.split("@")[0] || "Sistema"} •{" "}
                      {log.entityType}{" "}
                      {log.entityId ? `#${log.entityId}` : ""}
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <div className="flex h-48 items-center justify-center text-zinc-400 dark:text-zinc-600">
                Sin actividad registrada.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
