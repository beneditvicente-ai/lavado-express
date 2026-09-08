"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const DIAS = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];

type Disponibilidad = { dia_semana: number; hora_inicio: string; hora_fin: string };

export function DisponibilidadForm({
  lavadorId,
  disponibilidadActual,
}: {
  lavadorId: string;
  disponibilidadActual: Disponibilidad[];
}) {
  const router = useRouter();
  const [dias, setDias] = useState(() => {
    const inicial: Record<number, { activo: boolean; inicio: string; fin: string }> = {};
    for (let i = 0; i < 7; i++) {
      const existente = disponibilidadActual.find((d) => d.dia_semana === i);
      inicial[i] = {
        activo: !!existente,
        inicio: existente?.hora_inicio?.slice(0, 5) ?? "09:00",
        fin: existente?.hora_fin?.slice(0, 5) ?? "18:00",
      };
    }
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

    const supabase = createClient();

    // se reemplaza todo el set: mas simple y confiable que hacer diffs
    const { error: errorDelete } = await supabase
      .from("lavador_disponibilidad")
      .delete()
      .eq("lavador_id", lavadorId);

    if (errorDelete) {
      setGuardando(false);
      setError(errorDelete.message);
      return;
    }

    const filas = Object.entries(dias)
      .filter(([, v]) => v.activo)
      .map(([dia, v]) => ({
        lavador_id: lavadorId,
        dia_semana: Number(dia),
        hora_inicio: v.inicio,
        hora_fin: v.fin,
      }));

    if (filas.length > 0) {
      const { error: errorInsert } = await supabase
        .from("lavador_disponibilidad")
        .insert(filas);

      if (errorInsert) {
        setGuardando(false);
        setError(errorInsert.message);
        return;
      }
    }

    setGuardando(false);
    setGuardado(true);
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="border rounded-md p-4 space-y-3">
      <h2 className="font-medium">Disponibilidad para turnos programados</h2>

      {DIAS.map((nombre, i) => (
        <div key={i} className="flex items-center gap-3">
          <label className="flex items-center gap-2 w-32">
            <input
              type="checkbox"
              checked={dias[i].activo}
              onChange={(e) =>
                setDias({ ...dias, [i]: { ...dias[i], activo: e.target.checked } })
              }
            />
            <span className="text-sm">{nombre}</span>
          </label>
          <input
            type="time"
            value={dias[i].inicio}
            disabled={!dias[i].activo}
            onChange={(e) => setDias({ ...dias, [i]: { ...dias[i], inicio: e.target.value } })}
            className="border rounded-md px-2 py-1 disabled:opacity-40"
          />
          <span className="text-sm text-neutral-400">a</span>
          <input
            type="time"
            value={dias[i].fin}
            disabled={!dias[i].activo}
            onChange={(e) => setDias({ ...dias, [i]: { ...dias[i], fin: e.target.value } })}
            className="border rounded-md px-2 py-1 disabled:opacity-40"
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
        {guardando ? "Guardando..." : "Guardar disponibilidad"}
      </button>
    </form>
  );
}
