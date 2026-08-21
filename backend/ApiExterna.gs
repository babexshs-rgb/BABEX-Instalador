/*
==================================================
BABEX
Archivo : ApiExterna.gs
Versión : 1.0.0
==================================================
API pública en JSON, por HTTP, para la PWA del instalador.

Es una capa fina sobre las funciones que ya existen en Api.js: valida
el token, resuelve el usuario, y llama a la misma función interna
pasándole su email — la misma lógica de negocio de siempre, un solo
sitio donde vive cada regla. Esta capa NO reimplementa nada, solo
traduce "token por HTTP" a "email ya identificado", que es lo que
espera el resto del sistema.

Por qué una API HTTP aparte de las llamadas normales (google.script.run):
esas solo funcionan dentro de una página servida por este mismo Apps
Script. La PWA vive en otro dominio (por eso puede instalarse en el
móvil y funcionar sin conexión), así que su único punto de contacto es
esta API por HTTP normal — la misma que usaría cualquier app externa.

CORS, sin dolores de cabeza:
  - Las peticiones van siempre por POST con Content-Type: text/plain.
    Eso la convierte en una "solicitud simple" para el navegador y
    evita el preflight (OPTIONS), que Apps Script no sabe responder.
  - El cuerpo es JSON de todas formas: se lee de e.postData.contents y
    se parsea a mano, el Content-Type solo es para no disparar el
    preflight.
  - Los despliegues "Cualquier usuario" de Apps Script ya devuelven
    cabeceras que permiten leer la respuesta desde otro origen: no
    hace falta (ni se puede) añadir cabeceras CORS a mano aquí.
==================================================
*/

/**
 * Punto de entrada único para todas las peticiones de la PWA.
 * Nunca lanza excepciones hacia fuera: cualquier error se devuelve
 * como { ok:false, error } en JSON, porque un doPost que revienta
 * devuelve una página de error HTML que el cliente no sabría parsear.
 */
function _apiExternaManejar(e) {

  let cuerpo = {};

  try {

    if (e && e.postData && e.postData.contents) {
      cuerpo = JSON.parse(e.postData.contents);
    } else if (e && e.parameter) {
      cuerpo = e.parameter; // permite pings/pruebas simples por GET
    }

  } catch (err) {

    return _apiExternaJson({ ok: false, error: "Petición mal formada." });

  }

  const accion = cuerpo.accion;

  if (!accion) {
    return _apiExternaJson({ ok: false, error: "Falta indicar la acción." });
  }

  try {

    const resultado = _apiExternaDespachar(accion, cuerpo);

    return _apiExternaJson(resultado);

  } catch (err) {

    return _apiExternaJson({ ok: false, error: "Error del servidor: " + err.message });

  }

}

function _apiExternaJson(objeto) {

  return ContentService
    .createTextOutput(JSON.stringify(objeto))
    .setMimeType(ContentService.MimeType.JSON);

}

/**
 * Resuelve el token a un usuario Instalador activo. Se llama al
 * principio de cada acción que no sea "login" o "ping".
 */
function _apiExternaAutenticar(cuerpo) {

  const usuario = SesionesService.usuarioDeToken(cuerpo.token);

  if (!usuario) {
    return { error: { ok: false, error: "Sesión no válida. Vuelve a iniciar sesión.", requiereLogin: true } };
  }

  return { usuario: usuario };

}

