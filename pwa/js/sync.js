/*
==================================================
BABEX Instalador (PWA)
Archivo : sync.js
==================================================
El motor de sincronización. Nunca lo llama nadie con prisa: cada
acción del instalador (crear una estancia, añadir un producto,
responder una pregunta...) se guarda al momento en IndexedDB y se
encola aquí — la app nunca espera al servidor para seguir. Esto es
sincronizarlo cuando se pueda, no si se puede.

Cuándo se dispara sola:
  - Al recuperar conexión (evento 'online').
  - Cada 30 segundos mientras la app está abierta, por si la conexión
    "aparenta" estar bien pero en realidad no llega al servidor (pasa
    mucho en furgonetas y garajes).
  - Al volver a primer plano (visibilitychange), por si se ha estado
    fuera un rato con la app en segundo plano.
  - A mano, con el botón "Sincronizar ahora".

Cómo evita mandar dos veces lo mismo: mientras hay una sincronización
en curso, cualquier otro disparo se ignora — `_enMarcha`.
==================================================
*/

const BabexSync = (function () {

  let enMarcha = false;
  let listeners = [];

  function avisar(estado) {
    listeners.forEach(function (fn) { fn(estado); });
  }

  /**
   * Sube el lote de cambios (todo lo que no sea una foto) en una sola
   * petición, y reescribe con el mapa de IDs reales tanto lo que
   * quede en la cola como las fotos pendientes que dependían de un
   * tmpId recién resuelto.
   */
  function sincronizarCambios() {

    return BabexDB.colaCompleta().then(function (cola) {

      if (!cola.length) return { sincronizados: 0, pendientesDetras: 0 };

      const envio = cola.map(function (item) {
        return { tmpId: item.tmpId, tipo: item.tipo, datos: item.datos };
      });

      return BabexAPI.sincronizar(envio).then(function (respuesta) {

        if (!respuesta || respuesta.ok === false) {

          // Sin conexión o error del servidor entero: no se toca la
          // cola, se reintentará en el siguiente ciclo.
          return { sincronizados: 0, pendientesDetras: cola.length, offline: !!respuesta.offline };

        }

        const resultados = respuesta.resultados || [];
        const mapaIds = respuesta.mapaIds || {};

        let sincronizados = 0;

        const trabajo = cola.map(function (item, indice) {

          const r = resultados[indice];

          if (!r) return Promise.resolve();

          if (r.ok) {
            sincronizados++;
            return BabexDB.quitarDeLaCola(item.localId);
          }

          if (r.pendiente) {
            // Depende de algo que no se ha resuelto todavía: se deja
            // en la cola tal cual, para el próximo intento.
            return Promise.resolve();
          }

          // Error de verdad (p.ej. datos inválidos): se deja marcado
          // para que la app pueda avisar, pero no se reintenta solo
          // infinitas veces sin que nadie se entere.
          return BabexDB.marcarErrorEnCola(item.localId, r.error);

        });

        return Promise.all(trabajo).then(function () {

          if (Object.keys(mapaIds).length) {
            return _reescribirFotosPendientes(mapaIds).then(function () {
              return { sincronizados: sincronizados, pendientesDetras: cola.length - sincronizados };
            });
          }

          return { sincronizados: sincronizados, pendientesDetras: cola.length - sincronizados };

        });

      });

    });

  }

  /**
   * Las fotos hechas mientras una estancia o un producto todavía no
   * tenían ID real (porque se crearon offline) se guardaron con un
   * tmpId. En cuanto el lote de cambios les da un ID real, se
   * reescriben aquí antes de intentar subir ninguna foto.
   */
  function _reescribirFotosPendientes(mapaIds) {

    return BabexDB.fotosPendientes().then(function (fotos) {

      const pendientesDeReescribir = fotos.filter(function (f) {
        return (typeof f.estanciaId === "string" && f.estanciaId.indexOf("tmp:") === 0) ||
               (typeof f.lineaId === "string" && f.lineaId.indexOf("tmp:") === 0);
      });

      const trabajo = pendientesDeReescribir.map(function (f) {

        if (typeof f.estanciaId === "string" && mapaIds[f.estanciaId] !== undefined) {
          f.estanciaId = mapaIds[f.estanciaId];
        }

        if (typeof f.lineaId === "string" && mapaIds[f.lineaId] !== undefined) {
          f.lineaId = mapaIds[f.lineaId];
        }

        return BabexDB.actualizarFotoPendiente(f);

      });

      return Promise.all(trabajo);

    });

  }

  /**
   * Sube las fotos pendientes, una a una. No se suben fotos que
   * todavía dependan de un tmpId sin resolver (esperan al siguiente
   * ciclo, después de que el lote de cambios correspondiente se haya
   * sincronizado con éxito).
   */
  function subirFotos() {

    return BabexDB.fotosPendientes().then(function (fotos) {

      const listas = fotos.filter(function (f) {
        return !(typeof f.estanciaId === "string" && f.estanciaId.indexOf("tmp:") === 0) &&
               !(typeof f.lineaId === "string" && f.lineaId.indexOf("tmp:") === 0);
      });

      let subidas = 0;

      function siguiente(indice) {

        if (indice >= listas.length) return Promise.resolve(subidas);

        const foto = listas[indice];

        return BabexAPI.subirFoto({
          personaId: foto.personaId || "",
          casoId: foto.casoId || "",
          inmuebleId: foto.inmuebleId || "",
          estanciaId: foto.estanciaId || "",
          nombreOriginal: foto.nombreOriginal,
          mimeType: foto.mimeType,
          base64: foto.base64,
          tipoVisita: foto.tipoVisita || "",
          descripcion: foto.descripcion || ""
        }).then(function (r) {

          if (r && r.ok) {

            subidas++;
            return BabexDB.quitarFotoPendiente(foto.localId).then(function () {
              return siguiente(indice + 1);
            });

          }

          // Si fue un fallo de red, se para aquí: seguir intentando
          // las demás solo generaría más timeouts. Si fue un error
          // real del servidor, se marca y se sigue con las demás.
          if (r && r.offline) {
            return subidas;
          }

          foto.error = r ? r.error : "Error desconocido.";
          foto.intentos = (foto.intentos || 0) + 1;

          return BabexDB.actualizarFotoPendiente(foto).then(function () {
            return siguiente(indice + 1);
          });

        });

      }

      return siguiente(0);

    });

  }

  function ejecutar() {

    if (enMarcha) return Promise.resolve({ yaEnMarcha: true });
    if (!navigator.onLine) return Promise.resolve({ offline: true });

    enMarcha = true;
    avisar({ estado: "sincronizando" });

    return sincronizarCambios()
      .then(function (resultadoCambios) {

        return subirFotos().then(function (fotosSubidas) {

          return Object.assign({ fotosSubidas: fotosSubidas }, resultadoCambios);

        });

      })
      .then(function (resultado) {

        enMarcha = false;
        avisar({ estado: "reposo", resultado: resultado });
        return resultado;

      })
      .catch(function (error) {

        enMarcha = false;
        avisar({ estado: "error", error: String(error) });
        return { ok: false, error: String(error) };

      });

  }

  // --- Disparadores automáticos ---

  window.addEventListener("online", function () { ejecutar(); });

  document.addEventListener("visibilitychange", function () {
    if (document.visibilityState === "visible") ejecutar();
  });

  setInterval(ejecutar, 30000);

  return {

    ejecutar: ejecutar,

    onCambioEstado: function (fn) { listeners.push(fn); },

    pendientes: function () {
      return Promise.all([
        BabexDB.contarCola(),
        BabexDB.contarFotosPendientes()
      ]).then(function (r) { return r[0] + r[1]; });
    }

  };

})();
