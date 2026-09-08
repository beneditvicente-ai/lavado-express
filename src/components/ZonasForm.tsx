"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type ZonaDisponible = { id: string; nombre: string };

export function ZonasForm({
  lavadorId,
  zonasDisponibles,
  zonaIdsActuales,
}: {
  lavadorId: string;
  zonasDisponibles: ZonaDisponible[];
  zonaIdsActuales: string[];
}) {
  const router = useRouter();
  const [seleccion, setSeleccion] = useState<Set<string>>(new Set(zonaIdsActuales));
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [guardado, setGuardado] = useState(false);

  function toggle(id: string) {
    const copia = new Set(seleccion);
    if (copia.has(id)) copia.delete(id);
    else copia.add(id);
    setSeleccion(copia);
  }

  async function guardar() {
    setError(null);
    setGuardado(false);
    setGuardando(true);

    const supabase = createClient();

    // se reemplaza todo el set: mas simple que hacer diffs
    const { error: errorDelete } = await supabase
      .from("lavador_zonas")
      .delete()
      .eq("lavador_id", lavadorId);

    if (errorDelete) {
      setGuardando(false);
      setError(errorDelete.message);
      return;
    }

    if (seleccion.size > 0) {
      const filas = [...seleccion].map((zona_id) => ({ lavador_id: lavadorId, zona_id }));
      const { error: errorInsert } = await supabase.from("lavador_zonas").insert(filas);
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
    <div className="border rounded-md p-4 space-y-3">
      <h2 className="font-medium">Zonas donde trabajás</h2>
      <p className="text-sm text-neutral-500">
        Elegí de la lista (así el sistema puede encontrarte cuando un cliente busque en tu zona).
      </p>

      <div className="flex flex-wrap gap-2">
        {zonasDisponibles.map((z) => (
          <button
            key={z.id}
            type="button"
            onClick={() => toggle(z.id)}
            className={`rounded-full px-3 py-1.5 text-sm border-2 ${
              seleccion.has(z.id)
                ? "bg-neutral-900 text-white border-neutral-900"
                : "border-neutral-200"
            }`}
          >
            {z.nombre}
          </button>
        ))}
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}
      {guardado && !error && <p className="text-sm text-green-600">Guardado.</p>}

      <button
        onClick={guardar}
        disabled={guardando}
        className="bg-neutral-900 text-white rounded-md px-4 py-2 disabled:opacity-50"
      >
        {guardando ? "Guardando..." : "Guardar zonas"}
      </button>
    </div>
  );
}