function _apiExternaDespachar(accion, cuerpo) {

  switch (accion) {

    case "ping":
      return { ok: true, servidor: "BABEX", hora: new Date().toISOString() };

    case "login":
      return _apiExternaLogin(cuerpo);

    case "cerrarSesion":
      return SesionesService.cerrar(cuerpo.token);

    case "misVisitas": {

      const auth = _apiExternaAutenticar(cuerpo);
      if (auth.error) return auth.error;

      return { ok: true, visitas: apiGetMisVisitas_sync(auth.usuario.email) };

    }

    case "datosVisita": {

      const auth = _apiExternaAutenticar(cuerpo);
      if (auth.error) return auth.error;

      return apiGetDatosVisita(cuerpo.citaId, auth.usuario.email);

    }

    case "sincronizar": {

      const auth = _apiExternaAutenticar(cuerpo);
      if (auth.error) return auth.error;

      return _apiExternaSincronizar(cuerpo.cambios || [], auth.usuario);

    }

    case "subirFoto": {

      const auth = _apiExternaAutenticar(cuerpo);
      if (auth.error) return auth.error;

      return _apiExternaSubirFoto(cuerpo, auth.usuario);

    }

    default:
      return { ok: false, error: "Acción no reconocida: " + accion };

  }

}

/**
 * apiGetMisVisitas espera un callback (está pensada para
 * google.script.run desde el cliente). Aquí hace falta la versión
 * síncrona: se replica la misma consulta en vez de reutilizar esa
 * función, porque su forma (recibe un callback) no encaja con una
 * respuesta HTTP normal.
 */
function apiGetMisVisitas_sync(emailUsuario) {

  const usuario = UsuariosService.buscarPorEmail(emailUsuario);

  if (!usuario || usuario.activo !== "SI") return [];

  return AgendaService.getAll().filter(function (c) {
    return Number(c.tecnicoId) === Number(usuario.id);
  });

}

/**
 * Login con email + contraseña, igual que en la web, pero termina en
 * un token en vez de en una sesión de navegador. Solo emite token
 * para el rol Instalador: es la única puerta que abre esta API.
 */
function _apiExternaLogin(cuerpo) {

  const resultado = UsuariosService.verificarCredenciales(cuerpo.email, cuerpo.password);

  if (!resultado.ok) return resultado;

  if (resultado.rol !== "Instalador") {
    return { ok: false, error: "Esta app es solo para instaladores. Usa el navegador para entrar como " + resultado.rol + "." };
  }

  const usuario = UsuariosService.buscarPorEmail(resultado.email);

  const token = SesionesService.crear(usuario.id, cuerpo.dispositivo || "");

  return {
    ok: true,
    token: token,
    usuario: { id: usuario.id, nombre: usuario.nombre, email: usuario.email }
  };

}

/**
 * Procesa un lote de cambios capturados offline, en el orden en que
 * llegan. Cada elemento puede traer un `tmpId`: el identificador que
 * el móvil se inventó mientras no había conexión (por ejemplo, para
 * poder añadir productos a una estancia recién creada sin tener
 * todavía su ID real). Se va guardando el mapa tmpId → id real
 * conforme se procesa cada elemento, así que un elemento puede
 * referirse a un tmpId de OTRO elemento anterior del mismo lote.
 *
 * Un fallo en un elemento no aborta el lote entero: los siguientes se
 * siguen intentando, y se devuelve el detalle de cada uno para que el
 * móvil decida qué reintentar y qué descartar.
 */
