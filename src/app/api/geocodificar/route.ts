import { NextResponse } from "next/server";

// Convierte lat/lng en una direccion legible (geocodificacion inversa),
// usando Nominatim (OpenStreetMap, gratis). Se llama desde el servidor
// (no desde el navegador) porque Nominatim pide un User-Agent propio
// identificable, algo que un fetch de browser no puede controlar.
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const lat = searchParams.get("lat");
  const lng = searchParams.get("lng");

  if (!lat || !lng) {
    return NextResponse.json({ error: "Faltan coordenadas" }, { status: 400 });
  }

  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`,
      { headers: { "User-Agent": "LavadoExpressMVP/1.0 (contacto@lavado-express.vercel.app)" } }
    );
    const data = await res.json();

    const a = data.address ?? {};
    const calle = [a.road, a.house_number].filter(Boolean).join(" ");
    const zona = a.suburb || a.neighbourhood || a.city_district || a.town || a.city || "";
    const direccion = [calle, zona].filter(Boolean).join(", ") || data.display_name || "Ubicación actual";

    return NextResponse.json({ direccion });
  } catch {
    return NextResponse.json({ direccion: "Ubicación actual" });
  }
}
