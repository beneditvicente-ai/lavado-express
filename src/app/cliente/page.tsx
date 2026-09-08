import Link from "next/link";
import { requireRol } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { LogoutButton } from "@/components/LogoutButton";
import { PostularseSection } from "@/components/PostularseSection";

export default async function ClientePage() {
  const usuario = await requireRol("cliente");
  const supabase = await createClient();

  const { data: solicitudPendiente } = await supabase
    .from("solicitudes_lavador")
    .select("id, estado, creado_en")
    .eq("usuario_id", usuario.id)
    .eq("estado", "pendiente")
    .maybeSingle();

  return (
    <main className="flex-1 max-w-2xl mx-auto w-full p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Hola, {usuario.nombre}</h1>
        <LogoutButton />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Link
          href="/cliente/pedir"
          className="bg-neutral-900 text-white rounded-md px-4 py-3 text-center font-medium"
        >
          Pedir un lavado
        </Link>
        <Link
          href="/cliente/pedidos"
          className="border rounded-md px-4 py-3 text-center font-medium"
        >
          Mis pedidos
        </Link>
      </div>

      {solicitudPendiente ? (
        <div className="border rounded-md p-4">
          <p className="font-medium">Tu postulación como lavador está pendiente de revisión.</p>
          <p className="text-sm text-neutral-500">
            Enviada el {new Date(solicitudPendiente.creado_en).toLocaleDateString("es-AR")}.
          </p>
        </div>
      ) : (
        <PostularseSection usuarioId={usuario.id} />
      )}
    </main>
  );
}
