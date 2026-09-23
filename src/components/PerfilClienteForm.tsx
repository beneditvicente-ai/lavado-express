"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export function PerfilClienteForm({
  usuarioId,
  nombreInicial,
  apellidoInicial,
  telefonoInicial,
  email,
}: {
  usuarioId: string;
  nombreInicial: string;
  apellidoInicial: string;
  telefonoInicial: string;
  email: string;
}) {
  const router = useRouter();
  const [nombre, setNombre] = useState(nombreInicial);
  const [apellido, setApellido] = useState(apellidoInicial);
  const [telefono, setTelefono] = useState(telefonoInicial);
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [guardado, setGuardado] = useState(false);

  async function guardar(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setGuardado(false);
    setGuardando(true);

    const supabase = createClient();
    const { error } = await supabase
      .from("usuarios")
      .update({ nombre, apellido, telefono })
      .eq("id", usuarioId);

    setGuardando(false);

    if (error) {
      setError(error.message);
      return;
    }

    setGuardado(true);
    router.refresh();
  }

  return (
    <form onSubmit={guardar} className="border rounded-md p-4 space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <label className="text-sm font-medium">Nombre</label>
          <input
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            className="w-full border rounded-md px-3 py-2"
          />
        </div>
        <div className="space-y-1">
          <label className="text-sm font-medium">Apellido</label>
          <input
            value={apellido}
            onChange={(e) => setApellido(e.target.value)}
            className="w-full border rounded-md px-3 py-2"
          />
        </div>
      </div>

      <div className="space-y-1">
        <label className="text-sm font-medium">Email</label>
        <input value={email} disabled className="w-full border rounded-md px-3 py-2 bg-neutral-50 text-neutral-500" />
      </div>

      <div className="space-y-1">
        <label className="text-sm font-medium">Teléfono</label>
        <input
          type="tel"
          value={telefono}
          onChange={(e) => setTelefono(e.target.value)}
          placeholder="ej: 11 5555-5555"
          className="w-full border rounded-md px-3 py-2"
        />
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}
      {guardado && !error && <p className="text-sm text-green-600">Guardado.</p>}

      <button
        type="submit"
        disabled={guardando}
        className="bg-neutral-900 text-white rounded-md px-4 py-2 disabled:opacity-50"
      >
        {guardando ? "Guardando..." : "Guardar"}
      </button>
    </form>
  );
}
