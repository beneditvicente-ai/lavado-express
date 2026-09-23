import { requireRol } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { LogoutButton } from "@/components/LogoutButton";
import { InicioLink } from "@/components/InicioLink";
import { LavadorNav } from "@/components/LavadorNav";
import { DisponibleAhoraToggle } from "@/components/DisponibleAhoraToggle";
import { ExpressPanelLavador } from "@/components/ExpressPanelLavador";

export default async function ExpressLavadorPage() {
  const usuario = await requireRol("lavador");
  const supabase = await createClient();

  const [{ data: pedidos }, { data: estadoExpress }] = await Promise.all([
    supabase
      .from("pedidos")
      .select("id, direccion_texto, lat, lng, tipo_vehiculo, detalles_vehiculo, fecha_limite_express, creado_en")
      .eq("estado", "buscando")
      .eq("tipo", "express")
      .is("lavador_id", null)
      .order("creado_en", { ascending: false }),
    supabase
      .from("lavador_estado_express")
      .select("disponible_ahora, lat, lng")
      .eq("lavador_id", usuario.id)
      .maybeSingle(),
  ]);

  const posicionInicial: [number, number] | null =
    estadoExpress?.lat != null && estadoExpress?.lng != null
      ? [estadoExpress.lat, estadoExpress.lng]
      : null;

  return (
    <main className="flex-1 max-w-2xl mx-auto w-full p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <InicioLink />
          <h1 className="text-2xl font-semibold">Express</h1>
        </div>
        <LogoutButton />
      </div>

      <LavadorNav activo="/lavador/express" />

      <DisponibleAhoraToggle
        lavadorId={usuario.id}
        disponibleInicial={estadoExpress?.disponible_ahora ?? false}
      />

      <ExpressPanelLavador
        lavadorId={usuario.id}
        pedidosIniciales={pedidos ?? []}
        posicionInicial={posicionInicial}
      />
    </main>
  );
}
