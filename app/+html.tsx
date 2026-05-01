import { ScrollViewStyleReset } from 'expo-router/html';

const APP_URL = 'https://mexcursion.vercel.app';
const OG_IMAGE = `${APP_URL}/icons/icon-1024.png`;

// Este archivo sólo corre en web. Personaliza el <html> shell que Expo Router usa.
export default function Root({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no" />

        {/* SEO primario */}
        <title>Mexcursión — Descubre México</title>
        <meta name="description" content="Explora los 32 estados de México con paquetes de turismo curados: hotel, restaurante, transporte y actividades en un solo lugar." />
        <meta name="keywords" content="turismo México, viajes México, destinos México, excursiones, paquetes turísticos" />
        <link rel="canonical" href={APP_URL} />

        {/* Open Graph (Facebook, WhatsApp, LinkedIn) */}
        <meta property="og:type" content="website" />
        <meta property="og:site_name" content="Mexcursión" />
        <meta property="og:title" content="Mexcursión — Descubre México" />
        <meta property="og:description" content="Explora los 32 estados de México con paquetes de turismo curados: hotel, restaurante, transporte y actividades en un solo lugar." />
        <meta property="og:image" content={OG_IMAGE} />
        <meta property="og:image:width" content="1024" />
        <meta property="og:image:height" content="1024" />
        <meta property="og:url" content={APP_URL} />
        <meta property="og:locale" content="es_MX" />

        {/* Twitter Card */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="Mexcursión — Descubre México" />
        <meta name="twitter:description" content="Explora los 32 estados de México con paquetes de turismo curados." />
        <meta name="twitter:image" content={OG_IMAGE} />

        {/* PWA manifest */}
        <link rel="manifest" href="/manifest.json" />

        {/* Colores de tema para navegadores móviles */}
        <meta name="theme-color" content="#3AB7A5" />
        <meta name="msapplication-navbutton-color" content="#3AB7A5" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />

        {/* iOS: habilita "Agregar a pantalla de inicio" como app standalone */}
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-title" content="Mexcursión" />
        <link rel="apple-touch-icon" href="/icons/icon-1024.png" />

        {/* Previene que el teléfono auto-detecte números de teléfono */}
        <meta name="format-detection" content="telephone=no" />

        {/* Iconos */}
        <link rel="icon" type="image/png" sizes="48x48" href="/icons/icon-48.png" />
        <link rel="icon" href="/favicon.ico" />

        {/* Reset de estilos recomendado por react-native-web */}
        <ScrollViewStyleReset />

        {/* Quitar outline azul en inputs (web) */}
        <style>{`
          html, body { height: 100%; }
          body { overflow: hidden; }
          #root { display: flex; height: 100%; flex: 1; }
          input, textarea { outline: none !important; }
        `}</style>

        {/* Registro del Service Worker */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', function () {
                  navigator.serviceWorker
                    .register('/sw.js', { scope: '/' })
                    .then(function (reg) {
                      // Si hay una nueva versión del SW esperando, activarla
                      reg.addEventListener('updatefound', function () {
                        var newWorker = reg.installing;
                        newWorker.addEventListener('statechange', function () {
                          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                            // Hay update disponible; notificar sin forzar reload
                            newWorker.postMessage('SKIP_WAITING');
                          }
                        });
                      });
                    })
                    .catch(function (err) {
                      console.warn('[PWA] Error registrando Service Worker:', err);
                    });
                });
              }
            `,
          }}
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
