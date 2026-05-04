"use client";

import { useState, useTransition } from "react";
import { 
  PackageOpen, 
  History, 
  ArrowRight, 
  CheckCircle2, 
  AlertCircle,
  Loader2,
  Building2,
  FileText,
  Truck
} from "lucide-react";
import {
  Card, CardHeader, CardTitle, CardDescription, CardContent,
  Table, TableHeader, TableBody, TableHead, TableRow, TableCell,
  Badge, inputStyles, btnPrimary, btnSecondary, btnDanger, Separator
} from "@/components/shared/ui-components";
import { createGuiasBulk } from "@/actions/guias.actions";
import { createRemitosBulk } from "@/actions/remitos.actions";
import { toast } from "sonner";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { cn } from "@/lib/utils";

interface EntregasClientProps {
  delegaciones: { id: number; nombre: string }[];
  initialHistory: any[];
}

export function EntregasClient({ delegaciones, initialHistory }: EntregasClientProps) {
  const [isPending, startTransition] = useTransition();
  const [tipo, setTipo] = useState<"guias" | "remitos">("guias");
  const [delegacionId, setDelegacionId] = useState<string>("");
  const [desde, setDesde] = useState<string>("");
  const [hasta, setHasta] = useState<string>("");
  const [history, setHistory] = useState(initialHistory);

  const handleEntregar = async () => {
    if (!delegacionId || !desde || !hasta) {
      toast.error("Por favor completa todos los campos");
      return;
    }

    const nDesde = parseInt(desde);
    const nHasta = parseInt(hasta);

    if (isNaN(nDesde) || isNaN(nHasta) || nDesde <= 0 || nHasta <= 0) {
      toast.error("Los números deben ser válidos y mayores a 0");
      return;
    }

    if (nHasta < nDesde) {
      toast.error("El número final debe ser mayor que el inicial");
      return;
    }

    if (nHasta - nDesde > 500) {
      toast.error("No se pueden entregar más de 500 unidades a la vez");
      return;
    }

    startTransition(async () => {
      let res;
      if (tipo === "guias") {
        res = await createGuiasBulk({ desde: nDesde, hasta: nHasta, delegacionId: parseInt(delegacionId) });
      } else {
        res = await createRemitosBulk({ desde: nDesde, hasta: nHasta, delegacionId: parseInt(delegacionId) });
      }

      if (res.success) {
        toast.success(`${tipo === "guias" ? "Guías" : "Remitos"} entregados correctamente (${res.created} unidades)`);
        if (res.errors?.length) {
          toast.warning(`${res.errors.length} unidades ya existían y no fueron creadas`);
        }
        // Limpiar form
        setDesde("");
        setHasta("");
        // En una app real, refrescaríamos el historial aquí o vía server component
        window.location.reload(); 
      } else {
        toast.error("Error al procesar la entrega");
      }
    });
  };

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Habilitaciones</h1>
          <p className="text-zinc-500 dark:text-zinc-400">Proceso de habilitación de guías y remitos físicos a las delegaciones.</p>
        </div>
        <Badge variant="outline" className="h-6 gap-1 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400">
          <PackageOpen className="h-3 w-3" />
          Recaudaciones
        </Badge>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Formulario de Entrega */}
        <Card className="border-emerald-100 shadow-sm dark:border-emerald-900/50">
          <CardHeader>
            <CardTitle className="text-base">Nueva Habilitación</CardTitle>
            <CardDescription>Genera un lote de documentos asignados a una delegación.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Tipo de Documento</label>
                <select 
                  className={inputStyles}
                  value={tipo} 
                  onChange={(e) => setTipo(e.target.value as any)}
                >
                  <option value="guias">Guías</option>
                  <option value="remitos">Remitos</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Delegación Destino</label>
                <select 
                  className={inputStyles}
                  value={delegacionId} 
                  onChange={(e) => setDelegacionId(e.target.value)}
                >
                  <option value="">Seleccionar...</option>
                  {delegaciones.map((d) => (
                    <option key={d.id} value={d.id.toString()}>
                      {d.nombre}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Número Inicial</label>
                <input 
                  type="number" 
                  className={inputStyles}
                  placeholder="Ej: 1001" 
                  value={desde} 
                  onChange={(e) => setDesde(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Número Final</label>
                <input 
                  type="number" 
                  className={inputStyles}
                  placeholder="Ej: 1025" 
                  value={hasta} 
                  onChange={(e) => setHasta(e.target.value)}
                />
              </div>
            </div>

            {desde && hasta && !isNaN(parseInt(desde)) && !isNaN(parseInt(hasta)) && (
              <div className="rounded-lg bg-zinc-50 p-3 text-xs dark:bg-zinc-900">
                <div className="flex items-center justify-between text-zinc-500">
                  <span>Total a generar:</span>
                  <span className="font-bold text-zinc-900 dark:text-zinc-100">
                    {Math.max(0, parseInt(hasta) - parseInt(desde) + 1)} unidades
                  </span>
                </div>
              </div>
            )}
            
            <button 
              className={cn(btnPrimary, "w-full justify-center mt-4")} 
              onClick={handleEntregar}
              disabled={isPending}
            >
              {isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <CheckCircle2 className="h-4 w-4" />
              )}
              Registrar Habilitación
            </button>
          </CardContent>
        </Card>

        {/* Info Card / Ayuda */}
        <Card className="bg-zinc-50/50 dark:bg-zinc-900/50">
          <CardHeader>
            <CardTitle className="text-base">Información</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm text-zinc-500">
            <div className="flex gap-3">
              <div className="mt-0.5 rounded-full bg-blue-100 p-1 dark:bg-blue-900/30">
                <FileText className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="font-medium text-zinc-900 dark:text-zinc-100">Guías (Talonarios)</p>
                <p>Las guías suelen entregarse en talonarios de 25 unidades. Al entregarse, quedan marcadas como "Disponibles" a la delegación.</p>
              </div>
            </div>
            <div className="flex gap-3">
              <div className="mt-0.5 rounded-full bg-orange-100 p-1 dark:bg-orange-900/30">
                <Truck className="h-4 w-4 text-orange-600 dark:text-orange-400" />
              </div>
              <div>
                <p className="font-medium text-zinc-900 dark:text-zinc-100">Remitos</p>
                <p>Los remitos suelen entregarse en talonarios de 50. Quedan marcados como "Disponibles" para el uso operativo.</p>
              </div>
            </div>
            <div className="flex gap-3 pt-2">
              <AlertCircle className="h-4 w-4 shrink-0 text-amber-500" />
              <p className="text-xs">
                El sistema no permitirá crear duplicados. Si un número ya existe en la base de datos, será omitido y se informará al finalizar.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Historial de Entregas */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle className="text-lg">Historial de Habilitaciones</CardTitle>
            <CardDescription>Últimos movimientos registrados en el sistema.</CardDescription>
          </div>
          <History className="h-5 w-5 text-zinc-400" />
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Fecha</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Rango</TableHead>
                <TableHead>Delegación</TableHead>
                <TableHead>Usuario</TableHead>
                <TableHead className="text-right">Cantidad</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {history.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center text-zinc-500">
                    No hay registros de entregas recientes.
                  </TableCell>
                </TableRow>
              ) : (
                history.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">
                      {format(new Date(item.fecha), "dd/MM/yyyy HH:mm", { locale: es })}
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className={cn(
                        "gap-1",
                        item.tipo === "Guías" ? "text-blue-600 dark:text-blue-400" : "text-orange-600 dark:text-orange-400"
                      )}>
                        {item.tipo === "Guías" ? <FileText className="h-3 w-3" /> : <Truck className="h-3 w-3" />}
                        {item.tipo}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-mono text-sm">{item.rango}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Building2 className="h-3 w-3 text-zinc-400" />
                        <span>{delegaciones.find(d => d.id === item.delegacionId)?.nombre || "Delegación #"+item.delegacionId}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-xs text-zinc-500">{item.usuario}</TableCell>
                    <TableCell className="text-right font-bold">{item.cantidad}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
