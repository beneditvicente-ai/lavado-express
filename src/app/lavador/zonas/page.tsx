import { requireRol } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { VolverAPerfil } from "@/components/VolverAPerfil";
import { ZonasForm } from "@/components/ZonasForm";

export default async function ZonasLavadorPage() {
  const usuario = await requireRol("lavador");
  const supabase = await createClient();

  const [{ data: zonasDisponibles }, { data: zonasActuales }] = await Promise.all([
    supabase.from("zonas_disponibles").select("id, nombre").order("orden"),
    supabase.from("lavador_zonas").select("zona_id").eq("lavador_id", usuario.id),
  ]);

  return (
    <main className="flex-1 max-w-2xl mx-auto w-full p-6 space-y-6">
      <VolverAPerfil />
      <h1 className="text-2xl font-semibold">Zonas de cobertura</h1>
      <ZonasForm
        lavadorId={usuario.id}
        zonasDisponibles={zonasDisponibles ?? []}
        zonaIdsActuales={(zonasActuales ?? []).map((z) => z.zona_id)}
      />
    </main>
  );
}
