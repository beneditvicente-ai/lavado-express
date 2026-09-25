import Link from "next/link";

export const metadata = { title: "Política de privacidad — Lavado Express" };

export default function PrivacidadPage() {
  return (
    <main className="flex-1 max-w-2xl mx-auto w-full p-6 space-y-6">
      <Link href="/cliente" className="text-sm text-foreground-muted hover:text-foreground underline transition-colors duration-200">
        ← Volver
      </Link>

      <h1 className="text-2xl font-semibold text-foreground">Política de privacidad</h1>

      <div className="space-y-4 text-sm text-foreground-muted leading-relaxed">
        <p>
          En Lavado Express usamos tus datos únicamente para conectar tu pedido con un lavador
          disponible en tu zona, coordinar el turno y procesar el pago. No vendemos ni compartimos
          tu información con terceros fuera de lo necesario para prestar el servicio.
        </p>
        <p>
          Guardamos tu nombre, dirección de lavado, datos del vehículo y ubicación aproximada solo
          mientras dure tu cuenta o el pedido activo. Los pagos se procesan a través de Mercado
          Pago — nosotros no almacenamos números de tarjeta.
        </p>
        <p>
          Los lavadores ven la información necesaria para completar el servicio (dirección,
          detalles del vehículo, ubicación en tiempo real durante el pedido Express). No ven tus
          datos de pago.
        </p>
        <p>
          Podés pedir la eliminación de tu cuenta y tus datos en cualquier momento desde tu perfil
          o escribiéndonos.
        </p>
      </div>
    </main>
  );
}
