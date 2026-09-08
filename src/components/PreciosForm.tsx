"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type TipoServicio = { id: string; nombre: string; descripcion: string | null };
type PrecioActual = { tipo_servicio_id: string; precio: number };

export function PreciosForm({
  lavadorId,
  tiposServicio,
  preciosActuales,
}: {
  lavadorId: string;
  tiposServicio: TipoServicio[];
  preciosActuales: PrecioActual[];
}) {
  const router = useRouter();
  const [precios, setPrecios] = useState<Record<string, string>>(() => {
    const inicial: Record<string, string> = {};
    for (const p of preciosActuales) inicial[p.tipo_servicio_id] = String(p.precio);
    return inicial;
  });
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [guardado, setGuardado] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setGuardado(false);
    setGuardando(true);

    const filas = tiposServicio
      .filter((t) => precios[t.id] && Number(precios[t.id]) > 0)
      .map((t) => ({
        lavador_id: lavadorId,
        tipo_servicio_id: t.id,
        precio: Number(precios[t.id]),
        activo: true,
      }));

    const supabase = createClient();
    const { error } = await supabase
      .from("lavador_servicios")
      .upsert(filas, { onConflict: "lavador_id,tipo_servicio_id" });

    setGuardando(false);

    if (error) {
      setError(error.message);
      return;
    }

    setGuardado(true);
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="border rounded-md p-4 space-y-3">
      <h2 className="font-medium">Tus precios por servicio</h2>

      {tiposServicio.map((t) => (
        <div key={t.id} className="flex items-center gap-3">
          <label className="w-28 text-sm font-medium">{t.nombre}</label>
          <input
            type="number"
            min={1}
            step="0.01"
            placeholder="Precio en $"
            value={precios[t.id] ?? ""}
            onChange={(e) => setPrecios({ ...precios, [t.id]: e.target.value })}
            className="flex-1 border rounded-md px-3 py-2"
          />
        </div>
      ))}

      {error && <p className="text-sm text-red-600">{error}</p>}
      {guardado && !error && <p className="text-sm text-green-600">Guardado.</p>}

      <button
        type="submit"
        disabled={guardando}
        className="bg-neutral-900 text-white rounded-md px-4 py-2 disabled:opacity-50"
      >
        {guardando ? "Guardando..." : "Guardar precios"}
      </button>
    </form>
  );
}
