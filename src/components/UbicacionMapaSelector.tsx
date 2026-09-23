"use client";

import { useMemo } from "react";
import { MapContainer, TileLayer, Marker, useMapEvents } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

const icono = new L.Icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

function MarcadorArrastrable({
  posicion,
  onMover,
}: {
  posicion: [number, number];
  onMover: (lat: number, lng: number) => void;
}) {
  useMapEvents({
    click(e) {
      onMover(e.latlng.lat, e.latlng.lng);
    },
  });

  return (
    <Marker
      position={posicion}
      icon={icono}
      draggable
      eventHandlers={{
        dragend: (e) => {
          const marker = e.target as L.Marker;
          const pos = marker.getLatLng();
          onMover(pos.lat, pos.lng);
        },
      }}
    />
  );
}

export function UbicacionMapaSelector({
  posicion,
  onMover,
}: {
  posicion: [number, number];
  onMover: (lat: number, lng: number) => void;
}) {
  // evita reinicializar el mapa en cada render (solo el centro inicial importa)
  const centroInicial = useMemo(() => posicion, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="h-64 rounded-md overflow-hidden border">
      <MapContainer center={centroInicial} zoom={16} style={{ height: "100%", width: "100%" }}>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <MarcadorArrastrable posicion={posicion} onMover={onMover} />
      </MapContainer>
    </div>
  );
}
