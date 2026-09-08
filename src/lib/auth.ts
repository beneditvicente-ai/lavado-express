import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export type Rol = "cliente" | "lavador" | "admin";

export async function getUsuarioActual() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: usuario } = await supabase
    .from("usuarios")
    .select("id, rol, nombre, apellido")
    .eq("id", user.id)
    .single();

  return usuario as { id: string; rol: Rol; nombre: string; apellido: string } | null;
}

// Usar al principio de un Server Component de pantalla protegida.
export async function requireRol(rolEsperado: Rol) {
  const usuario = await getUsuarioActual();
  if (!usuario) redirect("/login");
  if (usuario.rol !== rolEsperado) redirect("/");
  return usuario;
}
