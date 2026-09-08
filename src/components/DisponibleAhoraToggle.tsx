"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export function DisponibleAhoraToggle({
  lavadorId,
  disponibleInicial,
}: {
  lavadorId: string;
  disponibleInicial: boolean;
}) {
  const router = useRouter();
  const [disponible, setDisponible] = useState(disponibleInicial);
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);

  async function toggle() {
    setError(null);
    setCargando(true);
    const nuevoValor = !disponible;

    const supabase = createClient();
    const { error } = await supabase.from("lavador_estado_express").upsert(
      { lavador_id: lavadorId, disponible_ahora: nuevoValor, actualizado_en: new Date().toISOString() },
      { onConflict: "lavador_id" }
    );

    setCargando(false);

    if (error) {
      setError(error.message);
      return;
    }

    setDisponible(nuevoValor);
    router.refresh();
  }

  return (
    <div className="border rounded-md p-4 flex items-center justify-between">
      <div>
        <h2 className="font-medium">Disponible para express ahora</h2>
        <p className="text-sm text-neutral-500">
          Prendé esto solo cuando puedas salir a lavar en el momento.
        </p>
      </div>
      <button
        onClick={toggle}
        disabled={cargando}
        className={`w-14 h-8 rounded-full relative transition-colors disabled:opacity-50 ${
          disponible ? "bg-green-600" : "bg-neutral-300"
        }`}
        aria-pressed={disponible}
      >
        <span
          className={`absolute top-1 left-1 w-6 h-6 bg-white rounded-full transition-transform ${
            disponible ? "translate-x-6" : ""
          }`}
        />
      </button>
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}
