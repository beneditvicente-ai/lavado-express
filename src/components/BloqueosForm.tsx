"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Bloqueo = { id: string; fecha: string; hora_inicio: string; hora_fin: string; motivo: string | null };

export function BloqueosForm({
  lavadorId,
  bloqueosActuales,
}: {
  lavadorId: string;
  bloqueosActuales: Bloqueo[];
}) {
  const router = useRouter();
  const [fecha, setFecha] = useState("");
  const [horaInicio, setHoraInicio] = useState("09:00");
  const [horaFin, setHoraFin] = useState("18:00");
  const [motivo, setMotivo] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);

  async function agregar(e: React.FormEvent) {
    e.preventDefault();
    if (!fecha) return;
    setError(null);

    if (horaFin <= horaInicio) {
      setError(
        "La hora de fin tiene que ser después de la de inicio (ojo con 12:00 — el reloj lo interpreta como medianoche, no mediodía)."
      );
      return;
    }

    setCargando(true);

    const supabase = createClient();
    const { error } = await supabase.from("lavador_bloqueos").insert({
      lavador_id: lavadorId,
      fecha,
      hora_inicio: horaInicio,
      hora_fin: horaFin,
      motivo: motivo || null,
    });

    setCargando(false);

    if (error) {
      setError(error.message);
      return;
    }

    setFecha("");
    setMotivo("");
    router.refresh();
  }

  async function borrar(id: string) {
    setError(null);
    const supabase = createClient();
    const { error } = await supabase.from("lavador_bloqueos").delete().eq("id", id);
    if (error) {
      setError(error.message);
      return;
    }
    router.refresh();
  }

  const proximos = [...bloqueosActuales].sort((a, b) => a.fecha.localeCompare(b.fecha));

  return (
    <div className="border rounded-md p-4 space-y-3">
      <h2 className="font-medium">Bloquear un horario puntual</h2>
      <p className="text-sm text-neutral-500">
        Además de tu disponibilidad semanal, podés marcar un día/horario específico en el
        que no vas a poder trabajar (turno médico, viaje, etc).
      </p>

      {proximos.length > 0 && (
        <div className="space-y-1">
          {proximos.map((b) => (
            <div key={b.id} className="flex items-center justify-between text-sm border-t pt-1">
              <span>
                {new Date(b.fecha + "T00:00:00").toLocaleDateString("es-AR")} ·{" "}
                {b.hora_inicio.slice(0, 5)} a {b.hora_fin.slice(0, 5)}
                {b.motivo ? ` · ${b.motivo}` : ""}
              </span>
              <button
                onClick={() => borrar(b.id)}
                className="text-neutral-400 hover:text-red-600"
                aria-label="Quitar bloqueo"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}

      <form onSubmit={agregar} className="space-y-2">
        <input
          type="date"
          required
          value={fecha}
          onChange={(e) => setFecha(e.target.value)}
          className="border rounded-md px-3 py-2"
        />
        <div className="flex items-center gap-2">
          <input
            type="time"
            value={horaInicio}
            onChange={(e) => setHoraInicio(e.target.value)}
            className="border rounded-md px-2 py-1"
          />
          <span className="text-sm text-neutral-400">a</span>
          <input
            type="time"
            value={horaFin}
            onChange={(e) => setHoraFin(e.target.value)}
            className="border rounded-md px-2 py-1"
          />
        </div>
        <input
          value={motivo}
          onChange={(e) => setMotivo(e.target.value)}
          placeholder="Motivo (opcional)"
          className="w-full border rounded-md px-3 py-2"
        />

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button
          type="submit"
          disabled={cargando}
          className="border rounded-md px-4 py-2 disabled:opacity-50"
        >
          {cargando ? "Guardando..." : "Bloquear"}
        </button>
      </form>
    </div>
  );
}
