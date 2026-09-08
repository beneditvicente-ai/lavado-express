import { requireRol } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { LogoutButton } from "@/components/LogoutButton";
import { TabsPedidos, type PedidoResumen } from "@/components/TabsPedidos";

export default async function PedidosClientePage() {
  const usuario = await requireRol("cliente");
  const supabase = await createClient();

  const { data: pedidos } = await supabase
    .from("pedidos")
    .select("id, tipo, estado, precio_total, fecha_hora_turno, creado_en, lavador_id")
    .eq("cliente_id", usuario.id)
    .order("creado_en", { ascending: false });

  const lavadorIds = [...new Set((pedidos ?? []).map((p) => p.lavador_id).filter(Boolean))];

  const { data: lavadores } = lavadorIds.length
    ? await supabase.from("lavadores_publicos").select("id, nombre").in("id", lavadorIds)
    : { data: [] as { id: string; nombre: string }[] };

  const nombrePorId = new Map((lavadores ?? []).map((l) => [l.id, l.nombre]));

  const lista: PedidoResumen[] = (pedidos ?? []).map((p) => ({
    id: p.id,
    tipo: p.tipo,
    estado: p.estado,
    precio_total: p.precio_total,
    fecha_hora_turno: p.fecha_hora_turno,
    creado_en: p.creado_en,
    contraparteNombre: (p.lavador_id && nombrePorId.get(p.lavador_id)) || "—",
  }));

  return (
    <main className="flex-1 max-w-2xl mx-auto w-full p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Mis pedidos</h1>
        <LogoutButton />
      </div>

      <TabsPedidos pedidos={lista} etiquetaContraparte="Lavador" />
    </main>
  );
}
