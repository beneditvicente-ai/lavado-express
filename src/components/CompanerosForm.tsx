"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Companero = { id: string; nombre: string };

export function CompanerosForm({
  lavadorId,
  companerosActuales,
}: {
  lavadorId: string;
  companerosActuales: Companero[];
}) {
  const router = useRouter();
  const [nombre, setNombre] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);

  async function agregar(e: React.FormEvent) {
    e.preventDefault();
    if (!nombre.trim()) return;
    setError(null);
    setCargando(true);

    const supabase = createClient();
    const { error } = await supabase
      .from("lavador_companeros")
      .insert({ lavador_id: lavadorId, nombre: nombre.trim() });

    setCargando(false);

    if (error) {
      setError(error.message);
      return;
    }

    setNombre("");
    router.refresh();
  }

  async function borrar(id: string) {
    setError(null);
    const supabase = createClient();
    const { error } = await supabase.from("lavador_companeros").delete().eq("id", id);
    if (error) {
      setError(error.message);
      return;
    }
    router.refresh();
  }

  return (
    <div className="border rounded-md p-4 space-y-3">
      <h2 className="font-medium">Tu equipo</h2>
      <p className="text-sm text-neutral-500">
        Si trabajás con compañeros, agregá sus nombres — se muestran en tu perfil.
      </p>

      <div className="flex flex-wrap gap-2">
        {companerosActuales.map((c) => (
          <span
            key={c.id}
            className="flex items-center gap-1 bg-neutral-100 rounded-full px-3 py-1 text-sm"
          >
            {c.nombre}
            <button
              onClick={() => borrar(c.id)}
              className="text-neutral-400 hover:text-red-600"
              aria-label={`Quitar ${c.nombre}`}
            >
              ×
            </button>
          </span>
        ))}
      </div>

      <form onSubmit={agregar} className="flex gap-2">
        <input
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          placeholder="Nombre del compañero"
          className="flex-1 border rounded-md px-3 py-2"
        />
        <button
          type="submit"
          disabled={cargando}
          className="border rounded-md px-4 py-2 disabled:opacity-50"
        >
          Agregar
        </button>
      </form>

      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}
