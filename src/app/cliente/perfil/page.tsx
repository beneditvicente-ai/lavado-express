import Link from "next/link";
import { requireRol } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { LogoutButton } from "@/components/LogoutButton";
import { PerfilClienteForm } from "@/components/PerfilClienteForm";
import { LifeBuoy, ClipboardList, Sparkles, LogOut, User } from "lucide-react";

export default async function PerfilClientePage() {
  const usuario = await requireRol("cliente");
  const supabase = await createClient();

  const [{ data: perfil }, { data: userAuth }, { count: totalPedidos }] = await Promise.all([
    supabase.from("usuarios").select("nombre, apellido, telefono").eq("id", usuario.id).single(),
    supabase.auth.getUser(),
    supabase
      .from("pedidos")
      .select("id", { count: "exact", head: true })
      .eq("cliente_id", usuario.id)
      .in("estado", ["completado", "calificado"]),
  ]);

  return (
    <main className="flex-1 max-w-2xl mx-auto w-full p-6 space-y-4">
      <div className="bg-neutral-900 text-white rounded-2xl p-6 -mt-2">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">
              {perfil?.nombre} {perfil?.apellido}
            </h1>
            <p className="text-sm text-neutral-400 mt-1">
              {totalPedidos ?? 0} lavado{totalPedidos === 1 ? "" : "s"} hecho{totalPedidos === 1 ? "" : "s"}
            </p>
          </div>
          <div className="w-16 h-16 rounded-full bg-neutral-700 flex items-center justify-center flex-shrink-0">
            <User size={28} strokeWidth={1.5} />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Link href="/cliente/ayuda" className="border rounded-xl px-4 py-4 flex items-center gap-2">
          <LifeBuoy size={20} strokeWidth={1.75} className="text-neutral-700" />
          <span className="font-medium text-sm">Ayuda</span>
        </Link>
        <Link href="/cliente/pedidos" className="border rounded-xl px-4 py-4 flex items-center gap-2">
          <ClipboardList size={20} strokeWidth={1.75} className="text-neutral-700" />
          <span className="font-medium text-sm">Actividad</span>
        </Link>
        <Link href="/cliente/postularme" className="border rounded-xl px-4 py-4 flex items-center gap-2">
          <Sparkles size={20} strokeWidth={1.75} className="text-neutral-700" />
          <span className="font-medium text-sm">Querés lavar</span>
        </Link>
        <div className="border rounded-xl px-4 py-4 flex items-center gap-2">
          <LogOut size={20} strokeWidth={1.75} className="text-neutral-700" />
          <LogoutButton className="font-medium text-sm text-neutral-900" />
        </div>
      </div>

      <PerfilClienteForm
        usuarioId={usuario.id}
        nombreInicial={perfil?.nombre ?? ""}
        apellidoInicial={perfil?.apellido ?? ""}
        telefonoInicial={perfil?.telefono ?? ""}
        email={userAuth.user?.email ?? ""}
      />
    </main>
  );
}
