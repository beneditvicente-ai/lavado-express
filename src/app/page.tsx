import Link from "next/link";
import { redirect } from "next/navigation";
import { getUsuarioActual } from "@/lib/auth";

// Un solo login para todos. Si hay sesion, redirige segun el rol
// (cliente/lavador/admin). Si no hay sesion, esta es la puerta de
// entrada publica: pensada para clientes, con un cartel aparte para
// invitar a sumarse como lavador.
export default async function Home() {
  const usuario = await getUsuarioActual();

  if (usuario) {
    if (usuario.rol === "admin") redirect("/admin");
    if (usuario.rol === "lavador") redirect("/lavador");
    redirect("/cliente");
  }

  return (
    <main className="flex-1 flex flex-col items-center justify-center p-6 gap-8">
      <div className="max-w-sm w-full text-center space-y-4">
        <h1 className="text-3xl font-semibold">Lavado Express</h1>
        <p className="text-neutral-600">Lavado de autos a domicilio, cuando lo necesites.</p>

        <div className="flex flex-col gap-2 pt-2">
          <Link
            href="/registro"
            className="bg-neutral-900 text-white rounded-md px-4 py-3 font-medium"
          >
            Crear cuenta
          </Link>
          <Link href="/login" className="border rounded-md px-4 py-3 font-medium">
            Iniciar sesión
          </Link>
        </div>
      </div>

      <Link
        href="/registro?rol=lavador"
        className="max-w-sm w-full border-2 border-dashed rounded-md px-4 py-4 text-center hover:bg-neutral-50"
      >
        <p className="font-medium">¿Querés lavar?</p>
        <p className="text-sm text-neutral-500">Sumate como lavador y empezá a generar ingresos.</p>
      </Link>
    </main>
  );
}
