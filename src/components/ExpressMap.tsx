"use client";

import { useEffect } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// fix del icono default de Leaflet, que rompe con bundlers como Next.js
const iconoPedido = new L.Icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

const iconoYo = new L.Icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [20, 33],
  iconAnchor: [10, 33],
  className: "hue-rotate-180",
});

type Punto = { id: string; lat: number; lng: number; etiqueta: string };

function Recentrar({ centro }: { centro: [number, number] }) {
  const map = useMap();
  useEffect(() => {
    map.setView(centro);
  }, [centro, map]);
  return null;
}

export function ExpressMap({
  centro,
  miPosicion,
  puntos,
}: {
  centro: [number, number];
  miPosicion: [number, number] | null;
  puntos: Punto[];
}) {
  return (
    <div className="h-72 rounded-md overflow-hidden border">
      <MapContainer center={centro} zoom={13} style={{ height: "100%", width: "100%" }}>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <Recentrar centro={centro} />
        {miPosicion && (
          <Marker position={miPosicion} icon={iconoYo}>
            <Popup>Vos</Popup>
          </Marker>
        )}
        {puntos.map((p) => (
          <Marker key={p.id} position={[p.lat, p.lng]} icon={iconoPedido}>
            <Popup>{p.etiqueta}</Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}
