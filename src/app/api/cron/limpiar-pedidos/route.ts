import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

// Corre solo (Vercel Cron, ver vercel.json) una vez por dia. Borra pedidos
// que "no quedaron en nada": nunca los acepto nadie, o los acepto un
// lavador pero el cliente nunca pago, o se cancelaron SIN cobrar nada --
// pasados 7 dias sin movimiento. El borrado en cascada se lleva sus
// pagos/eventos/fotos/invitaciones asociados (son fake o vacios en estos
// casos).
//
// A proposito NO se tocan: cancelado_con_cargo (hubo una penalidad real
// cobrada -- registro financiero) ni cancelado_lavador (tiene una
// calificacion de penalizacion enganchada que le bajo el rating al
// lavador -- borrar el pedido borraria esa penalizacion en cascada).
const ESTADOS_A_LIMPIAR = ["buscando", "pendiente_pago", "sin_disponibilidad", "cancelado_sin_cargo"];
const DIAS_DE_GRACIA = 7;

export async function GET(req: Request) {
  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const admin = createAdminClient();
  const limite = new Date(Date.now() - DIAS_DE_GRACIA * 24 * 60 * 60 * 1000).toISOString();

  const { data: borrados, error } = await admin
    .from("pedidos")
    .delete()
    .in("estado", ESTADOS_A_LIMPIAR)
    .lt("actualizado_en", limite)
    .select("id");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, borrados: borrados?.length ?? 0 });
}
