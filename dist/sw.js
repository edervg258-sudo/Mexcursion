// ============================================================
//  sw.js  —  Service Worker para Mercursión PWA
//  Estrategia: Cache-first para assets estáticos,
//              Network-first para API/auth de Supabase.
// ============================================================

const CACHE_NAME = 'mercursion-20260414';
const RUNTIME_CACHE = 'mercursion-runtime-20260414';

// Assets que se cachean al instalar el SW (app shell)
const APP_SHELL = [
  '/',
  '/index.html',
  '/favicon.ico',
  '/manifest.json',
  '/icons/icon-48.png',
  '/icons/icon-120.png',
  '/icons/icon-1024.png',
  '/_expo/static/js/web/entry-5f5974e65a8f061fef8ef6199daad628.js',
];

// Dominios que nunca se cachean (API en tiempo real)
const NETWORK_ONLY_PATTERNS = [
  /supabase\.co/,
  /sentry\.io/,
];

// Dominios que van Network-First (fallback a cache si offline)
const NETWORK_FIRST_PATTERNS = [
  /supabase\.co\/rest/,
  /supabase\.co\/auth/,
  /supabase\.co\/storage/,
];

// ---- Instalación: cachear app shell ----
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) =>
      cache.addAll(APP_SHELL).catch((err) => {
        console.warn('[SW] No se pudo cachear app shell:', err);
      })
    ).then(() => self.skipWaiting())
  );
});

// ---- Activación: limpiar caches viejos ----
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME && key !== RUNTIME_CACHE)
          .map((key) => {
            console.log('[SW] Eliminando cache viejo:', key);
            return caches.delete(key);
          })
      )
    ).then(() => self.clients.claim())
  );
});

// ---- Fetch: estrategias de cache ----
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Ignorar requests que no sean GET
  if (request.method !== 'GET') return;

  // Ignorar extensiones de Chrome y protocolos no-http
  if (!url.protocol.startsWith('http')) return;

  // Network-only: Supabase realtime, auth, sentry
  if (NETWORK_ONLY_PATTERNS.some((p) => p.test(url.href))) {
    return; // El browser maneja normal
  }

  // Assets estáticos de Expo (_expo/static/) → Cache-First
  if (url.pathname.startsWith('/_expo/static/')) {
    event.respondWith(cacheFirst(request, CACHE_NAME));
    return;
  }

  // Recursos propios (imágenes, iconos, fuentes) → Cache-First con runtime cache
  if (
    url.origin === self.location.origin &&
    (url.pathname.startsWith('/assets/') ||
      url.pathname.startsWith('/icons/') ||
      url.pathname.match(/\.(png|jpg|jpeg|svg|gif|webp|woff2?|ttf|otf)$/))
  ) {
    event.respondWith(cacheFirst(request, RUNTIME_CACHE));
    return;
  }

  // Navegación (/) → Network-First con fallback al app shell
  if (request.mode === 'navigate') {
    event.respondWith(networkFirstWithShellFallback(request));
    return;
  }

  // Todo lo demás → Network-First con fallback a cache
  event.respondWith(networkFirst(request, RUNTIME_CACHE));
});

// ---- Estrategia: Cache-First ----
async function cacheFirst(request, cacheName) {
  const cached = await caches.match(request);
  if (cached) return cached;
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    return new Response('Sin conexión', { status: 503 });
  }
}

// ---- Estrategia: Network-First con fallback a cache ----
async function networkFirst(request, cacheName) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    const cached = await caches.match(request);
    return cached || new Response('Sin conexión', { status: 503 });
  }
}

// ---- Estrategia: Network-First para navegación, fallback al index.html ----
async function networkFirstWithShellFallback(request) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    const cached =
      (await caches.match(request)) ||
      (await caches.match('/index.html')) ||
      (await caches.match('/'));
    return cached || new Response('Sin conexión', { status: 503 });
  }
}

// ---- Mensaje desde la app: forzar actualización ----
self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
