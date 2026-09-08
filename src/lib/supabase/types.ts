// Placeholder hasta linkear el proyecto con Supabase CLI y generar tipos reales:
//
//   npx supabase login
//   npx supabase link --project-ref <tu-project-ref>
//   npx supabase gen types typescript --linked > src/lib/supabase/types.ts
//
// Mientras tanto, Database queda como `any` para no bloquear el tipado del
// resto de la app.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Database = any;
