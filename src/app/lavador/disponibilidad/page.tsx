import { requireRol } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { VolverAPerfil } from "@/components/VolverAPerfil";
import { DisponibilidadForm } from "@/components/DisponibilidadForm";

export default async function DisponibilidadLavadorPage() {
  const usuario = await requireRol("lavador");
  const supabase = await createClient();

  const { data: disponibilidadActual } = await supabase
    .from("lavador_disponibilidad")
    .select("dia_semana, hora_inicio, hora_fin")
    .eq("lavador_id", usuario.id);

  return (
    <main className="flex-1 max-w-2xl mx-auto w-full p-6 space-y-6">
      <VolverAPerfil />
      <h1 className="text-2xl font-semibold">Disponibilidad semanal</h1>
      <DisponibilidadForm lavadorId={usuario.id} disponibilidadActual={disponibilidadActual ?? []} />
    </main>
  );
}
