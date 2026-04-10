"use client";

import { useState, useTransition, useEffect } from "react";
import { 
  ClipboardCheck, 
  Search, 
  MapPin, 
  Users, 
  Truck, 
  CheckCircle2, 
  ChevronRight, 
  ChevronLeft,
  Loader2,
  Calendar,
  AlertTriangle,
  Info
} from "lucide-react";
import { Badge, Separator, Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle, inputStyles, btnPrimary, btnSecondary } from "@/components/shared/ui-components";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { buscarGuiaParaCarga, procesarCargaManual } from "@/actions/carga.actions";
import { getTitulares } from "@/actions/titulares.actions";
import { getRemitosDisponiblesDelegacion } from "@/actions/remitos.actions";

interface CargaClientProps {
  delegaciones: { id: number; nombre: string }[];
}

export function CargaClient({ delegaciones }: CargaClientProps) {
  const [step, setStep] = useState(1);
  const [isPending, startTransition] = useTransition();

  // Step 1: Búsqueda
  const [nrguia, setNrguia] = useState("");
  const [foundGuia, setFoundGuia] = useState<any>(null);

  // Step 2: Datos de Guía
  const [delegacionId, setDelegacionId] = useState("");
  const [tipo, setTipo] = useState<"normal" | "deposito">("normal");
  const [destino, setDestino] = useState("");
  const [fechaEmision, setFechaEmision] = useState("");
  const [fechaVencimiento, setFechaVencimiento] = useState("");

  // Step 3: Titular
  const [titulares, setTitulares] = useState<any[]>([]);
  const [titularId, setTitularId] = useState("");
  const [titularSearch, setTitularSearch] = useState("");

  // Step 4: Remitos
  const [remitos, setRemitos] = useState<any[]>([]);
  const [selectedRemitos, setSelectedRemitos] = useState<number[]>([]);

  // Búsqueda de Titulares
  useEffect(() => {
    if (step === 3) {
      getTitulares({ search: titularSearch }).then(res => {
        if (res.titulares) setTitulares(res.titulares);
      });
    }
  }, [step, titularSearch]);

  // Búsqueda de Remitos al seleccionar delegación
  useEffect(() => {
    if (delegacionId) {
      getRemitosDisponiblesDelegacion(parseInt(delegacionId)).then(res => {
        if (res.remitos) setRemitos(res.remitos);
      });
    }
  }, [delegacionId]);

  const handleBuscarGuia = async () => {
    if (!nrguia) return;
    startTransition(async () => {
      const res = await buscarGuiaParaCarga(parseInt(nrguia));
      if (res.error) {
        toast.error(res.error);
        return;
      }
      if (res.yaProcesada) {
        toast.warning(res.mensaje);
        // Opcional: permitir ver pero no editar, o simplemente bloquear
      }
      if (res.guia) {
        setFoundGuia(res.guia);
        // Pre-cargar datos si ya tiene algo (ej: delegación asignada)
        if (res.guia.delegacionId) setDelegacionId(res.guia.delegacionId.toString());
        if (res.guia.tipo) setTipo(res.guia.tipo);
      }
      
      setStep(2);
    });
  };

  const handleNextStep = () => {
    if (step === 2 && (!delegacionId || !fechaEmision || !fechaVencimiento || !destino)) {
      toast.error("Completa todos los campos obligatorios");
      return;
    }
    if (step === 3 && !titularId) {
      toast.error("Selecciona un titular");
      return;
    }
    setStep(prev => prev + 1);
  };

  const handleSave = async () => {
    startTransition(async () => {
      const res = await procesarCargaManual({
        guiaId: foundGuia.id,
        delegacionId: parseInt(delegacionId),
        titularId: parseInt(titularId),
        tipo,
        destino,
        fechaEmision,
        fechaVencimiento,
        remitosIds: selectedRemitos,
      });

      if ("error" in res) {
        toast.error(res.error);
      } else {
        toast.success("Carga procesada exitosamente");
        window.location.href = "/guias"; // Redirigir al listado
      }
    });
  };

  const currentTitular = titulares.find(t => t.id.toString() === titularId);

  return (
    <div className="mx-auto max-w-4xl p-6">
      <div className="mb-8 space-y-2 text-center">
        <h1 className="text-3xl font-bold tracking-tight">Carga de Guías (Bosques)</h1>
        <p className="text-zinc-500">Procesamiento manual de guías y remitos físicos emitidos.</p>
        <div className="mt-6 flex justify-center gap-2">
          {[1, 2, 3, 4, 5].map((s) => (
            <div 
              key={s} 
              className={cn(
                "h-2 w-12 rounded-full transition-all duration-300",
                step >= s ? "bg-emerald-600" : "bg-zinc-200 dark:bg-zinc-800"
              )} 
            />
          ))}
        </div>
      </div>

      {/* Step 1: Búsqueda de Guía */}
      {step === 1 && (
        <Card className="mx-auto max-w-lg border-2 border-emerald-100 shadow-xl dark:border-emerald-900/50">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 dark:bg-emerald-950/50">
              <Search className="h-6 w-6" />
            </div>
            <CardTitle>Iniciar Proceso</CardTitle>
            <CardDescription>Ingresa el número de guía física para validar su existencia.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Número de Guía</label>
                <input 
                  type="number" 
                  className={cn(inputStyles, "h-12 text-center text-xl font-bold tracking-widest")}
                  placeholder="Ej: 45001" 
                  value={nrguia}
                  onChange={(e) => setNrguia(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleBuscarGuia()}
                />
              </div>
              <button 
                className={cn(btnPrimary, "w-full justify-center h-12 text-lg")} 
                onClick={handleBuscarGuia}
                disabled={isPending || !nrguia}
              >
                {isPending ? <Loader2 className="h-5 w-5 animate-spin" /> : <ChevronRight className="h-5 w-5" />}
                Continuar
              </button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 2: Datos de la Guía */}
      {step === 2 && (
        <Card className="border-emerald-100 shadow-lg dark:border-emerald-900/50">
          <CardHeader className="flex flex-row items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
              <Calendar className="h-5 w-5" />
            </div>
            <div>
              <CardTitle>Información de la Guía</CardTitle>
              <CardDescription>Guía N° {nrguia} - Datos operativos y vigencia.</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-medium">Delegación Emisora</label>
                <select 
                  className={inputStyles}
                  value={delegacionId} 
                  onChange={(e) => setDelegacionId(e.target.value)}
                >
                  <option value="">Seleccionar delegación</option>
                  {delegaciones.map(d => (
                    <option key={d.id} value={d.id.toString()}>{d.nombre}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Tipo de Tránsito</label>
                <select 
                  className={inputStyles}
                  value={tipo} 
                  onChange={(e) => setTipo(e.target.value as any)}
                >
                  <option value="normal">Normal (Extracción)</option>
                  <option value="deposito">Depósito</option>
                </select>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Destino de la Carga</label>
              <input 
                className={inputStyles}
                placeholder="Localidad, Empresa o Planta de destino" 
                value={destino}
                onChange={(e) => setDestino(e.target.value)}
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-medium">Fecha de Emisión</label>
                <input 
                  type="date" 
                  className={inputStyles}
                  value={fechaEmision}
                  onChange={(e) => setFechaEmision(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Fecha de Vencimiento</label>
                <input 
                  type="date" 
                  className={cn(inputStyles, "border-amber-200 bg-amber-50/30 dark:border-amber-900/20")}
                  value={fechaVencimiento}
                  onChange={(e) => setFechaVencimiento(e.target.value)}
                />
                <p className="text-[10px] text-amber-600">Suele ser 120 días después de emitir.</p>
              </div>
            </div>
          </CardContent>
          <CardFooter className="flex justify-between p-6">
            <button className={btnSecondary} onClick={() => setStep(1)}>Atrás</button>
            <button className={cn(btnPrimary, "px-8")} onClick={handleNextStep}>Siguiente</button>
          </CardFooter>
        </Card>
      )}

      {/* Step 3: Titular */}
      {step === 3 && (
        <Card className="border-emerald-100 shadow-lg dark:border-emerald-900/50">
          <CardHeader className="flex flex-row items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
              <Users className="h-5 w-5" />
            </div>
            <div>
              <CardTitle>Titular de la Guía</CardTitle>
              <CardDescription>Persona o empresa propietaria de la madera.</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-zinc-400" />
              <input 
                className={cn(inputStyles, "pl-10")}
                placeholder="Buscar por Razón Social o CUIT..." 
                value={titularSearch}
                onChange={(e) => setTitularSearch(e.target.value)}
              />
            </div>
            
            <div className="grid gap-2 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
              {titulares.map((t) => (
                <div 
                  key={t.id}
                  onClick={() => setTitularId(t.id.toString())}
                  className={cn(
                    "flex flex-col rounded-lg border p-3 cursor-pointer transition-all hover:border-emerald-200 hover:bg-emerald-50/50 dark:hover:bg-emerald-950/20",
                    titularId === t.id.toString() ? "border-emerald-500 bg-emerald-50 ring-1 ring-emerald-500 dark:bg-emerald-950/30" : "border-zinc-200 dark:border-zinc-800"
                  )}
                >
                  <span className="font-bold">{t.razonSocial}</span>
                  <span className="text-xs text-zinc-500">CUIT: {t.cuit}</span>
                </div>
              ))}
              {titulares.length === 0 && (
                <div className="py-8 text-center text-zinc-500 italic">No se encontraron titulares.</div>
              )}
            </div>
          </CardContent>
          <CardFooter className="flex justify-between p-6">
            <button className={btnSecondary} onClick={() => setStep(2)}>Atrás</button>
            <button className={cn(btnPrimary, "px-8")} onClick={handleNextStep}>Siguiente</button>
          </CardFooter>
        </Card>
      )}

      {/* Step 4: Remitos */}
      {step === 4 && (
        <Card className="border-emerald-100 shadow-lg dark:border-emerald-900/50">
          <CardHeader className="flex flex-row items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
              <Truck className="h-5 w-5" />
            </div>
            <div>
              <CardTitle>Vincular Remitos</CardTitle>
              <CardDescription>Selecciona los remitos que ya fueron usados con esta guía.</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-lg bg-emerald-50 p-3 text-xs text-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-300 flex items-center gap-2">
              <Info className="h-4 w-4" />
              Mostrando remitos "Disponibles" en la {delegaciones.find(d => d.id.toString() === delegacionId)?.nombre}.
            </div>

            <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-5 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
              {remitos.map((r) => (
                <div 
                  key={r.id}
                  onClick={() => {
                    if (selectedRemitos.includes(r.id)) {
                      setSelectedRemitos(selectedRemitos.filter(id => id !== r.id));
                    } else {
                      setSelectedRemitos([...selectedRemitos, r.id]);
                    }
                  }}
                  className={cn(
                    "flex flex-col items-center justify-center rounded-md border p-2 cursor-pointer text-sm font-mono transition-all",
                    selectedRemitos.includes(r.id) ? "border-emerald-500 bg-emerald-500 text-white shadow-md" : "border-zinc-200 hover:border-emerald-300 dark:border-zinc-800"
                  )}
                >
                  {r.nrremito}
                </div>
              ))}
              {remitos.length === 0 && (
                <div className="col-span-full py-8 text-center text-zinc-500 italic">
                  No hay remitos disponibles para esta delegación.
                </div>
              )}
            </div>
          </CardContent>
          <CardFooter className="flex justify-between items-center bg-zinc-50/50 p-4 border-t dark:bg-zinc-900/50">
            <button className={btnSecondary} onClick={() => setStep(3)}>Atrás</button>
            <div className="text-sm font-medium">
              {selectedRemitos.length} remitos seleccionados
            </div>
            <button className={btnPrimary} onClick={handleNextStep}>Revisar Carga</button>
          </CardFooter>
        </Card>
      )}

      {/* Step 5: Confirmación */}
      {step === 5 && (
        <Card className="border-emerald-200 border-2 shadow-2xl relative overflow-hidden dark:border-emerald-800">
          <div className="absolute top-0 right-0 p-2 opacity-5">
            <ClipboardCheck className="h-32 w-32" />
          </div>
          <CardHeader className="text-center">
            <CardTitle>Resumen de Carga Manual</CardTitle>
            <CardDescription>Verifica los datos antes de registrar el ingreso definitivo.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-6 md:grid-cols-2">
              <div className="space-y-4">
                <div>
                  <span className="text-xs font-bold uppercase tracking-wider text-zinc-400">Guía N°</span>
                  <p className="text-2xl font-bold">{nrguia}</p>
                </div>
                <div>
                  <span className="text-xs font-bold uppercase tracking-wider text-zinc-400">Delegación</span>
                  <p className="font-medium">{delegaciones.find(d => d.id.toString() === delegacionId)?.nombre}</p>
                </div>
                <div className="flex gap-4">
                  <div className="flex-1">
                    <span className="text-xs font-bold uppercase tracking-wider text-zinc-400">Emisión</span>
                    <p className="font-medium tracking-tight">{fechaEmision}</p>
                  </div>
                  <div className="flex-1">
                    <span className="text-xs font-bold uppercase tracking-wider text-zinc-400">Vencimiento</span>
                    <p className="font-medium tracking-tight text-amber-600">{fechaVencimiento}</p>
                  </div>
                </div>
              </div>

              <div className="space-y-4 rounded-xl bg-zinc-50 p-4 dark:bg-zinc-900">
                <div>
                  <span className="text-xs font-bold uppercase tracking-wider text-zinc-400">Titular Responsable</span>
                  <p className="font-bold text-lg leading-tight">{currentTitular?.razonSocial}</p>
                  <p className="text-sm text-zinc-500">CUIT: {currentTitular?.cuit}</p>
                </div>
                <Separator />
                <div>
                  <span className="text-xs font-bold uppercase tracking-wider text-zinc-400">Remitos Vinculados</span>
                  <div className="mt-1 flex flex-wrap gap-1">
                    {selectedRemitos.map(id => (
                      <Badge key={id} variant="secondary" className="font-mono text-[10px]">
                        {remitos.find(r => r.id === id)?.nrremito}
                      </Badge>
                    ))}
                    {selectedRemitos.length === 0 && <span className="text-xs italic text-zinc-500">Sin remitos vinculados</span>}
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-lg border-l-4 border-amber-500 bg-amber-50 p-4 dark:bg-amber-950/20">
              <div className="flex gap-3">
                <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0" />
                <p className="text-xs text-amber-800 dark:text-amber-300">
                  Importante: La guía pasará a estado <strong>Vigente</strong> inmediatamente. 
                  Esta acción es irreversible desde esta vista y quedará registrada en el log de auditoría.
                </p>
              </div>
            </div>
          </CardContent>
          <CardFooter className="flex justify-between gap-4 p-6">
            <button className={cn(btnSecondary, "flex-1 justify-center")} onClick={() => setStep(4)} disabled={isPending}>Volver a editar</button>
            <button className={cn(btnPrimary, "flex-[2] justify-center h-11")} onClick={handleSave} disabled={isPending}>
              {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
              Confirmar e Ingresar al Sistema
            </button>
          </CardFooter>
        </Card>
      )}
    </div>
  );
}
