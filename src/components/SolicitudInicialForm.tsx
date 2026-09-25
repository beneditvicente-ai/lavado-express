"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function SolicitudInicialForm() {
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

    const res = await fetch("/api/lavador/postularse", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ bio, zona, telefono }),
    });
    const data = await res.json();

    setCargando(false);

    if (!res.ok) {
      setError(data.error ?? "No se pudo enviar la postulación");
      return;
    }

    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="space-y-3 border rounded-md p-4">
      <h2 className="font-medium">Postularme como lavador</h2>
      <p className="text-sm text-neutral-500">
        Contanos sobre vos. En el siguiente paso vas a poder cargar fotos, precios,
        zonas y disponibilidad.
      </p>

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
          Se lo compartimos al cliente por WhatsApp recién después de que confirme y pague el turno
          (nunca antes).
        </p>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <button
        type="submit"
        disabled={cargando}
        className="bg-neutral-900 text-white rounded-md px-4 py-2 disabled:opacity-50"
      >
        {cargando ? "Enviando..." : "Continuar"}
      </button>
    </form>
  );
}
