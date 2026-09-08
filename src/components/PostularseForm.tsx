"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export function PostularseForm({ usuarioId }: { usuarioId: string }) {
  const router = useRouter();
  const [bio, setBio] = useState("");
  const [zona, setZona] = useState("");
  const [telefono, setTelefono] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setCargando(true);

    const supabase = createClient();

    // el telefono se guarda en usuarios (no en la solicitud): nunca se
    // expone publicamente, solo lo ve el propio lavador o el admin.
    const { error: errorTelefono } = await supabase
      .from("usuarios")
      .update({ telefono })
      .eq("id", usuarioId);

    if (errorTelefono) {
      setCargando(false);
      setError(errorTelefono.message);
      return;
    }

    const { error } = await supabase
      .from("solicitudes_lavador")
      .insert({ usuario_id: usuarioId, bio, zona });

    setCargando(false);

    if (error) {
      setError(error.message);
      return;
    }

    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="space-y-3 border rounded-md p-4">
      <h2 className="font-medium">Postularme como lavador</h2>

      <div className="space-y-1">
        <label className="text-sm font-medium">Contame sobre vos</label>
        <textarea
          required
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          className="w-full border rounded-md px-3 py-2"
          rows={3}
        />
      </div>

      <div className="space-y-1">
        <label className="text-sm font-medium">Zona donde trabajás</label>
        <input
          required
          value={zona}
          onChange={(e) => setZona(e.target.value)}
          placeholder="ej: Palermo, CABA"
          className="w-full border rounded-md px-3 py-2"
        />
      </div>

      <div className="space-y-1">
        <label className="text-sm font-medium">Tu teléfono</label>
        <input
          required
          type="tel"
          value={telefono}
          onChange={(e) => setTelefono(e.target.value)}
          placeholder="ej: 11 5555-5555"
          className="w-full border rounded-md px-3 py-2"
        />
        <p className="text-xs text-neutral-500">
          Nunca se muestra a los clientes — solo lo usamos internamente.
        </p>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <button
        type="submit"
        disabled={cargando}
        className="bg-neutral-900 text-white rounded-md px-4 py-2 disabled:opacity-50"
      >
        {cargando ? "Enviando..." : "Enviar postulación"}
      </button>
    </form>
  );
}
