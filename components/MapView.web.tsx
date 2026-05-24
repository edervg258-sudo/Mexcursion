// MapView.web.tsx — mapa Leaflet con react-leaflet (solo web)
import L from 'leaflet';
import React, { useEffect } from 'react';
import { MapContainer, Marker, Popup, TileLayer, useMap } from 'react-leaflet';
import { useTemaContext } from '../lib/TemaContext';

if (typeof document !== 'undefined') {
  if (!document.querySelector('[data-leaflet]')) {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
    link.setAttribute('data-leaflet', '1');
    document.head.appendChild(link);
  }
}

function CentrarMapa({ lat, lon, zoom }: { lat: number; lon: number; zoom: number }) {
  const map = useMap();
  useEffect(() => {
    map.setView([lat, lon], zoom);
  }, [lat, lon, zoom, map]);
  return null;
}

const iconoMarcador = L.divIcon({
  className: '',
  html: `<div style="background:#E91E63;width:16px;height:16px;border-radius:50%;border:2px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,.4)"></div>`,
  iconSize: [16, 16],
  iconAnchor: [8, 8],
  popupAnchor: [0, -12],
});

interface MapViewProps {
  latitude: number;
  longitude: number;
  title?: string;
  description?: string;
  zoom?: number;
  style?: object;
}

export function MapaInteractivo({ latitude = 19.4326, longitude = -99.1332, title, description, zoom = 10 }: MapViewProps) {
  const { isDark } = useTemaContext();

  const tileUrl = isDark
    ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
    : 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';

  return (
    // @ts-ignore — MapContainer usa props de React DOM
    <MapContainer
      center={[latitude, longitude]}
      zoom={zoom}
      style={{ height: 360, width: '100%', borderRadius: 14 }}
      scrollWheelZoom
    >
      <TileLayer
        url={tileUrl}
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
      />
      <Marker position={[latitude, longitude]} icon={iconoMarcador}>
        {title && (
          <Popup>
            <div style={{ fontFamily: 'sans-serif', minWidth: 140 }}>
              <strong style={{ fontSize: 14 }}>{title}</strong>
              {description && (
                <p style={{ margin: '4px 0 0', fontSize: 12, color: '#666' }}>{description}</p>
              )}
            </div>
          </Popup>
        )}
      </Marker>
      <CentrarMapa lat={latitude} lon={longitude} zoom={zoom} />
    </MapContainer>
  );
}
