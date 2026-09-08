import { RegistroForm } from "@/components/RegistroForm";

export default async function RegistroPage({
  searchParams,
}: {
  searchParams: Promise<{ rol?: string }>;
}) {
  const { rol } = await searchParams;
  return <RegistroForm esLavador={rol === "lavador"} />;
}
