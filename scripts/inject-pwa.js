// scripts/inject-pwa.js
// Post-build: inyecta tags PWA en index.html y actualiza sw.js con el bundle path y version.

const fs   = require('fs');
const path = require('path');

const distDir   = path.join(__dirname, '..', 'dist');
const indexPath = path.join(distDir, 'index.html');
const swPath    = path.join(distDir, 'sw.js');

if (!fs.existsSync(indexPath)) {
  console.error('❌  dist/index.html no encontrado. Ejecuta expo export primero.');
  process.exit(1);
}

// ── 1. Leer index.html y extraer la URL del bundle ──────────────────────────
let html = fs.readFileSync(indexPath, 'utf-8');

const bundleMatch = html.match(/src="(\/_expo\/static\/js\/web\/[^"]+\.js)"/);
const bundleUrl   = bundleMatch ? bundleMatch[1] : null;

if (bundleUrl) {
  console.log(`📦  Bundle detectado: ${bundleUrl}`);
} else {
  console.warn('⚠️   No se pudo detectar la URL del bundle JS.');
}

// ── 2. Inyectar tags PWA en index.html (solo si no están ya) ────────────────
if (!html.includes('rel="manifest"')) {
  const headTags = `
  <!-- PWA -->
  <link rel="manifest" href="/manifest.json" />
  <meta name="theme-color" content="#3AB7A5" />
  <meta name="apple-mobile-web-app-capable" content="yes" />
  <meta name="apple-mobile-web-app-status-bar-style" content="default" />
  <meta name="apple-mobile-web-app-title" content="Mercursión" />
  <link rel="apple-touch-icon" href="/icons/icon-1024.png" />
  <link rel="icon" type="image/png" sizes="1024x1024" href="/icons/icon-1024.png" />
  <link rel="icon" type="image/png" sizes="48x48"     href="/icons/icon-48.png" />
`;

  const swScript = `
  <script>
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', function () {
        navigator.serviceWorker
          .register('/sw.js', { scope: '/' })
          .then(function (reg) {
            reg.addEventListener('updatefound', function () {
              var installing = reg.installing;
              installing.addEventListener('statechange', function () {
                if (installing.state === 'installed' && navigator.serviceWorker.controller) {
                  installing.postMessage('SKIP_WAITING');
                }
              });
            });
          })
          .catch(function (err) { console.warn('[SW] registro fallido:', err); });
      });
    }
  </script>
`;

  html = html.replace('</head>', headTags + '</head>');
  html = html.replace('</body>', swScript + '\n</body>');
  fs.writeFileSync(indexPath, html, 'utf-8');
  console.log('✅  PWA tags inyectados en dist/index.html');
} else {
  console.log('ℹ️   PWA tags ya presentes en index.html.');
}

// ── 3. Actualizar sw.js: version de cache + bundle en APP_SHELL ─────────────
if (!fs.existsSync(swPath)) {
  console.warn('⚠️   dist/sw.js no encontrado, saltando actualización del SW.');
  process.exit(0);
}

const buildVersion = new Date().toISOString().slice(0, 10).replace(/-/g, '');
let sw = fs.readFileSync(swPath, 'utf-8');

// Reemplazar el nombre del cache con la fecha de build
sw = sw.replace(
  /const CACHE_NAME = '[^']*'/,
  `const CACHE_NAME = 'mercursion-${buildVersion}'`
);
sw = sw.replace(
  /const RUNTIME_CACHE = '[^']*'/,
  `const RUNTIME_CACHE = 'mercursion-runtime-${buildVersion}'`
);

// Inyectar la URL del bundle en APP_SHELL si se detectó
if (bundleUrl) {
  sw = sw.replace(
    /const APP_SHELL = \[[\s\S]*?\];/,
    `const APP_SHELL = [\n  '/',\n  '/index.html',\n  '/favicon.ico',\n  '/manifest.json',\n  '/icons/icon-48.png',\n  '/icons/icon-120.png',\n  '/icons/icon-1024.png',\n  '${bundleUrl}',\n];`
  );
}

fs.writeFileSync(swPath, sw, 'utf-8');
console.log(`✅  sw.js actualizado: cache=mercursion-${buildVersion}${bundleUrl ? ', bundle pre-cacheado' : ''}`);
