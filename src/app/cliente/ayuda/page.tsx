import { requireRol } from "@/lib/auth";
import { LogoutButton } from "@/components/LogoutButton";
import { ClienteCentroAyuda } from "@/components/ClienteCentroAyuda";
import { ContactoWhatsapp } from "@/components/ContactoWhatsapp";

export default async function AyudaClientePage() {
  await requireRol("cliente");

  return (
    <main className="flex-1 max-w-2xl mx-auto w-full p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Ayuda</h1>
        <LogoutButton />
      </div>

      <ClienteCentroAyuda />
      <ContactoWhatsapp />
    </main>
  );
}
