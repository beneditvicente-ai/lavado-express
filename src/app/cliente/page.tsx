import Link from "next/link";
import { requireRol } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { LogoutButton } from "@/components/LogoutButton";
import { PedirLavadoWizard } from "@/components/PedirLavadoWizard";

export default async function ClientePage() {
  const usuario = await requireRol("cliente");
  const supabase = await createClient();

  const [{ data: solicitudPendiente }, { count: activos }, { data: tiposServicio }, { data: zonasDisponibles }] =
    await Promise.all([
      supabase
        .from("solicitudes_lavador")
        .select("id, estado, creado_en")
        .eq("usuario_id", usuario.id)
        .eq("estado", "pendiente")
        .maybeSingle(),
      supabase
        .from("pedidos")
        .select("id", { count: "exact", head: true })
        .eq("cliente_id", usuario.id)
        .in("estado", ["buscando", "pendiente_pago", "confirmado", "en_camino", "en_curso"]),
      supabase.from("tipos_servicio").select("id, nombre, descripcion").eq("activo", true).order("orden"),
      supabase.from("zonas_disponibles").select("id, nombre").order("orden"),
    ]);

  return (
    <main className="flex-1 max-w-2xl mx-auto w-full p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Hola, {usuario.nombre}</h1>
        <LogoutButton />
      </div>

      {activos ? (
        <Link
          href="/cliente/pedidos"
          className="block border border-border rounded-2xl px-4 py-3 bg-surface transition-colors duration-200 active:scale-95 hover:border-accent/50"
        >
          <p className="text-sm text-foreground">
            Tenés <span className="font-semibold text-accent">{activos}</span> pedido
            {activos === 1 ? "" : "s"} activo{activos === 1 ? "" : "s"} — tocá para ver
          </p>
        </Link>
      ) : null}

      <PedirLavadoWizard
        usuarioId={usuario.id}
        tiposServicio={tiposServicio ?? []}
        zonasDisponibles={zonasDisponibles ?? []}
      />

      {solicitudPendiente ? (
        <div className="border border-border rounded-2xl p-4 bg-surface">
          <p className="font-medium text-foreground">Tu postulación como lavador está pendiente de revisión.</p>
          <p className="text-sm text-foreground-muted mt-1">
            Te vamos a contactar por mail o teléfono en breve. Mientras tanto podés
            seguir completando tus datos.
          </p>
          <Link href="/cliente/postularme" className="text-sm text-accent underline mt-2 inline-block">
            Ver / completar mi postulación
          </Link>
        </div>
      ) : (
        <Link
          href="/cliente/postularme"
          className="block border-2 border-dashed border-border rounded-2xl px-4 py-4 text-center transition-colors duration-200 active:scale-95 hover:border-accent/50 hover:bg-surface"
        >
          <p className="font-medium text-foreground">¿Querés lavar?</p>
          <p className="text-sm text-foreground-muted">Sumate como lavador y empezá a generar ingresos.</p>
        </Link>
      )}

      <footer className="pt-4 border-t border-border text-center space-y-1.5">
        <p className="text-xs text-foreground-muted">
          Tus datos y pagos están protegidos. Procesamos los cobros a través de Mercado Pago.
        </p>
        <p className="text-xs text-foreground-muted">
          <Link href="/privacidad" className="underline hover:text-foreground transition-colors duration-200">
            Política de privacidad
          </Link>
          {" · "}
          <Link href="/terminos" className="underline hover:text-foreground transition-colors duration-200">
            Términos y condiciones
          </Link>
        </p>
      </footer>
    </main>
  );
}
