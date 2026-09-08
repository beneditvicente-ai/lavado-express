import { requireRol } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { LogoutButton } from "@/components/LogoutButton";
import { TabsPedidos, type PedidoResumen } from "@/components/TabsPedidos";

export default async function PedidosLavadorPage() {
  const usuario = await requireRol("lavador");
  const supabase = await createClient();

  const { data: pedidos } = await supabase
    .from("pedidos")
    .select("id, tipo, estado, precio_total, fecha_hora_turno, creado_en")
    .eq("lavador_id", usuario.id)
    .order("creado_en", { ascending: false });

  const lista: PedidoResumen[] = await Promise.all(
    (pedidos ?? []).map(async (p) => {
      const { data: contraparte } = await supabase.rpc("get_perfil_publico_contraparte", {
        p_pedido_id: p.id,
      });
      return {
        id: p.id,
        tipo: p.tipo,
        estado: p.estado,
        precio_total: p.precio_total,
        fecha_hora_turno: p.fecha_hora_turno,
        creado_en: p.creado_en,
        contraparteNombre: contraparte?.[0]?.nombre ?? "—",
      };
    })
  );

  return (
    <main className="flex-1 max-w-2xl mx-auto w-full p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Mis turnos</h1>
        <LogoutButton />
      </div>

      <TabsPedidos pedidos={lista} etiquetaContraparte="Cliente" />
    </main>
  );
}
