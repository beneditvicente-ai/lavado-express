"use client";

import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export function LogoutButton() {
  const router = useRouter();

  async function cerrarSesion() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <button
      onClick={cerrarSesion}
      className="text-sm text-neutral-500 hover:text-neutral-800 underline"
    >
      Cerrar sesión
    </button>
  );
}
