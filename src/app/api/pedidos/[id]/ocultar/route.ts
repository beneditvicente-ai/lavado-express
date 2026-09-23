import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

const ESTADOS_ACTIVOS = ["buscando", "pendiente_pago", "confirmado", "en_camino", "en_curso"];

// "Elimina" un pedido del historial de quien lo pide, sin borrar el
// registro real -- solo se marca oculto para esa parte. Solo aplica a
// pedidos ya terminados (no se puede ocultar algo todavia activo).
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
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
    .select("id, cliente_id, lavador_id, estado")
    .eq("id", pedidoId)
    .single();

  if (!pedido || ESTADOS_ACTIVOS.includes(pedido.estado)) {
    return NextResponse.json({ error: "No se puede eliminar un pedido activo" }, { status: 409 });
  }

  let campo: "oculto_cliente" | "oculto_lavador";
  if (pedido.cliente_id === user.id) {
    campo = "oculto_cliente";
  } else if (pedido.lavador_id === user.id) {
    campo = "oculto_lavador";
  } else {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const { error } = await admin.from("pedidos").update({ [campo]: true }).eq("id", pedidoId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
