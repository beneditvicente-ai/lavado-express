import "server-only";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./types";

// SOLO para API routes / server actions de backend: bypassea RLS.
// Usar unicamente para transiciones de estado de pedidos, webhooks de
// Mercado Pago, y escrituras que ya validaron reglas de negocio en
// codigo de servidor. Nunca importar este archivo desde un Client Component.
export function createAdminClient() {
  return createSupabaseClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } }
  );
}
