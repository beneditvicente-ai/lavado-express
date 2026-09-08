"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

// Registro publico: siempre crea un usuario con rol "cliente" (lo hace
// el trigger handle_new_user en la base). Para lavador, el camino es
// pedirlo estando logueado como cliente (ver /cliente), y lo aprueba
// el admin. Nadie se autoregistra como admin. `esLavador` solo cambia
// el mensaje y a donde se manda a la persona despues (no el rol real).
export function RegistroForm({ esLavador }: { esLavador: boolean }) {
  const router = useRouter();
  const [nombre, setNombre] = useState("");
  const [apellido, setApellido] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [esperandoConfirmacion, setEsperandoConfirmacion] = useState(false);
  const [cargando, setCargando] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setCargando(true);

    const supabase = createClient();
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { nombre, apellido } },
    });

    setCargando(false);

    if (error) {
      setError(error.message);
      return;
    }

    if (data.session) {
      // no hace falta confirmar email: ya quedo logueado
      router.push("/");
      router.refresh();
      return;
    }

    setEsperandoConfirmacion(true);
  }

  if (esperandoConfirmacion) {
    return (
      <main className="flex-1 flex items-center justify-center p-6">
        <div className="max-w-sm text-center space-y-2">
          <h1 className="text-xl font-semibold">¡Listo!</h1>
          <p className="text-neutral-600">
            Te mandamos un email para confirmar tu cuenta. Una vez que lo confirmes,{" "}
            <Link href="/login" className="underline">
              iniciá sesión
            </Link>
            .
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="flex-1 flex items-center justify-center p-6">
      <form onSubmit={onSubmit} className="w-full max-w-sm space-y-4">
        <h1 className="text-2xl font-semibold">Crear cuenta</h1>
        {esLavador && (
          <p className="text-sm text-neutral-600 bg-neutral-50 border rounded-md px-3 py-2">
            Creá tu cuenta y después vas a poder postularte como lavador.
          </p>
        )}

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <label className="text-sm font-medium">Nombre</label>
            <input
              required
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              className="w-full border rounded-md px-3 py-2"
            />
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium">Apellido</label>
            <input
              required
              value={apellido}
              onChange={(e) => setApellido(e.target.value)}
              className="w-full border rounded-md px-3 py-2"
            />
          </div>
        </div>

        <div className="space-y-1">
          <label className="text-sm font-medium">Email</label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full border rounded-md px-3 py-2"
          />
        </div>

        <div className="space-y-1">
          <label className="text-sm font-medium">Contraseña</label>
          <input
            type="password"
            required
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full border rounded-md px-3 py-2"
          />
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button
          type="submit"
          disabled={cargando}
          className="w-full bg-neutral-900 text-white rounded-md py-2 disabled:opacity-50"
        >
          {cargando ? "Creando..." : "Crear cuenta"}
        </button>

        <p className="text-sm text-neutral-500">
          ¿Ya tenés cuenta?{" "}
          <Link href="/login" className="underline">
            Iniciá sesión
          </Link>
        </p>
      </form>
    </main>
  );
}
