"use client";

import { useState, useTransition } from "react";
import { CameraCapture } from "./camera-capture";
import { Check, Camera, FileText, User as UserIcon, CheckCircle2, ChevronRight, ChevronLeft, AlertTriangle } from "lucide-react";
import {
  buscarGuiaPorNumeroOperativa,
  buscarTitularPorDocumentoOperativa,
  prorrogarGuiaOperativa,
  completarOperativaTablet,
} from "@/actions/operativa.actions";
import { useRouter } from "next/navigation";

interface Titular { 
  id: number; 
  razonSocial: string; 
  cuit: string | null; 
  bloqueado?: boolean;
  guiasAdeudadas?: number[];
}
interface Remito { id: number; nrremito: number; }

interface TabletWizardProps {
  remitos: Remito[];
  onBack?: () => void;
}

function addDays(dateStr: string, days: number): string {
  const d = new Date(`${dateStr}T00:00:00`);
  if (Number.isNaN(d.getTime())) return "";
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

export function TabletWizard({ remitos, onBack }: TabletWizardProps) {
  const router = useRouter();
  const [isSearchingGuia, startSearchGuia] = useTransition();
  const [isProrrogando, startProrroga] = useTransition();
  const [isSearchingTitular, startSearchTitular] = useTransition();
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorSubmit, setErrorSubmit] = useState<string | null>(null);
  const [gpsStatus, setGpsStatus] = useState<"pending" | "ok" | "error">("pending");
  const [success, setSuccess] = useState(false);

  // Form State
  const [selectedGuia, setSelectedGuia] = useState<number | "">("");
  const [guiaNumero, setGuiaNumero] = useState("");
  const [guiaValidada, setGuiaValidada] = useState<number | null>(null);
  const [errorGuia, setErrorGuia] = useState<string | null>(null);
  const [okGuia, setOkGuia] = useState<string | null>(null);
  const [prorrogaInfo, setProrrogaInfo] = useState<{
    id: number;
    nrguia: number;
    fechaVencimiento: string | null;
    mensaje: string;
  } | null>(null);

  const [titularQuery, setTitularQuery] = useState("");
  const [titularMatches, setTitularMatches] = useState<Titular[]>([]);
  const [errorTitular, setErrorTitular] = useState<string | null>(null);

  const [selectedTitular, setSelectedTitular] = useState<number | "">("");
  const [esDeposito, setEsDeposito] = useState(false);
  
  // Dates
  const today = new Date().toISOString().split('T')[0];
  const [fechaEmision, setFechaEmision] = useState(today);
  const [fechaVencimiento, setFechaVencimiento] = useState(addDays(today, 120));

  // Selection state
  const [selectedRemitos, setSelectedRemitos] = useState<number[]>([]);
  const [remitoManual, setRemitoManual] = useState("");
  const [errorRemito, setErrorRemito] = useState<string | null>(null);
  const [imagenes, setImagenes] = useState<File[]>([]);

  // Derived
  const titularSeleccionado = selectedTitular === "" ? null : titularMatches.find((t) => t.id === selectedTitular) || null;
  const titularBloqueado = titularSeleccionado?.bloqueado === true;
  
  const canGoNext1 = selectedTitular !== "" && !titularBloqueado && fechaEmision !== "" && (esDeposito || fechaVencimiento !== "");
  const canGoNext2 = guiaValidada !== null && selectedGuia !== "";
  const canSubmit = imagenes.length > 0 && (esDeposito ? true : selectedRemitos.length > 0);

  const agregarRemitoManual = () => {
    setErrorRemito(null);
    const nro = Number(remitoManual);

    if (!Number.isInteger(nro) || nro <= 0) {
      setErrorRemito("Ingresá un número de remito válido");
      return;
    }

    const remito = remitos.find((r) => r.nrremito === nro);
    if (!remito) {
      setErrorRemito("Ese remito no está disponible para esta delegación");
      return;
    }

    if (selectedRemitos.includes(remito.id)) {
      setErrorRemito("Ese remito ya fue agregado");
      return;
    }

    setSelectedRemitos((prev) => [...prev, remito.id]);
    setRemitoManual("");
  };

  const quitarRemito = (id: number) => {
    setSelectedRemitos((prev) => prev.filter((r) => r !== id));
  };

  const remitosSeleccionadosData = selectedRemitos
    .map((id) => remitos.find((r) => r.id === id))
    .filter((r): r is Remito => !!r)
    .sort((a, b) => a.nrremito - b.nrremito);

  const handleBuscarTitular = () => {
    setErrorTitular(null);
    const term = titularQuery.trim();

    if (!term) {
      setTitularMatches([]);
      setSelectedTitular("");
      setErrorTitular("Ingresá CUIT o DNI");
      return;
    }

    startSearchTitular(async () => {
      const res = await buscarTitularPorDocumentoOperativa(term);
      if (res.error || !res.success) {
        setTitularMatches([]);
        setSelectedTitular("");
        setErrorTitular(res.error || "No se pudo buscar el titular");
        return;
      }

      setTitularMatches(res.titulares);
      setErrorTitular(null);

      if (res.titulares.length === 1) {
        setSelectedTitular(res.titulares[0].id);
      } else {
        setSelectedTitular("");
      }
    });
  };

  const handleBuscarGuia = () => {
    setErrorGuia(null);
    setOkGuia(null);
    setProrrogaInfo(null);
    const nro = Number(guiaNumero);

    if (!Number.isInteger(nro) || nro <= 0) {
      setGuiaValidada(null);
      setSelectedGuia("");
      setErrorGuia("Ingresá un número de guía válido");
      return;
    }

    startSearchGuia(async () => {
      const res = await buscarGuiaPorNumeroOperativa(nro);
      if (res.error || !res.success) {
        setGuiaValidada(null);
        setSelectedGuia("");
        setErrorGuia(res.error || "No se pudo validar la guía");
        return;
      }

      if (res.modo === "operativa") {
        setGuiaValidada(res.guia.nrguia);
        setSelectedGuia(res.guia.id);
        setOkGuia(null);
        setErrorGuia(null);
        setProrrogaInfo(null);
        return;
      }

      if (res.modo === "prorroga") {
        setGuiaValidada(null);
        setSelectedGuia("");
        setOkGuia(null);
        setProrrogaInfo({
          id: res.guia.id,
          nrguia: res.guia.nrguia,
          fechaVencimiento: res.guia.fechaVencimiento
            ? new Date(res.guia.fechaVencimiento).toISOString().slice(0, 10)
            : null,
          mensaje: res.mensaje || "Guía vencida con opción de prórroga",
        });
        setErrorGuia(null);
      }
    });
  };

  const handleProrrogarGuia = () => {
    if (!prorrogaInfo) return;

    startProrroga(async () => {
      const res = await prorrogarGuiaOperativa(prorrogaInfo.id);
      if (res.error) {
        setErrorGuia(res.error);
        return;
      }

      setErrorGuia(null);
      setProrrogaInfo(null);
      setGuiaValidada(null);
      setSelectedGuia("");
      setOkGuia(
        res.mensaje ||
          `Prórroga otorgada para guía Nº ${prorrogaInfo.nrguia}. Nuevo vencimiento: ${res.fechaVencimiento || "N/D"}.`
      );
    });
  };

  const handleCompletar = async () => {
    setIsSubmitting(true);
    setErrorSubmit(null);
    setGpsStatus("pending");
    try {
      const formData = new FormData();
      formData.append("guiaId", selectedGuia.toString());
      formData.append("titularId", selectedTitular.toString());
      formData.append("fechaEmision", fechaEmision);
      formData.append("fechaVencimiento", fechaVencimiento);
      formData.append("esDeposito", esDeposito.toString());
      formData.append("remitos", JSON.stringify(selectedRemitos));
      
      // Captura GPS obligatoria para control operativo
      try {
        if (!("geolocation" in navigator)) {
          setGpsStatus("error");
          setErrorSubmit("Este dispositivo no soporta GPS. No se puede completar la operación sin ubicación.");
          return;
        }

        const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 0,
          });
        });

        const gpsResult = {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
          timestamp: pos.timestamp,
        };

        formData.append("gps", JSON.stringify(gpsResult));
        setGpsStatus("ok");
      } catch (gpsError) {
        console.warn("GPS capture failed or denied:", gpsError);
        setGpsStatus("error");
        setErrorSubmit("No se pudo obtener GPS (permiso denegado o señal débil). Es obligatorio para enviar.");
        return;
      }

      // Append images
      imagenes.forEach((file) => formData.append("fotos", file, file.name));

      const res = await completarOperativaTablet(formData);
      if (res.error) {
        setErrorSubmit(res.error);
      } else {
        setSuccess(true);
      }
    } catch {
      setErrorSubmit("Error inesperado de conexión.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (success) {
    return (
      <div className="flex flex-col items-center justify-center p-8 bg-white dark:bg-zinc-900 rounded-2xl shadow-sm border border-emerald-100 dark:border-emerald-900/30 text-center space-y-6 animate-in zoom-in-95 mt-10">
        <div className="w-20 h-20 bg-emerald-100 dark:bg-emerald-900/30 rounded-full flex items-center justify-center">
          <CheckCircle2 className="w-10 h-10 text-emerald-600 dark:text-emerald-400" />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-zinc-900 dark:text-white">Operación Exitosa</h2>
          <p className="text-zinc-600 dark:text-zinc-400 mt-2">La guía y los remitos han sido actualizados y vinculados correctamente en el sistema central.</p>
        </div>
        <div className="flex gap-4">
          {onBack && (
            <button 
              onClick={onBack}
              className="bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-900 dark:text-white px-8 py-4 rounded-xl text-lg font-medium shadow-sm transition-all"
            >
              Volver al Menú
            </button>
          )}
          <button 
            onClick={() => {
              setSuccess(false);
              setStep(1);
              setSelectedGuia("");
              setGuiaNumero("");
              setGuiaValidada(null);
              setErrorGuia(null);
              setProrrogaInfo(null);
              setSelectedTitular("");
              setTitularQuery("");
              setTitularMatches([]);
              setErrorTitular(null);
              setSelectedRemitos([]);
              setRemitoManual("");
              setErrorRemito(null);
              setImagenes([]);
              setFechaEmision(today);
              setFechaVencimiento(addDays(today, 120));
              router.refresh(); // reload available items
            }}
            className="bg-emerald-600 hover:bg-emerald-700 text-white px-8 py-4 rounded-xl text-lg font-medium shadow-md transition-all active:scale-95"
          >
            Nueva Operación
          </button>
        </div>
      </div>
    );
  }

  const stepClasses = (n: number) => {
    if (step > n) return "bg-emerald-600 text-white border-emerald-600";
    if (step === n) return "bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 border-zinc-900 dark:border-zinc-100";
    return "bg-white dark:bg-zinc-800 text-zinc-400 border-zinc-300 dark:border-zinc-700";
  };

  return (
    <div className="flex flex-col h-full space-y-6">
      {onBack && step === 1 && (
        <button onClick={onBack} className="flex items-center text-sm font-medium text-zinc-500 hover:text-zinc-900 dark:hover:text-white w-max transition-colors">
          <ChevronLeft className="w-4 h-4 mr-1" /> Volver al panel
        </button>
      )}

      {/* Stepper Header */}
      <div className="flex items-center justify-between px-2 mb-4 relative">
        <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-zinc-200 dark:bg-zinc-800 -z-10 -translate-y-1/2"></div>
        {[
          {n: 1, label: "Datos Titular", icon: UserIcon},
          {n: 2, label: "Elegir Guía", icon: FileText},
          {n: 3, label: "Comprobantes", icon: Camera}
        ].map((s) => (
          <div key={s.n} className="flex flex-col items-center gap-2 bg-zinc-50 dark:bg-zinc-950 px-2 cursor-pointer" onClick={() => {
             // Only allow clicking back to completed steps
             if (s.n < step) setStep(s.n);
          }}>
            <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-colors ${stepClasses(s.n)}`}>
              {step > s.n ? <Check className="w-5 h-5" /> : <s.icon className="w-5 h-5" />}
            </div>
            <span className={`text-xs font-medium ${step >= s.n ? 'text-zinc-900 dark:text-zinc-100' : 'text-zinc-500'}`}>{s.label}</span>
          </div>
        ))}
      </div>

      {/* STEP 1: TITULAR y TIPO (Anteriormente Step 2) */}
      {step === 1 && (
        <div className="bg-white dark:bg-zinc-900 p-6 rounded-2xl shadow-sm border border-zinc-200 dark:border-zinc-800 space-y-6 animate-in slide-in-from-left-4">
           <div>
            <h3 className="text-xl font-bold text-zinc-900 dark:text-white mb-1">1. Datos de Operación</h3>
            <p className="text-zinc-500 text-sm">Designa el titular, tipo de viaje y las fechas correspondientes.</p>
          </div>

          <div className="space-y-5">
            {/* Tipo */}
            <div className="flex items-center gap-4 bg-zinc-50 dark:bg-zinc-800/50 p-4 rounded-xl">
              <label className="flex-1 flex items-center gap-3 cursor-pointer">
                <input
                  type="radio"
                  name="rutatipo"
                  checked={!esDeposito}
                  onChange={() => {
                    setEsDeposito(false);
                    if (!fechaVencimiento) setFechaVencimiento(addDays(fechaEmision || today, 120));
                  }}
                  className="w-6 h-6 text-emerald-600 focus:ring-emerald-500 border-zinc-300"
                />
                <span className="text-lg font-medium text-zinc-900 dark:text-zinc-100">Guía Normal (Ruta)</span>
              </label>
              <label className="flex-1 flex items-center gap-3 cursor-pointer">
                <input
                  type="radio"
                  name="rutatipo"
                  checked={esDeposito}
                  onChange={() => {
                    setEsDeposito(true);
                    setSelectedRemitos([]);
                    setRemitoManual("");
                    setErrorRemito(null);
                    setFechaVencimiento("");
                  }}
                  className="w-6 h-6 text-emerald-600 focus:ring-emerald-500 border-zinc-300"
                />
                <span className="text-lg font-medium text-zinc-900 dark:text-zinc-100">Para Depósito</span>
              </label>
            </div>

            {/* Titular */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Titular (Maderero/Propietario)</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  inputMode="numeric"
                  placeholder="Ingresá CUIT o DNI"
                  value={titularQuery}
                  onChange={(e) => {
                    setTitularQuery(e.target.value);
                    if (errorTitular) setErrorTitular(null);
                  }}
                  className="w-full text-base p-4 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-transparent text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
                <button
                  type="button"
                  onClick={handleBuscarTitular}
                  disabled={isSearchingTitular}
                  className="px-4 py-3 rounded-xl bg-emerald-600 text-white font-semibold disabled:opacity-50 min-w-[100px]"
                >
                  {isSearchingTitular ? "Buscando..." : "Buscar"}
                </button>
              </div>

              {errorTitular && <p className="text-sm text-red-500">{errorTitular}</p>}

              {titularSeleccionado && !titularBloqueado && (
                <p className="text-sm text-emerald-600 dark:text-emerald-400 font-medium p-2 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg">
                  Titular seleccionado: {titularSeleccionado.razonSocial} {titularSeleccionado.cuit ? `(CUIT/DNI: ${titularSeleccionado.cuit})` : ""}
                </p>
              )}

              {titularSeleccionado && titularBloqueado && (
                <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-900/50 rounded-xl">
                  <div className="flex gap-3">
                    <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
                    <div>
                      <h4 className="font-semibold text-red-800 dark:text-red-300">Operación Bloqueada</h4>
                      <p className="text-sm text-red-700 dark:text-red-400 mt-1">
                        El titular <strong>{titularSeleccionado.razonSocial}</strong> se encuentra bloqueado por falta de rendición física de guías vencidas por más de 5 días hábiles.
                      </p>
                      <p className="text-sm font-medium text-red-800 dark:text-red-300 mt-2">
                        Guías pendientes: {titularSeleccionado.guiasAdeudadas?.join(", ")}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {!titularSeleccionado && titularMatches.length > 1 && (
                <div className="max-h-52 overflow-y-auto rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950/50 p-2 space-y-2">
                  {titularMatches.map((t) => (
                    <button
                      type="button"
                      key={t.id}
                      onClick={() => setSelectedTitular(t.id)}
                      className={`w-full text-left rounded-lg border px-3 py-2 text-sm transition-colors ${
                        t.bloqueado 
                          ? "bg-red-50 border-red-200 text-red-900 dark:bg-red-900/20 dark:border-red-900/50 dark:text-red-300" 
                          : "border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-800 dark:text-zinc-100 hover:border-emerald-400"
                      }`}
                    >
                      <div className="font-medium flex justify-between">
                        <span>{t.razonSocial}</span>
                        {t.bloqueado && <span className="text-xs font-bold uppercase text-red-600 dark:text-red-400">Bloqueado</span>}
                      </div>
                      <div className="text-xs opacity-70">CUIT/DNI: {t.cuit || "sin dato"}</div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Fechas */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Fecha Emisión</label>
                <input 
                  type="date" 
                  value={fechaEmision}
                  onChange={e => {
                    const emision = e.target.value;
                    setFechaEmision(emision);
                    if (!esDeposito) {
                      setFechaVencimiento(addDays(emision, 120));
                    }
                  }}
                  className="w-full p-4 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-transparent text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Fecha Vencimiento</label>
                <input 
                  type="date" 
                  value={fechaVencimiento}
                  onChange={e => setFechaVencimiento(e.target.value)}
                  disabled={esDeposito}
                  className="w-full p-4 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-transparent text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:opacity-50"
                />
                {esDeposito && (
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">Para depósito no se carga fecha de vencimiento.</p>
                )}
              </div>
            </div>
          </div>

          <div className="flex justify-end pt-4">
            <button
              disabled={!canGoNext1}
              onClick={() => setStep(2)}
              className="px-6 py-4 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 font-semibold rounded-xl text-lg disabled:opacity-50 flex items-center gap-2 active:scale-95 transition-all"
            >
              Siguiente <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}

      {/* STEP 2: GUIA (Anteriormente Step 1) */}
      {step === 2 && (
        <div className="bg-white dark:bg-zinc-900 p-6 rounded-2xl shadow-sm border border-zinc-200 dark:border-zinc-800 space-y-6 animate-in slide-in-from-right-4">
          <div>
            <h3 className="text-xl font-bold text-zinc-900 dark:text-white mb-1">2. Seleccionar Guía</h3>
            <p className="text-zinc-500 text-sm">Ingresá número de guía. Si está en blanco, seguís operativa. Si está vencida/usada, podés prorrogar una vez.</p>
          </div>
          <div className="space-y-4">
            <div className="flex gap-2">
              <input
                type="number"
                inputMode="numeric"
                min={1}
                placeholder="Ej: 700123"
                value={guiaNumero}
                onChange={(e) => {
                  setGuiaNumero(e.target.value);
                  setGuiaValidada(null);
                  setSelectedGuia("");
                  setProrrogaInfo(null);
                  setOkGuia(null);
                  if (errorGuia) setErrorGuia(null);
                }}
                className="w-full text-lg p-4 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-transparent text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
              <button
                type="button"
                onClick={handleBuscarGuia}
                disabled={isSearchingGuia}
                className="px-4 py-3 rounded-xl bg-emerald-600 text-white font-semibold disabled:opacity-50 min-w-[100px]"
              >
                {isSearchingGuia ? "Validando..." : "Validar"}
              </button>
            </div>

            {guiaValidada !== null && !errorGuia && (
              <p className="text-sm text-emerald-600 dark:text-emerald-400 font-medium">
                Guía Nº {guiaValidada} validada correctamente.
              </p>
            )}

            {okGuia && !errorGuia && (
              <p className="text-sm text-emerald-600 dark:text-emerald-400 font-medium">{okGuia}</p>
            )}

            {errorGuia && (
              <p className="text-sm text-red-500">{errorGuia}</p>
            )}

            {prorrogaInfo && (
              <div className="rounded-xl border border-amber-300/60 bg-amber-50 dark:bg-amber-900/20 p-3 space-y-2">
                <p className="text-sm text-amber-700 dark:text-amber-400 font-medium">{prorrogaInfo.mensaje}</p>
                <p className="text-xs text-amber-700/90 dark:text-amber-300/90">
                  Guía Nº {prorrogaInfo.nrguia} - Vencimiento actual: {prorrogaInfo.fechaVencimiento || "N/D"}
                </p>
                <button
                  type="button"
                  onClick={handleProrrogarGuia}
                  disabled={isProrrogando}
                  className="px-3 py-2 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-sm font-semibold disabled:opacity-50"
                >
                  {isProrrogando ? "Prorrogando..." : "Aplicar prórroga +30 días"}
                </button>
              </div>
            )}
          </div>
          
          <div className="flex justify-between pt-4">
            <button
              onClick={() => setStep(1)}
              className="px-6 py-4 bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 font-semibold rounded-xl text-lg flex items-center gap-2 active:scale-95 transition-all"
            >
              <ChevronLeft className="w-5 h-5" /> Atrás
            </button>
            <button
              disabled={!canGoNext2}
              onClick={() => setStep(3)}
              className="px-6 py-4 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 font-semibold rounded-xl text-lg disabled:opacity-50 flex items-center gap-2 active:scale-95 transition-all"
            >
              Siguiente <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}

      {/* STEP 3: VINCULAR Y FOTO */}
      {step === 3 && (
        <div className="bg-white dark:bg-zinc-900 p-6 rounded-2xl shadow-sm border border-zinc-200 dark:border-zinc-800 space-y-8 animate-in slide-in-from-right-4">
           
          {/* Remitos VINCULADOS solo si no es deposito */}
          {!esDeposito && (
            <div className="space-y-4">
              <div>
                <h3 className="text-xl font-bold text-zinc-900 dark:text-white mb-1">A. Adjuntar Remitos</h3>
                <p className="text-zinc-500 text-sm">Cargá manualmente los remitos físicos (uno por uno).</p>
              </div>

              <div className="space-y-3 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950/50 p-3">
                <div className="flex gap-2">
                  <input
                    type="number"
                    inputMode="numeric"
                    min={1}
                    placeholder="Ej: 160653"
                    value={remitoManual}
                    onChange={(e) => {
                      setRemitoManual(e.target.value);
                      if (errorRemito) setErrorRemito(null);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        agregarRemitoManual();
                      }
                    }}
                    className="w-full p-3 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                  <button
                    type="button"
                    onClick={agregarRemitoManual}
                    className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
                  >
                    Agregar
                  </button>
                </div>

                {errorRemito && <p className="text-sm text-red-500">{errorRemito}</p>}

                {remitosSeleccionadosData.length === 0 ? (
                  <p className="text-sm text-zinc-500">Todavía no agregaste remitos.</p>
                ) : (
                  <div className="max-h-[220px] overflow-y-auto space-y-2">
                    {remitosSeleccionadosData.map((r) => (
                      <div
                        key={r.id}
                        className="flex items-center justify-between rounded-lg border border-emerald-300/50 dark:border-emerald-800 bg-white dark:bg-zinc-900 px-3 py-2"
                      >
                        <span className="font-medium text-zinc-800 dark:text-zinc-100">Nº {r.nrremito}</span>
                        <button
                          type="button"
                          onClick={() => quitarRemito(r.id)}
                          className="text-xs px-2 py-1 rounded bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300"
                        >
                          Quitar
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Cámara */}
          <div className="space-y-4 pt-4 border-t border-zinc-200 dark:border-zinc-800">
             <div>
                <h3 className="text-xl font-bold text-zinc-900 dark:text-white mb-1">B. Fotos de Comprobante</h3>
                <p className="text-zinc-500 text-sm">Captura fotos de la guía impresa utilizando la cámara.</p>
              </div>
             <CameraCapture imagenes={imagenes} setImagenes={setImagenes} />
          </div>

          {errorSubmit && (
            <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-900/30 text-red-700 dark:text-red-400 font-medium rounded-xl text-sm">
              {errorSubmit}
            </div>
          )}

          <div className="text-xs text-zinc-500 dark:text-zinc-400">
            Control GPS: {gpsStatus === "ok" ? "capturado" : gpsStatus === "error" ? "error" : "pendiente"}
          </div>

          <div className="flex justify-between pt-6 border-t border-zinc-200 dark:border-zinc-800">
            <button
              onClick={() => setStep(2)}
              className="px-6 py-4 bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 font-semibold rounded-xl text-lg flex items-center gap-2 active:scale-95 transition-all"
            >
              <ChevronLeft className="w-5 h-5" /> Atrás
            </button>
            <button
              disabled={!canSubmit || isSubmitting}
              onClick={handleCompletar}
              className="px-8 py-4 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl text-lg disabled:opacity-50 disabled:hover:bg-emerald-600 flex items-center gap-2 active:scale-95 transition-all shadow-md"
            >
              {isSubmitting ? (
                 <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>Completar <Check className="w-5 h-5" /></>
              )}
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
