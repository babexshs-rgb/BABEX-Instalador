/*
==================================================
BABEX Instalador (PWA)
Archivo : sw.js  (Service Worker)
==================================================
Esto es lo que hace que la app se pueda "Añadir a pantalla de
inicio" e instalarse de verdad, y que abra aunque no haya cobertura:
al instalarse, se guarda en caché una copia del "armazón" de la app
(HTML, CSS, JS, iconos). A partir de ahí, cualquier visita a la app se
sirve primero desde esa caché.

Importante — qué NO cachea este archivo: las llamadas a la API
(POST al Apps Script) nunca se tocan aquí. Los datos de verdad
(visitas, catálogo, fotos...) los gestiona IndexedDB desde db.js; este
service worker solo se ocupa de que la propia app cargue offline.

Cada vez que se suba una nueva versión de la app, hay que subir
también el número de CACHE_VERSION más abajo — si no, los móviles que
ya la tengan instalada seguirán viendo la versión vieja indefinidamente.
==================================================
*/

const CACHE_VERSION = "babex-instalador-v1";

const ARCHIVOS_DEL_ARMAZON = [
  "/",
  "/index.html",
  "/manifest.json",
  "/css/app.css",
  "/js/config.js",
  "/js/db.js",
  "/js/api.js",
  "/js/sync.js",
  "/js/app.js",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
  "/icons/icon-512-maskable.png"
];

self.addEventListener("install", function (evento) {

  evento.waitUntil(

    caches.open(CACHE_VERSION).then(function (cache) {
      return cache.addAll(ARCHIVOS_DEL_ARMAZON);
    }).then(function () {
      // No esperar a que se cierren las pestañas antiguas: la próxima
      // vez que se abra la app, que use ya la versión nueva.
      return self.skipWaiting();
    })

  );

});

self.addEventListener("activate", function (evento) {

  evento.waitUntil(

    caches.keys().then(function (nombres) {
      return Promise.all(
        nombres
          .filter(function (nombre) { return nombre !== CACHE_VERSION; })
          .map(function (nombre) { return caches.delete(nombre); })
      );
    }).then(function () {
      return self.clients.claim();
    })

  );

});

self.addEventListener("fetch", function (evento) {

  const peticion = evento.request;

  // Solo nos ocupamos de GET del propio origen (el armazón de la
  // app). Las llamadas a la API de Apps Script son POST a otro
  // dominio, y deben ir siempre directas a la red: aquí ni se tocan.
  if (peticion.method !== "GET" || new URL(peticion.url).origin !== self.location.origin) {
    return;
  }

  evento.respondWith(

    caches.match(peticion).then(function (respuestaCacheada) {

      // Estrategia: caché primero (para que la app abra al instante y
      // funcione sin cobertura, que es el requisito principal), y en
      // paralelo se pide a la red para refrescar la caché de cara a
      // la próxima vez. Si no hay caché ni red, se cae al armazón
      // general para no dejar la pantalla en blanco.
      const desdeRed = fetch(peticion)
        .then(function (respuestaDeRed) {

          if (respuestaDeRed && respuestaDeRed.ok) {
            const copia = respuestaDeRed.clone();
            caches.open(CACHE_VERSION).then(function (cache) { cache.put(peticion, copia); });
          }

          return respuestaDeRed;

        })
        .catch(function () {
          return respuestaCacheada || caches.match("/index.html");
        });

      return respuestaCacheada || desdeRed;

    })

  );

});
