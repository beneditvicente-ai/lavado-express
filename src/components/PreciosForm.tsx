"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type TipoVehiculo = "auto" | "suv" | "pickup";
type PrecioActual = { tipo_vehiculo: string; precio: number };

const VEHICULOS: { valor: TipoVehiculo; etiqueta: string }[] = [
  { valor: "auto", etiqueta: "Auto" },
  { valor: "suv", etiqueta: "SUV" },
  { valor: "pickup", etiqueta: "Pick up" },
];

export function PreciosForm({
  lavadorId,
  preciosActuales,
}: {
  lavadorId: string;
  preciosActuales: PrecioActual[];
}) {
  const router = useRouter();
  const [precios, setPrecios] = useState<Record<string, string>>(() => {
    const inicial: Record<string, string> = {};
    for (const p of preciosActuales) inicial[p.tipo_vehiculo] = String(p.precio);
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

    const filas = VEHICULOS.filter((v) => precios[v.valor] && Number(precios[v.valor]) > 0).map((v) => ({
      lavador_id: lavadorId,
      tipo_vehiculo: v.valor,
      precio: Number(precios[v.valor]),
    }));

    const supabase = createClient();
    const { error } = await supabase
      .from("lavador_precios_vehiculo")
      .upsert(filas, { onConflict: "lavador_id,tipo_vehiculo" });

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
      <h2 className="font-medium">Tus precios por tipo de vehículo</h2>
      <p className="text-sm text-neutral-500">
        Lavado estándar. Podés cobrar distinto según sea auto, SUV o pick up.
      </p>

      {VEHICULOS.map((v) => (
        <div key={v.valor} className="flex items-center gap-3">
          <label className="w-20 text-sm font-medium">{v.etiqueta}</label>
          <input
            type="number"
            min={1}
            step="0.01"
            placeholder="Precio en $"
            value={precios[v.valor] ?? ""}
            onChange={(e) => setPrecios({ ...precios, [v.valor]: e.target.value })}
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
