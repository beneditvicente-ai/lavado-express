import { requireRol } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { VolverAPerfil } from "@/components/VolverAPerfil";
import { FotosForm } from "@/components/FotosForm";

export default async function FotosLavadorPage() {
  const usuario = await requireRol("lavador");
  const supabase = await createClient();

  const { data: fotosActuales } = await supabase
    .from("lavador_fotos")
    .select("id, tipo, storage_path")
    .eq("lavador_id", usuario.id);

  return (
    <main className="flex-1 max-w-2xl mx-auto w-full p-6 space-y-6">
      <VolverAPerfil />
      <h1 className="text-2xl font-semibold">Fotos</h1>
      <FotosForm lavadorId={usuario.id} fotosActuales={fotosActuales ?? []} />
    </main>
  );
}