function _apiExternaSincronizar(cambios, usuario) {

  const mapaIds = {}; // "tmp:xxx" -> id real (número)
  const resultados = [];

  function resolver(valor) {

    if (typeof valor === "string" && valor.indexOf("tmp:") === 0) {
      return mapaIds[valor] !== undefined ? mapaIds[valor] : valor;
    }

    return valor;

  }

  cambios.forEach(function (cambio) {

    const tipo = cambio.tipo;
    const datos = cambio.datos || {};
    const tmpId = cambio.tmpId ? "tmp:" + cambio.tmpId : null;

    // Si el elemento depende de un tmpId que no se ha podido resolver
    // (por ejemplo, la estancia de la que depende falló al crearse),
    // no tiene sentido intentarlo: se marca como pendiente para el
    // siguiente intento de sincronización.
    const camposId = ["inmuebleId", "estanciaId", "lineaId", "citaId"];
    let dependenciaRota = false;

    camposId.forEach(function (campo) {

      if (datos[campo] !== undefined) {

        const original = datos[campo];
        datos[campo] = resolver(datos[campo]);

        if (typeof original === "string" && original.indexOf("tmp:") === 0 && datos[campo] === original) {
          dependenciaRota = true;
        }

      }

    });

    if (dependenciaRota) {

      resultados.push({ tmpId: cambio.tmpId, ok: false, error: "Depende de un elemento que aún no se ha sincronizado.", pendiente: true });
      return;

    }

    let r;

    try {

      switch (tipo) {

        case "tipoInmueble":
          r = apiFijarTipoInmueble(datos.inmuebleId, datos.tipo, datos.subtipo, usuario.email);
          break;

        case "caracteristicas":
          r = apiGuardarCaracteristicasInmueble(datos.inmuebleId, datos.caracteristicas, usuario.email);
          break;

        case "estanciaNueva":
          r = apiInsertEstancia({ inmuebleId: datos.inmuebleId, nombre: datos.nombre, tipo: datos.tipo }, usuario.email);
          if (r && r.ok && tmpId) mapaIds[tmpId] = r.id;
          break;

        case "estanciaObs":
          r = apiGuardarObservacionEstancia(datos.estanciaId, datos.observaciones, usuario.email);
          break;

        case "lineaNueva":
          r = apiInsertLineaEstancia({
            estanciaId: datos.estanciaId,
            productoId: datos.productoId,
            cantidad: datos.cantidad,
            estado: datos.estado,
            citaId: datos.citaId
          }, usuario.email);
          if (r && r.ok && tmpId) mapaIds[tmpId] = r.id;
          break;

        case "lineaEstado":
          r = apiUpdateLineaEstancia({ id: datos.lineaId, estado: datos.estado }, usuario.email);
          break;

        case "lineaObs":
          r = apiUpdateLineaEstancia({ id: datos.lineaId, observaciones: datos.observaciones }, usuario.email);
          break;

        case "lineaBorrar":
          r = apiDeleteLineaEstancia(datos.lineaId, usuario.email);
          break;

        case "cierre":
          r = apiCerrarVisita(datos.citaId, datos.estado, datos.observaciones, usuario.email);
          break;

        default:
          r = { ok: false, error: "Tipo de cambio no reconocido: " + tipo };

      }

    } catch (err) {

      r = { ok: false, error: err.message };

    }

    resultados.push({
      tmpId: cambio.tmpId || null,
      ok: !!(r && r.ok),
      id: r && r.id !== undefined ? r.id : null,
      error: r && r.ok === false ? r.error : null
    });

  });

  return { ok: true, resultados: resultados, mapaIds: mapaIds };

}

/**
 * Sube una foto capturada offline. Va aparte del lote de cambios: una
 * foto en base64 puede pesar varios MB, y meterla en el mismo cuerpo
 * que el resto de cambios arriesgaría a que un lote entero fallase
 * por una sola foto grande.
 *
 * Para cuando llega aquí, estanciaId y lineaId ya deberían ser IDs
 * reales: el móvil sincroniza primero el lote de cambios y reescribe
 * su cola de fotos con el mapa de IDs antes de subir ninguna.
 */
function _apiExternaSubirFoto(cuerpo, usuario) {

  const resultado = DocumentosService.insert({
    personaId: cuerpo.personaId || "",
    casoId: cuerpo.casoId || "",
    inmuebleId: cuerpo.inmuebleId || "",
    estanciaId: cuerpo.estanciaId || "",
    nombreOriginal: cuerpo.nombreOriginal,
    mimeType: cuerpo.mimeType,
    base64: cuerpo.base64,
    categoria: "Foto-" + (cuerpo.tipoVisita || "Visita"),
    tipoDetectado: "Foto",
    observacion: cuerpo.descripcion || ""
  });

  if (resultado && resultado.ok) {
    ActividadService.registrar(usuario.email, "Creado", "Documentos", resultado.nombre);
  }

  return resultado;

}
