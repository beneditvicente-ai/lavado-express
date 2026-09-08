import { requireRol } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { LogoutButton } from "@/components/LogoutButton";
import { PedirLavadoWizard } from "@/components/PedirLavadoWizard";

export default async function PedirLavadoPage() {
  const usuario = await requireRol("cliente");
  const supabase = await createClient();

  const [{ data: tiposServicio }, { data: zonasDisponibles }] = await Promise.all([
    supabase.from("tipos_servicio").select("id, nombre, descripcion").eq("activo", true).order("orden"),
    supabase.from("zonas_disponibles").select("id, nombre").order("orden"),
  ]);

  return (
    <main className="flex-1 max-w-2xl mx-auto w-full p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Pedir un lavado</h1>
        <LogoutButton />
      </div>

      <PedirLavadoWizard
        usuarioId={usuario.id}
        tiposServicio={tiposServicio ?? []}
        zonasDisponibles={zonasDisponibles ?? []}
      />
    </main>
  );
}
