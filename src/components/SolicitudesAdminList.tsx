"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Solicitud = {
  id: string;
  bio: string | null;
  zona: string | null;
  creado_en: string;
  usuario: { nombre: string; apellido: string } | null;
};

export function SolicitudesAdminList({ solicitudes }: { solicitudes: Solicitud[] }) {
  const router = useRouter();
  const [procesando, setProcesando] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function aprobar(id: string) {
    setError(null);
    setProcesando(id);
    const supabase = createClient();
    const { error } = await supabase.rpc("aprobar_solicitud_lavador", {
      p_solicitud_id: id,
    });
    setProcesando(null);
    if (error) return setError(error.message);
    router.refresh();
  }

  async function rechazar(id: string) {
    const motivo = window.prompt("Motivo del rechazo (opcional):") ?? "";
    setError(null);
    setProcesando(id);
    const supabase = createClient();
    const { error } = await supabase.rpc("rechazar_solicitud_lavador", {
      p_solicitud_id: id,
      p_motivo: motivo,
    });
    setProcesando(null);
    if (error) return setError(error.message);
    router.refresh();
  }

  if (solicitudes.length === 0) {
    return <p className="text-neutral-500">No hay postulaciones pendientes.</p>;
  }

  return (
    <div className="space-y-3">
      {error && <p className="text-sm text-red-600">{error}</p>}
      {solicitudes.map((s) => (
        <div key={s.id} className="border rounded-md p-4 space-y-2">
          <p className="font-medium">
            {s.usuario?.nombre} {s.usuario?.apellido}
          </p>
          <p className="text-sm text-neutral-600">{s.bio}</p>
          <p className="text-sm text-neutral-500">Zona: {s.zona}</p>
          <p className="text-xs text-neutral-400">
            {new Date(s.creado_en).toLocaleDateString("es-AR")}
          </p>
          <div className="flex gap-2 pt-2">
            <button
              onClick={() => aprobar(s.id)}
              disabled={procesando === s.id}
              className="bg-neutral-900 text-white rounded-md px-3 py-1.5 text-sm disabled:opacity-50"
            >
              Aprobar
            </button>
            <button
              onClick={() => rechazar(s.id)}
              disabled={procesando === s.id}
              className="border rounded-md px-3 py-1.5 text-sm disabled:opacity-50"
            >
              Rechazar
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
