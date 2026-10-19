import "server-only";
import webpush from "web-push";
import { createAdminClient } from "@/lib/supabase/admin";

// Notificaciones push a lavadores cuando aparece un pedido nuevo que les
// puede interesar (misma zona de cobertura que el pedido). Requiere
// NEXT_PUBLIC_VAPID_PUBLIC_KEY y VAPID_PRIVATE_KEY en las variables de
// entorno (Vercel > Settings > Environment Variables).
function configurarVapid() {
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  if (!publicKey || !privateKey) {
    throw new Error("Faltan NEXT_PUBLIC_VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY en las variables de entorno.");
  }
  webpush.setVapidDetails("mailto:contacto@lavado-express.vercel.app", publicKey, privateKey);
}

// Lavadores activos cuya zona de cobertura (lavador_zonas) incluye la
// zona pasada Y que ofrecen el tipo de servicio pedido -- son los
// candidatos reales a recibir el pedido nuevo (si no ofrecen ese
// servicio, no tiene sentido avisarles).
export async function lavadorIdsPorZona(zonaId: string, tipoServicioId: string): Promise<string[]> {
  const admin = createAdminClient();
  const [{ data: porZona }, { data: porServicio }] = await Promise.all([
    admin
      .from("lavador_zonas")
      .select("lavador_id, lavadores!inner(activo)")
      .eq("zona_id", zonaId)
      .eq("lavadores.activo", true),
    admin
      .from("lavador_servicios")
      .select("lavador_id")
      .eq("tipo_servicio_id", tipoServicioId)
      .eq("activo", true),
  ]);

  const idsPorServicio = new Set((porServicio ?? []).map((r: { lavador_id: string }) => r.lavador_id));
  return [...new Set((porZona ?? []).map((r: { lavador_id: string }) => r.lavador_id))].filter((id) =>
    idsPorServicio.has(id)
  );
}

// Manda un push a cada suscripción activa de los lavadores dados. Si una
// suscripción ya no es válida (el lavador desinstaló, revocó el permiso,
// etc.) la borramos para no seguir intentando.
export async function notificarLavadores(
  lavadorIds: string[],
  payload: { titulo: string; cuerpo: string; url: string }
) {
  if (lavadorIds.length === 0) return;

  let configurado = true;
  try {
    configurarVapid();
  } catch (e) {
    configurado = false;
    console.error("[push] no configurado:", e);
  }
  if (!configurado) return;

  const admin = createAdminClient();
  const { data: subs } = await admin
    .from("push_subscriptions")
    .select("id, endpoint, p256dh, auth")
    .in("lavador_id", lavadorIds);

  if (!subs || subs.length === 0) return;

  await Promise.all(
    subs.map(async (s: { id: string; endpoint: string; p256dh: string; auth: string }) => {
      try {
        await webpush.sendNotification(
          { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
          JSON.stringify({ title: payload.titulo, body: payload.cuerpo, url: payload.url })
        );
      } catch (err: unknown) {
        const statusCode = (err as { statusCode?: number })?.statusCode;
        if (statusCode === 404 || statusCode === 410) {
          await admin.from("push_subscriptions").delete().eq("id", s.id);
        } else {
          console.error("[push] error enviando:", err);
        }
      }
    })
  );
}
