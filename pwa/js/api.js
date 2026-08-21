/*
==================================================
BABEX Instalador (PWA)
Archivo : api.js
==================================================
Toda comunicación con el servidor pasa por aquí, y solo por aquí:
una única función, `llamar()`, que sabe cómo hablar con Apps Script
sin toparse con CORS.

Por qué Content-Type: text/plain en vez de application/json:
el cuerpo SÍ es JSON, pero declararlo como application/json obliga al
navegador a mandar antes una petición OPTIONS (preflight) para
preguntar permiso, y Apps Script no sabe contestar a un OPTIONS —
devuelve un error y la petición real ni llega a hacerse. text/plain
es una "petición simple" para el navegador: no hay preflight, y en el
servidor se parsea igual porque ahí se lee el texto y se hace
JSON.parse() a mano.

Todas las llamadas devuelven un objeto con esta forma:
  { ok: true,  ...datos }          → salió bien
  { ok: false, error: "..." }      → el servidor respondió con un error
  { ok: false, offline: true }     → no se pudo ni contactar (sin red)
==================================================
*/

const BabexAPI = (function () {

  const TIEMPO_LIMITE_MS = 15000;

  function llamar(accion, datos) {

    const cuerpo = Object.assign({ accion: accion }, datos || {});

    const controlador = new AbortController();
    const aviso = setTimeout(function () { controlador.abort(); }, TIEMPO_LIMITE_MS);

    return fetch(BABEX_CONFIG.API_URL, {

      method: "POST",
      // "text/plain" a propósito: ver la nota de cabecera del archivo.
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify(cuerpo),
      signal: controlador.signal

    })
      .then(function (respuesta) {

        clearTimeout(aviso);

        if (!respuesta.ok) {
          return { ok: false, error: "El servidor respondió con un error (" + respuesta.status + ")." };
        }

        return respuesta.json();

      })
      .catch(function (error) {

        clearTimeout(aviso);

        // No hay forma fiable de distinguir "sin red" de otros fallos
        // de fetch, pero para esta app da igual: en cualquier caso lo
        // correcto es tratarlo como "no se pudo, se reintentará" y
        // seguir trabajando en local.
        return { ok: false, offline: true, error: "Sin conexión con el servidor." };

      });

  }

  let token = null;

  return {

    fijarToken: function (t) { token = t; },

    ping: function () {
      return llamar("ping", {});
    },

    login: function (email, password) {
      return llamar("login", {
        email: email,
        password: password,
        dispositivo: (navigator.userAgent || "").slice(0, 120)
      });
    },

    cerrarSesion: function () {
      return llamar("cerrarSesion", { token: token });
    },

    misVisitas: function () {
      return llamar("misVisitas", { token: token });
    },

    datosVisita: function (citaId) {
      return llamar("datosVisita", { token: token, citaId: citaId });
    },

    sincronizar: function (cambios) {
      return llamar("sincronizar", { token: token, cambios: cambios });
    },

    subirFoto: function (datosFoto) {
      return llamar("subirFoto", Object.assign({ token: token }, datosFoto));
    }

  };

})();
