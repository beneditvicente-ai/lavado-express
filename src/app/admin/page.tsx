import { requireRol } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { LogoutButton } from "@/components/LogoutButton";
import { SolicitudesAdminList } from "@/components/SolicitudesAdminList";

export default async function AdminPage() {
  const usuario = await requireRol("admin");
  const supabase = await createClient();

  const { data: solicitudes } = await supabase
    .from("solicitudes_lavador")
    .select("id, bio, zona, creado_en, usuario:usuario_id(nombre, apellido)")
    .eq("estado", "pendiente")
    .order("creado_en", { ascending: true });

  return (
    <main className="flex-1 max-w-2xl mx-auto w-full p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Panel admin</h1>
        <LogoutButton />
      </div>

      <section className="space-y-3">
        <h2 className="text-lg font-medium">Postulaciones de lavadores</h2>
        <SolicitudesAdminList solicitudes={(solicitudes as never) ?? []} />
      </section>
    </main>
  );
}
