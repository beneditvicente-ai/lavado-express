import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

// El lavador marca "Llegué" -> arranca el trabajo.
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

  if (!pedido || pedido.lavador_id !== user.id || pedido.estado !== "confirmado") {
    return NextResponse.json({ error: "No se puede marcar este pedido" }, { status: 409 });
  }

  const { error } = await admin
    .from("pedidos")
    .update({ estado: "en_curso", actualizado_en: new Date().toISOString() })
    .eq("id", pedidoId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  await admin.from("pedido_eventos").insert({
    pedido_id: pedidoId,
    estado_anterior: "confirmado",
    estado_nuevo: "en_curso",
    actor: "lavador",
  });

  return NextResponse.json({ ok: true });
}
