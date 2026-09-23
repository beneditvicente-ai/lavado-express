import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

// El lavador marca "Terminé". Exige que ya haya subido al menos una foto
// del resultado (pedido_fotos) -- si no, no se puede completar.
export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: pedidoId } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const admin = createAdminClient();

  const { data: pedido } = await admin
    .from("pedidos")
    .select("id, lavador_id, estado")
    .eq("id", pedidoId)
    .single();

  if (!pedido || pedido.lavador_id !== user.id || pedido.estado !== "en_curso") {
    return NextResponse.json({ error: "No se puede completar este pedido" }, { status: 409 });
  }

  const { count } = await admin
    .from("pedido_fotos")
    .select("id", { count: "exact", head: true })
    .eq("pedido_id", pedidoId);

  if (!count) {
    return NextResponse.json(
      { error: "Subí al menos una foto del resultado antes de marcar como terminado" },
      { status: 400 }
    );
  }

  const { error } = await admin
    .from("pedidos")
    .update({ estado: "completado", actualizado_en: new Date().toISOString() })
    .eq("id", pedidoId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  await admin.from("pedido_eventos").insert({
    pedido_id: pedidoId,
    estado_anterior: "en_curso",
    estado_nuevo: "completado",
    actor: "lavador",
  });

  return NextResponse.json({ ok: true });
}
