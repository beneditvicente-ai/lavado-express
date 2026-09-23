import { redirect } from "next/navigation";

// Se fusionó con el inicio del cliente.
export default function PedirLavadoRedirect() {
  redirect("/cliente");
}
