// Service Worker - Checklist Teto Mercury (PWA)
const CACHE_NAME = 'teto-mercury-v3';

const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/style.css',
  '/script.js',
  '/manifest.json',
  '/images/logo.png',
  '/images/icon-192.png',
  '/images/icon-512.png',
  '/images/diag_21.png',
  '/images/diag_22.png',
  '/images/diag_23.png',
  '/images/diag_31.png',
  '/images/diag_32.png',
  '/images/diag_33.png',
  '/images/diag_41.png',
  '/images/diag_51.png',
  '/images/diag_dutos.png',
  '/images/diag_embalagem.png',
  '/images/diag_filtro.png'
];

// Instalação do Service Worker e pré-cache de todos os arquivos estáticos essenciais
self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    }).catch((err) => {
      console.warn('Aviso ao cachear assets estáticos no install:', err);
    })
  );
});

// Ativação e limpeza de versões anteriores de cache
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            console.log('Removendo cache antigo:', key);
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Interceptação de requisições
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // 1. Tratamento da API de dados do checklist (/api/checklist-data)
  // Estratégia Network-First com Fallback no Cache para garantir funcionamento offline
  if (url.pathname === '/api/checklist-data') {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          if (response && response.status === 200) {
            const respClone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, respClone));
          }
          return response;
        })
        .catch(async () => {
          const cached = await caches.match(event.request);
          if (cached) return cached;
          return new Response(JSON.stringify({ erro: 'Modo offline: checklist-data não encontrado em cache.' }), {
            headers: { 'Content-Type': 'application/json' }
          });
        })
    );
    return;
  }

  // 2. Outras rotas de API (ex: /api/gerar-pdf, /api/historico) devem ir direto para a rede
  if (url.pathname.startsWith('/api/')) {
    return;
  }

  // 3. Arquivos estáticos (HTML, JS, CSS, Imagens, Fontes, etc.)
  // Estratégia: Cache-First com atualização em background / fallback de rede
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }

      return fetch(event.request).then((networkResponse) => {
        if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
          return networkResponse;
        }

        const responseToCache = networkResponse.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, responseToCache);
        });

        return networkResponse;
      }).catch(() => {
        // Se for navegação de página e falhar a rede, retorna o index.html em cache
        if (event.request.mode === 'navigate') {
          return caches.match('/index.html') || caches.match('/');
        }
      });
    })
  );
});