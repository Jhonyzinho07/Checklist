const CACHE_NAME = 'teto-mercury-v1';
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/style.css',
  '/script.js',
  '/manifest.json'
];

// Instala o Service Worker e guarda os arquivos no cache
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
});

// Responde às requisições (Tenta buscar da rede, se falhar, pega do cache)
self.addEventListener('fetch', (event) => {
  // Ignora requisições para a API (não queremos cachear a geração do PDF)
  if (event.request.url.includes('/api/')) {
    return;
  }

  event.respondWith(
    fetch(event.request).catch(() => {
      return caches.match(event.request);
    })
  );
});