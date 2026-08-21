/*
==================================================
BABEX Instalador (PWA)
Archivo : db.js
==================================================
Todo lo que la app necesita para funcionar SIN conexión vive aquí, en
IndexedDB: las visitas asignadas, el detalle de cada una (estancias,
productos, catálogo), y dos "buzones de salida" — cola de cambios y
cola de fotos — con todo lo que se ha capturado y todavía no ha
viajado al servidor.

Se ha elegido IndexedDB y no localStorage porque localStorage tiene un
límite de espacio muy pequeño (unos 5 MB) y no admite guardar
archivos binarios (las fotos) de forma cómoda; IndexedDB no tiene ese
problema.

Todo el módulo trabaja con Promesas para poder escribirse con
async/await en el resto de la app.
==================================================
*/

const BabexDB = (function () {

  const NOMBRE_BD = "babex_instalador";
  const VERSION_BD = 1;

  let dbPromesa = null;

  function abrir() {

    if (dbPromesa) return dbPromesa;

    dbPromesa = new Promise(function (resolve, reject) {

      const peticion = indexedDB.open(NOMBRE_BD, VERSION_BD);

      peticion.onupgradeneeded = function (evento) {

        const db = evento.target.result;

        if (!db.objectStoreNames.contains("sesion")) {
          db.createObjectStore("sesion", { keyPath: "clave" });
        }

        if (!db.objectStoreNames.contains("visitas")) {
          db.createObjectStore("visitas", { keyPath: "id" });
        }

        if (!db.objectStoreNames.contains("datosVisita")) {
          // keyPath citaId: un registro por visita, con todo lo que
          // hace falta para trabajar sobre ella sin conexión.
          db.createObjectStore("datosVisita", { keyPath: "citaId" });
        }

        if (!db.objectStoreNames.contains("cola")) {
          db.createObjectStore("cola", { keyPath: "localId", autoIncrement: true });
        }

        if (!db.objectStoreNames.contains("fotos")) {
          db.createObjectStore("fotos", { keyPath: "localId", autoIncrement: true });
        }

      };

      peticion.onsuccess = function () { resolve(peticion.result); };
      peticion.onerror = function () { reject(peticion.error); };

    });

    return dbPromesa;

  }

  function transaccion(almacen, modo) {

    return abrir().then(function (db) {
      return db.transaction(almacen, modo).objectStore(almacen);
    });

  }

  function pedir(peticion) {

    return new Promise(function (resolve, reject) {
      peticion.onsuccess = function () { resolve(peticion.result); };
      peticion.onerror = function () { reject(peticion.error); };
    });

  }

  return {

    // --- Valor único (sesión: token, usuario actual) ---

    guardarValor: function (clave, valor) {
      return transaccion("sesion", "readwrite").then(function (almacen) {
        return pedir(almacen.put({ clave: clave, valor: valor }));
      });
    },

    leerValor: function (clave) {
      return transaccion("sesion", "readonly").then(function (almacen) {
        return pedir(almacen.get(clave));
      }).then(function (r) { return r ? r.valor : null; });
    },

    borrarValor: function (clave) {
      return transaccion("sesion", "readwrite").then(function (almacen) {
        return pedir(almacen.delete(clave));
      });
    },

    // --- Visitas (listado) ---

    guardarVisitas: function (visitas) {
      return transaccion("visitas", "readwrite").then(function (almacen) {
        return Promise.all([
          pedir(almacen.clear()),
          ...visitas.map(function (v) { return pedir(almacen.put(v)); })
        ]);
      });
    },

    todasLasVisitas: function () {
      return transaccion("visitas", "readonly").then(function (almacen) {
        return pedir(almacen.getAll());
      });
    },

    // --- Datos de una visita (estancias, líneas, catálogo, fotos) ---

    guardarDatosVisita: function (citaId, datos) {
      const registro = Object.assign({}, datos, { citaId: Number(citaId) });
      return transaccion("datosVisita", "readwrite").then(function (almacen) {
        return pedir(almacen.put(registro));
      });
    },

    leerDatosVisita: function (citaId) {
      return transaccion("datosVisita", "readonly").then(function (almacen) {
        return pedir(almacen.get(Number(citaId)));
      });
    },

    // --- Cola de cambios pendientes de sincronizar ---

    encolarCambio: function (tipo, datos, tmpId) {
      return transaccion("cola", "readwrite").then(function (almacen) {
        return pedir(almacen.add({
          tipo: tipo,
          datos: datos,
          tmpId: tmpId || null,
          creado: new Date().toISOString(),
          intentos: 0,
          error: null
        }));
      });
    },

    colaCompleta: function () {
      return transaccion("cola", "readonly").then(function (almacen) {
        return pedir(almacen.getAll());
      });
    },

    quitarDeLaCola: function (localId) {
      return transaccion("cola", "readwrite").then(function (almacen) {
        return pedir(almacen.delete(localId));
      });
    },

    marcarErrorEnCola: function (localId, error) {
      return transaccion("cola", "readwrite").then(function (almacen) {
        return pedir(almacen.get(localId)).then(function (item) {
          if (!item) return;
          item.intentos = (item.intentos || 0) + 1;
          item.error = error;
          return pedir(almacen.put(item));
        });
      });
    },

    contarCola: function () {
      return transaccion("cola", "readonly").then(function (almacen) {
        return pedir(almacen.count());
      });
    },

    // --- Fotos pendientes de subir ---

    encolarFoto: function (foto) {
      return transaccion("fotos", "readwrite").then(function (almacen) {
        return pedir(almacen.add(Object.assign({
          creado: new Date().toISOString(),
          intentos: 0,
          error: null
        }, foto)));
      });
    },

    fotosPendientes: function () {
      return transaccion("fotos", "readonly").then(function (almacen) {
        return pedir(almacen.getAll());
      });
    },

    actualizarFotoPendiente: function (foto) {
      return transaccion("fotos", "readwrite").then(function (almacen) {
        return pedir(almacen.put(foto));
      });
    },

    quitarFotoPendiente: function (localId) {
      return transaccion("fotos", "readwrite").then(function (almacen) {
        return pedir(almacen.delete(localId));
      });
    },

    contarFotosPendientes: function () {
      return transaccion("fotos", "readonly").then(function (almacen) {
        return pedir(almacen.count());
      });
    },

    // --- Borrado completo al cerrar sesión ---

    limpiarTodo: function () {
      return abrir().then(function (db) {
        const nombres = ["sesion", "visitas", "datosVisita", "cola", "fotos"];
        return Promise.all(nombres.map(function (nombre) {
          return new Promise(function (resolve, reject) {
            const tx = db.transaction(nombre, "readwrite");
            tx.objectStore(nombre).clear();
            tx.oncomplete = resolve;
            tx.onerror = function () { reject(tx.error); };
          });
        }));
      });
    }

  };

})();
