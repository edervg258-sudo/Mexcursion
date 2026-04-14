import { ScrollViewStyleReset } from 'expo-router/html';

// Este archivo sólo corre en web. Personaliza el <html> shell que Expo Router usa.
export default function Root({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no" />

        {/* PWA manifest */}
        <link rel="manifest" href="/manifest.json" />

        {/* Colores de tema para navegadores móviles */}
        <meta name="theme-color" content="#3AB7A5" />
        <meta name="msapplication-navbutton-color" content="#3AB7A5" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />

        {/* iOS: habilita "Agregar a pantalla de inicio" como app standalone */}
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-title" content="Mercursión" />
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
