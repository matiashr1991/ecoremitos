"use client";

import { useRef, useState } from "react";
import { Camera, X } from "lucide-react";

interface CameraCaptureProps {
  imagenes: File[];
  setImagenes: React.Dispatch<React.SetStateAction<File[]>>;
}

export function CameraCapture({ imagenes, setImagenes }: CameraCaptureProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [previews, setPreviews] = useState<string[]>(
    imagenes.map(f => URL.createObjectURL(f))
  );

  const handleCapture = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const newFiles = Array.from(e.target.files);
      const newPreviews = newFiles.map(f => URL.createObjectURL(f));
      
      setImagenes(prev => [...prev, ...newFiles]);
      setPreviews(prev => [...prev, ...newPreviews]);
    }
  };

  const removeImg = (idx: number) => {
    setImagenes(prev => {
      const copy = [...prev];
      copy.splice(idx, 1);
      return copy;
    });
    setPreviews(prev => {
      const copy = [...prev];
      URL.revokeObjectURL(copy[idx]); // free memory
      copy.splice(idx, 1);
      return copy;
    });
  };

  return (
    <div className="space-y-4">
      {/* Hidden input to open native camera flow */}
      <input 
        type="file" 
        accept="image/*" 
        capture="environment" // opens rear camera on mobile
        multiple 
        ref={fileInputRef}
        className="hidden"
        onChange={handleCapture}
      />
      
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {previews.map((src, i) => (
          <div key={i} className="relative aspect-square bg-zinc-100 dark:bg-zinc-800 rounded-xl overflow-hidden shadow-inner group">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={src} alt="Guia Captura" className="w-full h-full object-cover" />
            <button 
              onClick={() => removeImg(i)}
              className="absolute top-2 right-2 p-1.5 bg-red-500 text-white rounded-full opacity-90 hover:opacity-100 transition-opacity"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ))}

        <button 
          onClick={() => fileInputRef.current?.click()}
          className="aspect-square flex flex-col items-center justify-center gap-2 border-2 border-dashed border-emerald-300 dark:border-emerald-700 bg-emerald-50 dark:bg-emerald-900/10 text-emerald-600 dark:text-emerald-400 rounded-xl hover:bg-emerald-100 dark:hover:bg-emerald-900/30 transition-colors active:scale-95"
        >
          <Camera className="w-8 h-8" />
          <span className="text-sm font-semibold">Tomar Foto</span>
        </button>
      </div>
      
      {previews.length === 0 && (
         <p className="text-center text-sm text-amber-600 dark:text-amber-500 font-medium bg-amber-50 dark:bg-amber-900/30 p-2 rounded-lg">
            Debes adjuntar al menos una foto del comprobante físico para continuar.
         </p>
      )}
    </div>
  );
}
