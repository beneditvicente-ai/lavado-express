import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

// Crea el perfil de lavador YA en el momento de postularse (activo=false,
// verificado=false: invisible para clientes) para que la persona pueda
// cargar fotos/precios/zonas/disponibilidad ANTES de que el admin decida.
// Al aprobar (aprobar_solicitud_lavador en la base) solo se activa ese
// mismo perfil, no se crea uno nuevo.
export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const { bio, zona, telefono } = await req.json();

  if (!bio || !zona || !telefono) {
    return NextResponse.json({ error: "Faltan datos" }, { status: 400 });
  }

  const admin = createAdminClient();

  const { error: errorTelefono } = await admin
    .from("usuarios")
    .update({ telefono })
    .eq("id", user.id);

  if (errorTelefono) {
    return NextResponse.json({ error: errorTelefono.message }, { status: 500 });
  }

  const { error: errorLavador } = await admin
    .from("lavadores")
    .upsert({ id: user.id, activo: false, verificado: false }, { onConflict: "id", ignoreDuplicates: true });

  if (errorLavador) {
    return NextResponse.json({ error: errorLavador.message }, { status: 500 });
  }

  const { error: errorSolicitud } = await admin
    .from("solicitudes_lavador")
    .insert({ usuario_id: user.id, bio, zona });

  if (errorSolicitud) {
    return NextResponse.json({ error: errorSolicitud.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
