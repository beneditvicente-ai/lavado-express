import { requireRol } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { VolverAPerfil } from "@/components/VolverAPerfil";
import { PreciosForm } from "@/components/PreciosForm";

export default async function PreciosLavadorPage() {
  const usuario = await requireRol("lavador");
  const supabase = await createClient();

  const [{ data: tiposServicio }, { data: preciosActuales }] = await Promise.all([
    supabase.from("tipos_servicio").select("id, nombre, descripcion").order("orden"),
    supabase.from("lavador_servicios").select("tipo_servicio_id, precio").eq("lavador_id", usuario.id),
  ]);

  return (
    <main className="flex-1 max-w-2xl mx-auto w-full p-6 space-y-6">
      <VolverAPerfil />
      <h1 className="text-2xl font-semibold">Precios</h1>
      <PreciosForm
        lavadorId={usuario.id}
        tiposServicio={tiposServicio ?? []}
        preciosActuales={preciosActuales ?? []}
      />
    </main>
  );
}
