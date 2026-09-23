import { requireRol } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { VolverAPerfil } from "@/components/VolverAPerfil";
import { CompanerosForm } from "@/components/CompanerosForm";

export default async function CompanerosLavadorPage() {
  const usuario = await requireRol("lavador");
  const supabase = await createClient();

  const { data: companerosActuales } = await supabase
    .from("lavador_companeros")
    .select("id, nombre")
    .eq("lavador_id", usuario.id);

  return (
    <main className="flex-1 max-w-2xl mx-auto w-full p-6 space-y-6">
      <VolverAPerfil />
      <h1 className="text-2xl font-semibold">Tu equipo</h1>
      <CompanerosForm lavadorId={usuario.id} companerosActuales={companerosActuales ?? []} />
    </main>
  );
}
