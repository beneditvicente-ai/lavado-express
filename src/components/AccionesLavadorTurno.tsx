"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export function AccionesLavadorTurno({
  pedidoId,
  lavadorId,
  estado,
  fotosIniciales,
}: {
  pedidoId: string;
  lavadorId: string;
  estado: string;
  fotosIniciales: string[];
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [fotos, setFotos] = useState(fotosIniciales);
  const [subiendo, setSubiendo] = useState(false);
  const [procesando, setProcesando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function llegue() {
    setError(null);
    setProcesando(true);
    const res = await fetch(`/api/pedidos/${pedidoId}/marcar-en-curso`, { method: "POST" });
    const data = await res.json();
    setProcesando(false);
    if (!res.ok) return setError(data.error ?? "No se pudo marcar");
    router.refresh();
  }

  async function subirFoto(file: File) {
    setError(null);
    setSubiendo(true);
    const supabase = createClient();
    const path = `${lavadorId}/resultado-${pedidoId}-${Date.now()}-${file.name}`;

    const { error: errorSubida } = await supabase.storage.from("lavador-fotos").upload(path, file);
    if (errorSubida) {
      setSubiendo(false);
      setError(errorSubida.message);
      return;
    }

    const { error: errorInsert } = await supabase
      .from("pedido_fotos")
      .insert({ pedido_id: pedidoId, storage_path: path });
    setSubiendo(false);
    if (errorInsert) return setError(errorInsert.message);

    const url = supabase.storage.from("lavador-fotos").getPublicUrl(path).data.publicUrl;
    setFotos((prev) => [...prev, url]);
  }

  async function termine() {
    if (fotos.length === 0) {
      setError("Subí al menos una foto del resultado primero.");
      return;
    }
    setError(null);
    setProcesando(true);
    const res = await fetch(`/api/pedidos/${pedidoId}/completar`, { method: "POST" });
    const data = await res.json();
    setProcesando(false);
    if (!res.ok) return setError(data.error ?? "No se pudo completar");
    router.refresh();
  }

  if (estado === "confirmado") {
    return (
      <div className="mt-1">
        <button
          onClick={llegue}
          disabled={procesando}
          className="bg-neutral-900 text-white rounded-md px-3 py-1.5 text-xs disabled:opacity-50"
        >
          {procesando ? "..." : "Llegué"}
        </button>
        {error && <p className="text-xs text-red-600 mt-1">{error}</p>}
      </div>
    );
  }

  if (estado === "en_curso") {
    return (
      <div className="mt-1 space-y-2">
        <p className="text-xs font-medium">Fotos del resultado</p>
        <p className="text-xs text-neutral-500">
          Al menos una foto tiene que mostrar la patente del auto bien visible, para confirmar que es este vehículo.
        </p>
        <div className="flex flex-wrap gap-2">
          {fotos.map((url, i) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img key={i} src={url} alt="Resultado" className="w-14 h-14 object-cover rounded-md border" />
          ))}
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={subiendo}
            className="w-14 h-14 border-2 border-dashed rounded-md text-xs text-neutral-500 disabled:opacity-50"
          >
            {subiendo ? "..." : "+ Foto"}
          </button>
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) subirFoto(file);
              e.target.value = "";
            }}
          />
        </div>
        {error && <p className="text-xs text-red-600">{error}</p>}
        <button
          onClick={termine}
          disabled={procesando || fotos.length === 0}
          className="bg-neutral-900 text-white rounded-md px-3 py-1.5 text-xs disabled:opacity-50"
        >
          {procesando ? "..." : "Marcar como terminado"}
        </button>
      </div>
    );
  }

  return null;
}
