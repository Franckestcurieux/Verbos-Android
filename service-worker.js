/**
 * service-worker.js — Cache hors-ligne
 * Version : conjugacao-pt-epsilon12
 *
 * FIX : cache.addAll() rejette les réponses 304 (Python http.server).
 * On utilise des fetch individuels avec gestion d'erreur douce.
 */
'use strict';

var CACHE_NAME = 'conjugacao-pt-iota28';

var ASSETS_TO_CACHE = [
  './',
  './index.html',
  './ref-fr.html',
  './style.css?v=iota28',
  './stats.css?v=iota28',
  './nav.css?v=iota28',
  './manifest.json',
  './js/data.js?v=iota28',
  './js/core.js?v=iota28',
  './js/engine.js?v=iota28',
  './js/ui-selection.js?v=iota28',
  './js/ui-ref.js?v=iota28',
  './js/voice.js?v=iota28',
  './js/stats.js?v=iota28',
  './js/stats-ui.js?v=iota28',
  './js/tts.js?v=iota28',
  './js/router.js?v=iota28',
  './js/splash.js?v=iota28',
  './js/mode-erreurs.js?v=iota28',
  './js/init.js?v=iota28',
  './js/i18n.js?v=iota28',
  './data/verbs.json',
  './data/meta.json',
  './data/hints.json',
  './data/locales/fr.json',
  './data/locales/en.json',
  './data/locales/de.json',
  './data/locales/es.json',
  './data/locales/it.json',
  './data/locales/nl.json',
  './data/locales/da.json',
  './data/locales/no.json',
  './data/locales/pt-BR.json',
  './icon-120.png',
  './icon-152.png',
  './icon-167.png',
  './icon-180.png',
  './icon-192.png',
  './icon-512.png',
  './favicon-32.png',
];

/* ── Installation : fetch individuel, tolère les erreurs et les 304 ── */
self.addEventListener('install', function(event) {
  event.waitUntil(
    caches.open(CACHE_NAME).then(function(cache) {
      console.log('[SW] Mise en cache de ' + ASSETS_TO_CACHE.length + ' ressources');
      return Promise.all(ASSETS_TO_CACHE.map(function(url) {
        return fetch(new Request(url, { cache: 'reload' }))
          .then(function(response) {
            if (response && response.ok) {
              return cache.put(url, response);
            }
            /* 304 ou autre → on ignore silencieusement */
            console.warn('[SW] Non mis en cache (status ' + (response ? response.status : '?') + ') :', url);
          })
          .catch(function(err) {
            console.warn('[SW] Fetch échoué pour :', url, err.message);
          });
      }));
    }).then(function() {
      console.log('[SW] Installation terminée');
      return self.skipWaiting();
    })
  );
});

/* ── Activation : supprimer anciens caches ── */
self.addEventListener('activate', function(event) {
  event.waitUntil(
    caches.keys().then(function(keys) {
      return Promise.all(
        keys.filter(function(k) { return k !== CACHE_NAME; })
            .map(function(k) { console.log('[SW] Suppression :', k); return caches.delete(k); })
      );
    }).then(function() { return self.clients.claim(); })
  );
});

/* ── Fetch : stale-while-revalidate pour index, cache-first pour le reste ── */
self.addEventListener('fetch', function(event) {
  var url = new URL(event.request.url);
  if (event.request.method !== 'GET') return;
  if (url.origin !== location.origin) return;
  var path = url.pathname;
  if (path.endsWith('/') || path.endsWith('/index.html')) {
    event.respondWith(staleWhileRevalidate(event.request));
  } else {
    event.respondWith(cacheFirst(event.request));
  }
});

function staleWhileRevalidate(request) {
  return caches.open(CACHE_NAME).then(function(cache) {
    return cache.match(request).then(function(cached) {
      var fetchPromise = fetch(request).then(function(response) {
        if (response && response.ok) cache.put(request, response.clone());
        return response;
      }).catch(function() { return null; });
      return cached || fetchPromise;
    });
  });
}

function cacheFirst(request) {
  return caches.open(CACHE_NAME).then(function(cache) {
    return cache.match(request).then(function(cached) {
      if (cached) return cached;
      return fetch(request).then(function(response) {
        if (response && response.ok) cache.put(request, response.clone());
        return response;
      }).catch(function() { return new Response('', { status: 503 }); });
    });
  });
}
