import { NextResponse } from "next/server";

// Convierte una direccion escrita en lat/lng (geocodificacion directa,
// al reves de /api/geocodificar). Se usa para programado, donde el
// cliente escribe la direccion en vez de usar el GPS en el momento --
// asi el lavador tambien puede ver a cuantos km esta.
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const direccion = searchParams.get("direccion");

  if (!direccion) {
    return NextResponse.json({ error: "Falta la dirección" }, { status: 400 });
  }

  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(direccion)}&limit=1`,
      { headers: { "User-Agent": "LavadoExpressMVP/1.0 (contacto@lavado-express.vercel.app)" } }
    );
    const data = await res.json();
    const resultado = data?.[0];

    if (!resultado) {
      return NextResponse.json({ lat: null, lng: null });
    }

    return NextResponse.json({ lat: Number(resultado.lat), lng: Number(resultado.lon) });
  } catch {
    return NextResponse.json({ lat: null, lng: null });
  }
}
