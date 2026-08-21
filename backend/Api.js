/*
==================================================
BABEX
Archivo : Api.js
Versión : 0.9.0
==================================================
*/

/**
 * Comprueba que un email pertenece a un Admin activo. Se usa antes de
 * cualquier acción sensible (borrar registros, tocar Administración)
 * para que la restricción no dependa solo de ocultar botones en el
 * navegador.
 */
function _bloqueoSiNoAdmin(emailUsuario) {

  if (!UsuariosService.esAdmin(emailUsuario)) {
    return { ok: false, error: "No tienes permisos de administrador para esta acción." };
  }

  return null;

}

/**
 * Verifica email + contraseña para iniciar sesión.
 */
function apiLogin(email, password) {

  return UsuariosService.verificarCredenciales(email, password);

}

/**
 * Registra una solicitud de acceso nueva (pantalla "Regístrate"). No
 * requiere sesión: cualquiera puede pedir acceso, pero hasta que un
 * Admin la apruebe no puede entrar.
 */
function apiRegistrar(email, nombre, password) {

  return SolicitudesService.crear(email, nombre, password);

}

/**
 * Devuelve todos los usuarios autorizados (solo Admin).
 */
function apiGetUsuarios(emailUsuario) {

  const bloqueo = _bloqueoSiNoAdmin(emailUsuario);
  if (bloqueo) return [];

  return UsuariosService.getAll();

}

/**
 * Da de alta un nuevo usuario autorizado (solo Admin).
 */
function apiInsertUsuario(usuario, emailUsuario) {

  const bloqueo = _bloqueoSiNoAdmin(emailUsuario);
  if (bloqueo) return bloqueo;

  return UsuariosService.insert(usuario);

}

/**
 * Actualiza un usuario autorizado (solo Admin).
 */
function apiUpdateUsuario(usuario, emailUsuario) {

  const bloqueo = _bloqueoSiNoAdmin(emailUsuario);
  if (bloqueo) return bloqueo;

  return UsuariosService.update(usuario);

}

/**
 * Elimina (revoca el acceso a) un usuario autorizado (solo Admin).
 */
function apiDeleteUsuario(id, emailUsuario) {

  const bloqueo = _bloqueoSiNoAdmin(emailUsuario);
  if (bloqueo) return bloqueo;

  return UsuariosService.remove(id);

}

/**
 * Devuelve las solicitudes de acceso pendientes (solo Admin).
 */
function apiGetSolicitudes(emailUsuario) {

  const bloqueo = _bloqueoSiNoAdmin(emailUsuario);
  if (bloqueo) return [];

  return SolicitudesService.getPendientes();

}

/**
 * Aprueba una solicitud de acceso: da de alta al usuario (solo Admin).
 */
function apiAprobarSolicitud(id, nombre, rol, emailUsuario) {

  const bloqueo = _bloqueoSiNoAdmin(emailUsuario);
  if (bloqueo) return bloqueo;

  return SolicitudesService.aprobar(id, nombre, rol);

}

/**
 * Rechaza una solicitud de acceso (solo Admin).
 */
function apiRechazarSolicitud(id, emailUsuario) {

  const bloqueo = _bloqueoSiNoAdmin(emailUsuario);
  if (bloqueo) return bloqueo;

  return SolicitudesService.rechazar(id);

}

/**
 * Devuelve todas las personas
 */
function apiGetPersonas() {

  return PersonasService.getAll();

}

/**
 * Devuelve todos los inmuebles
 */
function apiGetInmuebles() {

  return InmueblesService.getAll();

}

/**
 * Devuelve todos los casos
 */
function apiGetCasos() {

  return CasosService.getAll();

}

/**
 * Devuelve todas las empresas
 */
function apiGetEmpresas() {

  return EmpresasService.getAll();

}

/**
 * Devuelve todas las citas de agenda
 */
function apiGetAgenda() {

  return AgendaService.getAll();

}

/**
 * Guarda una nueva persona
 */
function apiInsertPersona(persona, emailUsuario) {

  const resultado = PersonasService.insert(persona);

  ActividadService.registrar(emailUsuario, "Creado", "Personas",
    ((persona && persona.nombre) || "") + " " + ((persona && persona.apellidos) || ""));

  return resultado;

}
/**
 * Actualiza una persona (solo Admin: Empleado solo puede crear)
 */
function apiUpdatePersona(persona, emailUsuario) {

  const bloqueo = _bloqueoSiNoAdmin(emailUsuario);
  if (bloqueo) return bloqueo;

  const resultado = PersonasService.update(persona);

  ActividadService.registrar(emailUsuario, "Editado", "Personas",
    ((persona && persona.nombre) || "") + " " + ((persona && persona.apellidos) || ""));

  return resultado;

}
/**
 * Elimina una persona (solo Admin)
 */
function apiDeletePersona(id, emailUsuario){

  const bloqueo = _bloqueoSiNoAdmin(emailUsuario);
  if (bloqueo) return bloqueo;

  const resultado = PersonasService.remove(id);

  ActividadService.registrar(emailUsuario, "Eliminado", "Personas", "Registro nº " + id);

  return resultado;

}

/**
 * Guarda un nuevo inmueble
 */
function apiInsertInmueble(inmueble, emailUsuario) {

  const resultado = InmueblesService.insert(inmueble);

  ActividadService.registrar(emailUsuario, "Creado", "Inmuebles", (inmueble && inmueble.direccion) || "");

  return resultado;

}

/**
 * Actualiza un inmueble (solo Admin: Empleado solo puede crear)
 */
function apiUpdateInmueble(inmueble, emailUsuario) {

  const bloqueo = _bloqueoSiNoAdmin(emailUsuario);
  if (bloqueo) return bloqueo;

  const resultado = InmueblesService.update(inmueble);

  ActividadService.registrar(emailUsuario, "Editado", "Inmuebles", (inmueble && inmueble.direccion) || "");

  return resultado;

}

/**
 * Elimina un inmueble (solo Admin)
 */
function apiDeleteInmueble(id, emailUsuario) {

  const bloqueo = _bloqueoSiNoAdmin(emailUsuario);
  if (bloqueo) return bloqueo;

  const resultado = InmueblesService.remove(id);

  ActividadService.registrar(emailUsuario, "Eliminado", "Inmuebles", "Registro nº " + id);

  return resultado;

}

/**
 * Guarda un nuevo caso
 */
function apiInsertCaso(caso, emailUsuario) {

  const resultado = CasosService.insert(caso);

  ActividadService.registrar(emailUsuario, "Creado", "Casos", (caso && caso.tipo) || "");

  return resultado;

}

/**
 * Actualiza un caso (solo Admin: Empleado solo puede crear)
 */
function apiUpdateCaso(caso, emailUsuario) {

  const bloqueo = _bloqueoSiNoAdmin(emailUsuario);
  if (bloqueo) return bloqueo;

  const resultado = CasosService.update(caso);

  ActividadService.registrar(emailUsuario, "Editado", "Casos", (caso && caso.tipo) || "");

  return resultado;

}

/**
 * Elimina un caso (solo Admin)
 */
function apiDeleteCaso(id, emailUsuario) {

  const bloqueo = _bloqueoSiNoAdmin(emailUsuario);
  if (bloqueo) return bloqueo;

  const resultado = CasosService.remove(id);

  ActividadService.registrar(emailUsuario, "Eliminado", "Casos", "Registro nº " + id);

  return resultado;

}

/**
 * Guarda una nueva empresa
 */
function apiInsertEmpresa(empresa, emailUsuario) {

  const resultado = EmpresasService.insert(empresa);

  ActividadService.registrar(emailUsuario, "Creado", "Empresas", (empresa && empresa.nombre) || "");

  return resultado;

}

/**
 * Actualiza una empresa (solo Admin: Empleado solo puede crear)
 */
function apiUpdateEmpresa(empresa, emailUsuario) {

  const bloqueo = _bloqueoSiNoAdmin(emailUsuario);
  if (bloqueo) return bloqueo;

  const resultado = EmpresasService.update(empresa);

  ActividadService.registrar(emailUsuario, "Editado", "Empresas", (empresa && empresa.nombre) || "");

  return resultado;

}

/**
 * Elimina una empresa (solo Admin)
 */
function apiDeleteEmpresa(id, emailUsuario) {

  const bloqueo = _bloqueoSiNoAdmin(emailUsuario);
  if (bloqueo) return bloqueo;

  const resultado = EmpresasService.remove(id);

  ActividadService.registrar(emailUsuario, "Eliminado", "Empresas", "Registro nº " + id);

  return resultado;

}

/**
 * Guarda una nueva cita de agenda
 */
function apiInsertCita(cita, emailUsuario) {

  const resultado = AgendaService.insert(cita);

  ActividadService.registrar(emailUsuario, "Creado", "Agenda", (cita && cita.titulo) || "");

  return resultado;

}

/**
 * Actualiza una cita de agenda (solo Admin: Empleado solo puede crear)
 */
function apiUpdateCita(cita, emailUsuario) {

  const bloqueo = _bloqueoSiNoAdmin(emailUsuario);
  if (bloqueo) return bloqueo;

  const resultado = AgendaService.update(cita);

  ActividadService.registrar(emailUsuario, "Editado", "Agenda", (cita && cita.titulo) || "");

  return resultado;

}

/**
 * Elimina una cita de agenda (solo Admin)
 */
function apiDeleteCita(id, emailUsuario) {

  const bloqueo = _bloqueoSiNoAdmin(emailUsuario);
  if (bloqueo) return bloqueo;

  const resultado = AgendaService.remove(id);

  ActividadService.registrar(emailUsuario, "Eliminado", "Agenda", "Registro nº " + id);

  return resultado;

}

/**
 * Devuelve todos los documentos
 */
function apiGetDocumentos() {

  return DocumentosService.getAll();

}

/**
 * Sube un documento a Drive y guarda sus metadatos
 */
function apiInsertDocumento(documento, emailUsuario) {

  const resultado = DocumentosService.insert(documento);

  ActividadService.registrar(emailUsuario, "Creado", "Documentos", (documento && documento.nombre) || "");

  return resultado;

}

/**
 * Actualiza los metadatos de un documento (no el archivo) (solo
 * Admin: Empleado solo puede crear)
 */
function apiUpdateDocumento(documento, emailUsuario) {

  const bloqueo = _bloqueoSiNoAdmin(emailUsuario);
  if (bloqueo) return bloqueo;

  const resultado = DocumentosService.update(documento);

  ActividadService.registrar(emailUsuario, "Editado", "Documentos", (documento && documento.nombre) || "");

  return resultado;

}

/**
 * Elimina un documento (fila + archivo en Drive) (solo Admin)
 */
function apiDeleteDocumento(id, emailUsuario) {

  const bloqueo = _bloqueoSiNoAdmin(emailUsuario);
  if (bloqueo) return bloqueo;

  const resultado = DocumentosService.remove(id);

  ActividadService.registrar(emailUsuario, "Eliminado", "Documentos", "Registro nº " + id);

  return resultado;

}

/**
 * Devuelve toda la configuración del sistema
 */
function apiGetConfig() {

  return ConfigService.getAll();

}

/**
 * Inserta una nueva clave de configuración (solo Admin)
 */
function apiInsertConfig(item, emailUsuario) {

  const bloqueo = _bloqueoSiNoAdmin(emailUsuario);
  if (bloqueo) return bloqueo;

  return ConfigService.insert(item);

}

/**
 * Actualiza el valor de una clave de configuración (solo Admin)
 */
function apiUpdateConfig(item, emailUsuario) {

  const bloqueo = _bloqueoSiNoAdmin(emailUsuario);
  if (bloqueo) return bloqueo;

  return ConfigService.update(item);

}

/**
 * Elimina una clave de configuración (solo Admin)
 */
function apiDeleteConfig(clave, emailUsuario) {

  const bloqueo = _bloqueoSiNoAdmin(emailUsuario);
  if (bloqueo) return bloqueo;

  return ConfigService.remove(clave);

}

/**
 * Todo lo que el instalador necesita para trabajar en una visita, en
 * una sola llamada: la cita, las estancias del inmueble, lo que ya
 * hay registrado en cada una y el catálogo para poder añadir.
 *
 * Se hace en una sola llamada a propósito: en una casa con mala
 * cobertura, cuatro llamadas seguidas es cuatro veces la posibilidad
 * de que algo falle.
 */
function apiGetDatosVisita(citaId, emailUsuario) {

  const usuario = UsuariosService.buscarPorEmail(emailUsuario);

  if (!usuario || usuario.activo !== "SI") {
    return { ok: false, error: "Usuario no autorizado." };
  }

  const cita = AgendaService.getAll().find(function (c) { return Number(c.id) === Number(citaId); });

  if (!cita) {
    return { ok: false, error: "La visita ya no existe." };
  }

  // Un instalador solo puede abrir sus propias visitas.
  if (usuario.rol === "Instalador" && Number(cita.tecnicoId) !== Number(usuario.id)) {
    return { ok: false, error: "Esta visita no está asignada a ti." };
  }

  const inmuebleId = cita.inmuebleId;

  return {
    ok: true,
    cita: cita,
    estancias: inmuebleId ? EstanciasService.getPorInmueble(inmuebleId) : [],
    lineas: inmuebleId ? EstanciaProductosService.getPorInmueble(inmuebleId) : [],
    fotos: _fotosDeLaVisita(cita),
    catalogo: CatalogoService.getActivos().map(function (p) {
      return { id: p.id, nombre: p.nombre, familia: p.familia, unidad: p.unidad };
    })
  };

}

/**
 * Fotos relacionadas con una visita: las del inmueble, o si la cita no
 * tiene inmueble, las del cliente. Solo imágenes.
 */
function _fotosDeLaVisita(cita) {

  return DocumentosService.getAll().filter(function (d) {

    const esImagen = String(d.tipo || "").indexOf("image") === 0;

    if (!esImagen) return false;

    if (cita.inmuebleId) {
      return Number(d.inmuebleId) === Number(cita.inmuebleId);
    }

    return Number(d.personaId) === Number(cita.personaId);

  });

}

/**
 * Guarda las observaciones de una estancia desde el móvil.
 *
 * Va aparte de apiUpdateEstancia (que es solo de Admin) porque anotar
 * lo que se ve en cada habitación es justo el trabajo del instalador.
 */
function apiGuardarObservacionEstancia(estanciaId, observaciones, emailUsuario) {

  const usuario = UsuariosService.buscarPorEmail(emailUsuario);

  if (!usuario || usuario.activo !== "SI") {
    return { ok: false, error: "Usuario no autorizado." };
  }

  return EstanciasService.update({ id: estanciaId, observaciones: observaciones });

}

/**
 * Miniaturas de varias fotos de golpe.
 *
 * Se piden en bloque y no una a una: cada llamada a google.script.run
 * tiene su propia latencia, y con quince fotos serían quince viajes.
 *
 * Se limita a 30 por llamada para no acercarse al tope de tiempo de
 * ejecución de Apps Script con álbumes grandes.
 */
function apiGetMiniaturas(fileIds, emailUsuario) {

  const usuario = UsuariosService.buscarPorEmail(emailUsuario);

  if (!usuario || usuario.activo !== "SI") return {};

  const resultado = {};

  (fileIds || []).slice(0, 30).forEach(function (id) {

    const mini = DriveService.miniatura(id);

    if (mini) resultado[id] = mini;

  });

  return resultado;

}

/* ==================================================
   PRESUPUESTOS
================================================== */

/**
 * Presupuestos de un inmueble, con sus líneas.
 */
function apiGetPresupuestos(inmuebleId, emailUsuario) {

  const bloqueo = _bloqueoSiNoAdmin(emailUsuario);
  if (bloqueo) return [];

  return PresupuestosService.getPorInmueble(inmuebleId).map(function (p) {
    p.lineas = PresupuestosService.getLineas(p.id);
    return p;
  });

}

/**
 * Genera un presupuesto con lo que hay propuesto en el inmueble.
 * Solo Admin: implica precios y márgenes.
 */
function apiGenerarPresupuesto(inmuebleId, opciones, emailUsuario) {

  const bloqueo = _bloqueoSiNoAdmin(emailUsuario);
  if (bloqueo) return bloqueo;

  const resultado = PresupuestosService.generarDesdeInmueble(inmuebleId, opciones);

  if (resultado && resultado.ok) {
    ActividadService.registrar(emailUsuario, "Creado", "Presupuestos",
      resultado.numero + " · " + resultado.lineas + " líneas");
  }

  return resultado;

}

/**
 * Cambia estado, mano de obra, descuento, IVA u observaciones.
 */
function apiActualizarPresupuesto(presupuesto, emailUsuario) {

  const bloqueo = _bloqueoSiNoAdmin(emailUsuario);
  if (bloqueo) return bloqueo;

  const resultado = PresupuestosService.actualizar(presupuesto);

  if (resultado && resultado.ok) {
    ActividadService.registrar(emailUsuario, "Editado", "Presupuestos",
      "Presupuesto nº " + presupuesto.id);
  }

  return resultado;

}

/**
 * Genera el PDF del presupuesto y lo guarda en Drive.
 */
function apiPdfPresupuesto(presupuestoId, emailUsuario) {

  const bloqueo = _bloqueoSiNoAdmin(emailUsuario);
  if (bloqueo) return bloqueo;

  const resultado = PresupuestosService.generarPdf(presupuestoId);

  if (resultado && resultado.ok) {
    ActividadService.registrar(emailUsuario, "Creado", "Presupuestos", resultado.nombre);
  }

  return resultado;

}

/**
 * Pipeline de instalaciones para el Dashboard: presupuestos desde que
 * el cliente los acepta hasta que se cobran. Solo Admin: son cifras
 * de dinero por cliente.
 */
function apiGetPipelineInstalaciones(emailUsuario) {

  const bloqueo = _bloqueoSiNoAdmin(emailUsuario);
  if (bloqueo) return bloqueo;

  return {
    ok: true,
    estados: PresupuestosService.ESTADOS_PIPELINE,
    presupuestos: PresupuestosService.getPipeline()
  };

}

/**
 * Exporta el presupuesto a una hoja de cálculo de Google.
 *
 * Documento INTERNO: incluye coste y margen por línea. Al cliente se
 * le manda el PDF, que no los lleva.
 */
function apiHojaPresupuesto(presupuestoId, emailUsuario) {

  const bloqueo = _bloqueoSiNoAdmin(emailUsuario);
  if (bloqueo) return bloqueo;

  const resultado = PresupuestosService.generarHojaCalculo(presupuestoId);

  if (resultado && resultado.ok) {
    ActividadService.registrar(emailUsuario, "Creado", "Presupuestos", resultado.nombre);
  }

  return resultado;

}

/**
 * Elimina un presupuesto y sus líneas.
 */
function apiDeletePresupuesto(id, emailUsuario) {

  const bloqueo = _bloqueoSiNoAdmin(emailUsuario);
  if (bloqueo) return bloqueo;

  const resultado = PresupuestosService.remove(id);

  if (resultado && resultado.ok) {
    ActividadService.registrar(emailUsuario, "Eliminado", "Presupuestos", "Presupuesto nº " + id);
  }

  return resultado;

}

/**
 * Fija el tipo y subtipo del inmueble desde el móvil, al empezar la
 * visita. Lo puede hacer cualquier usuario identificado: es un dato
 * que se conoce justo al llegar y no tiene sentido tener que pedirlo
 * a la oficina.
 */
function apiFijarTipoInmueble(inmuebleId, tipo, subtipo, emailUsuario) {

  const usuario = UsuariosService.buscarPorEmail(emailUsuario);

  if (!usuario || usuario.activo !== "SI") {
    return { ok: false, error: "Usuario no autorizado." };
  }

  return InmueblesService.update({
    id: inmuebleId,
    tipo: tipo || "",
    subtipo: subtipo || ""
  });

}

/**
 * Guarda las características del inmueble (plantas, garaje, jardín...)
 * que dependen de su tipo. Llega el objeto entero, no campo a campo:
 * son pocos datos y así una respuesta nunca queda a medias.
 */
function apiGuardarCaracteristicasInmueble(inmuebleId, caracteristicas, emailUsuario) {

  const usuario = UsuariosService.buscarPorEmail(emailUsuario);

  if (!usuario || usuario.activo !== "SI") {
    return { ok: false, error: "Usuario no autorizado." };
  }

  return InmueblesService.update({
    id: inmuebleId,
    caracteristicas: caracteristicas || {}
  });

}

/**
 * Inventario de un inmueble: estancias, qué hay en cada una y el
 * catálogo para poder añadir. Es la vista central del equipamiento de
 * una casa, y por eso cuelga del inmueble y no de una cita concreta.
 */
function apiGetInventarioInmueble(inmuebleId, emailUsuario) {

  const usuario = UsuariosService.buscarPorEmail(emailUsuario);

  if (!usuario || usuario.activo !== "SI") {
    return { ok: false, error: "Usuario no autorizado.", estancias: [], lineas: [], catalogo: [], fotos: [] };
  }

  return {
    ok: true,
    estancias: EstanciasService.getPorInmueble(inmuebleId),
    lineas: EstanciaProductosService.getPorInmueble(inmuebleId),
    catalogo: CatalogoService.getActivos().map(function (p) {
      return { id: p.id, nombre: p.nombre, familia: p.familia, unidad: p.unidad };
    }),
    fotos: DocumentosService.fotosDeInmueble(inmuebleId)
  };

}

/**
 * Sube una foto a una estancia desde la oficina (el archivo llega ya
 * elegido con un <input type="file"> normal, no con la cámara: es la
 * versión de escritorio del botón de foto del instalador).
 */
function apiSubirFotoEstancia(datos, emailUsuario) {

  // Mismo nivel de permiso que crear un documento cualquiera (acción
  // de "crear", que Empleado también puede hacer): no se restringe a
  // Admin, solo reasignar la estancia de una foto ya subida lo es.
  const usuario = UsuariosService.buscarPorEmail(emailUsuario);

  if (!usuario || usuario.activo !== "SI") {
    return { ok: false, error: "Usuario no autorizado." };
  }

  const estancias = EstanciasService.getPorInmueble(datos.inmuebleId);
  const estancia = estancias.find(function (e) { return Number(e.id) === Number(datos.estanciaId); });

  const inmueble = InmueblesService.getAll().find(function (i) { return Number(i.id) === Number(datos.inmuebleId); });

  const resultado = DocumentosService.insert({
    personaId: inmueble ? inmueble.personaId : "",
    inmuebleId: datos.inmuebleId,
    estanciaId: datos.estanciaId || "",
    nombreOriginal: datos.nombreOriginal,
    mimeType: datos.mimeType,
    base64: datos.base64,
    categoria: "Foto-Estancia",
    tipoDetectado: "Foto",
    observacion: (estancia ? estancia.nombre : "") + (datos.descripcion ? " · " + datos.descripcion : "")
  });

  if (resultado && resultado.ok) {
    ActividadService.registrar(emailUsuario, "Creado", "Documentos", resultado.nombre);
  }

  return resultado;

}

/**
 * Cambia la estancia a la que pertenece una foto ya subida (o la
 * quita, con estanciaId vacío).
 */
function apiAsignarEstanciaFoto(documentoId, estanciaId, emailUsuario) {

  const bloqueo = _bloqueoSiNoAdmin(emailUsuario);
  if (bloqueo) return bloqueo;

  return DocumentosService.asignarEstancia(documentoId, estanciaId);

}

/**
 * Parte completo de una visita, para verlo desde la oficina: estancias
 * con sus productos y las fotos. Solo para usuarios identificados.
 */
function apiGetParteVisita(citaId, emailUsuario) {

  const usuario = UsuariosService.buscarPorEmail(emailUsuario);

  if (!usuario || usuario.activo !== "SI") {
    return { ok: false, error: "Usuario no autorizado." };
  }

  const cita = AgendaService.getAll().find(function (c) { return Number(c.id) === Number(citaId); });

  if (!cita) return { ok: false, error: "La visita ya no existe." };

  const inmuebleId = cita.inmuebleId;

  return {
    ok: true,
    estancias: inmuebleId ? EstanciasService.getPorInmueble(inmuebleId) : [],
    lineas: inmuebleId ? EstanciaProductosService.getPorInmueble(inmuebleId) : [],
    fotos: _fotosDeLaVisita(cita)
  };

}

/**
 * Añade un producto a una estancia (lo hace el instalador en campo).
 */
function apiInsertLineaEstancia(linea, emailUsuario) {

  const usuario = UsuariosService.buscarPorEmail(emailUsuario);

  if (!usuario || usuario.activo !== "SI") {
    return { ok: false, error: "Usuario no autorizado." };
  }

  const resultado = EstanciaProductosService.insert(linea);

  if (resultado && resultado.ok) {
    ActividadService.registrar(emailUsuario, "Creado", "Estancias",
      "Producto añadido a estancia nº " + linea.estanciaId);
  }

  return resultado;

}

/**
 * Cambia una línea: cantidad, observaciones o estado (por ejemplo, de
 * "Propuesto" a "Instalado" el día del montaje).
 */
function apiUpdateLineaEstancia(linea, emailUsuario) {

  const usuario = UsuariosService.buscarPorEmail(emailUsuario);

  if (!usuario || usuario.activo !== "SI") {
    return { ok: false, error: "Usuario no autorizado." };
  }

  return EstanciaProductosService.update(linea);

}

/**
 * Quita una línea de una estancia.
 */
function apiDeleteLineaEstancia(id, emailUsuario) {

  const usuario = UsuariosService.buscarPorEmail(emailUsuario);

  if (!usuario || usuario.activo !== "SI") {
    return { ok: false, error: "Usuario no autorizado." };
  }

  return EstanciaProductosService.remove(id);

}

/**
 * Cierra una visita desde el móvil: deja el estado de la cita y añade
 * las observaciones del instalador a las notas, sin pisar las que
 * puso la oficina.
 */
function apiCerrarVisita(citaId, estado, observaciones, emailUsuario) {

  const usuario = UsuariosService.buscarPorEmail(emailUsuario);

  if (!usuario || usuario.activo !== "SI") {
    return { ok: false, error: "Usuario no autorizado." };
  }

  const cita = AgendaService.getAll().find(function (c) { return Number(c.id) === Number(citaId); });

  if (!cita) return { ok: false, error: "La visita ya no existe." };

  if (usuario.rol === "Instalador" && Number(cita.tecnicoId) !== Number(usuario.id)) {
    return { ok: false, error: "Esta visita no está asignada a ti." };
  }

  let notas = cita.notas || "";

  if (observaciones) {

    const fecha = Utilities.formatDate(new Date(), CONFIG.ZONA_HORARIA || "Europe/Madrid", "dd/MM/yyyy HH:mm");

    notas += (notas ? "\n\n" : "") +
             "— Parte de " + (usuario.nombre || usuario.email) + " (" + fecha + "):\n" +
             observaciones;

  }

  const resultado = AgendaService.update({
    id: citaId,
    estado: estado || "Realizada",
    notas: notas
  });

  if (resultado && resultado.ok) {

    // Se registra como módulo "Visitas" y no como "Agenda" para que
    // en el panel se distinga a simple vista el trabajo de campo de
    // los cambios que hace la oficina en el calendario.
    ActividadService.registrar(
      emailUsuario,
      "Visita " + (estado || "Realizada").toLowerCase(),
      "Visitas",
      (cita.titulo || "Visita") + (cita.fecha ? " · " + cita.fecha : "")
    );

  }

  return resultado;

}

/**
 * Estancias de un inmueble. Si no se indica inmueble, devuelve todas
 * (lo usa el buscador y los informes).
 */
function apiGetEstancias(inmuebleId) {

  return inmuebleId
    ? EstanciasService.getPorInmueble(inmuebleId)
    : EstanciasService.getAll();

}

/**
 * Crea una estancia. La puede crear cualquier usuario identificado:
 * el instalador las da de alta en el levantamiento, que es justo su
 * trabajo.
 */
function apiInsertEstancia(estancia, emailUsuario) {

  const resultado = EstanciasService.insert(estancia);

  if (resultado && resultado.ok) {
    ActividadService.registrar(emailUsuario, "Creado", "Estancias", (estancia && estancia.nombre) || "");
  }

  return resultado;

}

/**
 * Actualiza una estancia (solo Admin: el Empleado y el Instalador
 * pueden crear, no rehacer lo ya registrado).
 */
function apiUpdateEstancia(estancia, emailUsuario) {

  const bloqueo = _bloqueoSiNoAdmin(emailUsuario);
  if (bloqueo) return bloqueo;

  const resultado = EstanciasService.update(estancia);

  if (resultado && resultado.ok) {
    ActividadService.registrar(emailUsuario, "Editado", "Estancias", (estancia && estancia.nombre) || ("Estancia nº " + estancia.id));
  }

  return resultado;

}

/**
 * Elimina una estancia (solo Admin).
 */
function apiDeleteEstancia(id, emailUsuario) {

  const bloqueo = _bloqueoSiNoAdmin(emailUsuario);
  if (bloqueo) return bloqueo;

  const resultado = EstanciasService.remove(id);

  if (resultado && resultado.ok) {
    ActividadService.registrar(emailUsuario, "Eliminado", "Estancias", "Estancia nº " + id);
  }

  return resultado;

}

/**
 * Catálogo de productos y servicios.
 *
 * Lo puede leer cualquier usuario identificado (el instalador lo
 * necesita para elegir qué instala), pero el COSTE solo se devuelve a
 * los administradores: es información interna de márgenes.
 */
function apiGetCatalogo(emailUsuario) {

  const productos = CatalogoService.getAll();

  if (UsuariosService.esAdmin(emailUsuario)) return productos;

  return productos.map(function (p) {
    return {
      id: p.id,
      referencia: p.referencia,
      nombre: p.nombre,
      marca: p.marca,
      refFabricante: p.refFabricante,
      tipo: p.tipo,
      unidad: p.unidad,
      pvp: p.pvp,
      activo: p.activo,
      observaciones: p.observaciones
    };
  });

}

/**
 * Da de alta un producto en el catálogo (solo Admin).
 */
function apiInsertProducto(producto, emailUsuario) {

  const bloqueo = _bloqueoSiNoAdmin(emailUsuario);
  if (bloqueo) return bloqueo;

  const resultado = CatalogoService.insert(producto);

  if (resultado && resultado.ok) {
    ActividadService.registrar(emailUsuario, "Creado", "Catálogo", (producto && producto.nombre) || "");
  }

  return resultado;

}

/**
 * Actualiza un producto del catálogo (solo Admin).
 */
function apiUpdateProducto(producto, emailUsuario) {

  const bloqueo = _bloqueoSiNoAdmin(emailUsuario);
  if (bloqueo) return bloqueo;

  const resultado = CatalogoService.update(producto);

  if (resultado && resultado.ok) {
    ActividadService.registrar(emailUsuario, "Editado", "Catálogo", (producto && producto.nombre) || ("Producto nº " + producto.id));
  }

  return resultado;

}

/**
 * Elimina un producto del catálogo (solo Admin).
 */
function apiDeleteProducto(id, emailUsuario) {

  const bloqueo = _bloqueoSiNoAdmin(emailUsuario);
  if (bloqueo) return bloqueo;

  const resultado = CatalogoService.remove(id);

  if (resultado && resultado.ok) {
    ActividadService.registrar(emailUsuario, "Eliminado", "Catálogo", "Producto nº " + id);
  }

  return resultado;

}

/**
 * Lista de instaladores activos, para poder asignarles citas desde el
 * panel. Solo devuelve id y nombre: no hace falta más para un
 * desplegable y así no se expone nada sensible.
 */
function apiGetTecnicos() {

  return UsuariosService.getAll()
    .filter(function (u) {
      return u.activo === "SI" && (u.rol === "Instalador" || u.rol === "Admin");
    })
    .map(function (u) {
      return { id: u.id, nombre: u.nombre || u.email, rol: u.rol };
    });

}

/**
 * Citas asignadas al instalador que las pide. Se identifica por su
 * email de sesión, y solo puede ver las suyas: no recibe un id por
 * parámetro para que nadie pueda pedir las de otro.
 */
function apiGetMisVisitas(emailUsuario) {

  const usuario = UsuariosService.buscarPorEmail(emailUsuario);

  if (!usuario || usuario.activo !== "SI") return [];

  const citas = AgendaService.getPorTecnico(usuario.id);

  // Se enriquecen con lo que el móvil necesita para poder llamar y
  // navegar sin tener que pedir más datos.
  const personas = PersonasService.getAll();
  const inmuebles = InmueblesService.getAll();

  return citas.map(function (c) {

    const persona = personas.find(function (p) { return Number(p.id) === Number(c.personaId); });
    const inmueble = inmuebles.find(function (i) { return Number(i.id) === Number(c.inmuebleId); });

    c.clienteNombre = persona ? (persona.nombre + " " + (persona.apellidos || "")).trim() : "";
    c.clienteTelefono = persona ? String(persona.telefono || "") : "";

    // Si la cita no tiene inmueble, se usa la dirección de la persona.
    c.direccion = inmueble
      ? [inmueble.direccion, inmueble.ciudad].filter(Boolean).join(", ")
      : (persona ? [persona.direccion, persona.ciudad].filter(Boolean).join(", ") : "");

    c.latitud = inmueble && inmueble.latitud ? inmueble.latitud : "";
    c.longitud = inmueble && inmueble.longitud ? inmueble.longitud : "";

    c.inmuebleTipo = inmueble ? (inmueble.tipo || "") : "";
    c.inmuebleSubtipo = inmueble ? (inmueble.subtipo || "") : "";
    c.inmuebleCaracteristicas = inmueble ? (inmueble.caracteristicas || {}) : {};

    return c;

  });

}

/**
 * Genera un informe (PDF o CSV) y lo guarda en Drive. Devuelve la URL
 * para abrirlo. Queda anotado en el historial de actividad.
 */
function apiGenerarInforme(tipo, desde, hasta, formato, emailUsuario) {

  const resultado = InformesService.generar(tipo, desde, hasta, formato);

  if (resultado && resultado.ok) {

    ActividadService.registrar(emailUsuario, "Creado", "Informes", resultado.nombre);

  }

  return resultado;

}

/**
 * Historial de todo lo que ha pasado con un cliente: casos abiertos y
 * cerrados, citas, documentos subidos y equipamiento registrado en
 * sus inmuebles.
 *
 * Se construye leyendo los datos reales, no la hoja ACTIVIDAD: allí
 * el detalle es texto libre y no guarda a qué cliente pertenece cada
 * acción, así que filtrar por persona sería adivinar.
 */
function apiGetHistorialPersona(personaId, emailUsuario) {

  const usuario = UsuariosService.buscarPorEmail(emailUsuario);

  if (!usuario || usuario.activo !== "SI") return [];
  if (!personaId) return [];

  const eventos = [];

  function anadir(fecha, tipo, titulo, detalle, modulo, id) {

    if (!fecha) return;

    const soloFecha = String(fecha).slice(0, 10);

    if (!/^\d{4}-\d{2}-\d{2}$/.test(soloFecha)) return;

    eventos.push({
      fecha: soloFecha,
      tipo: tipo,
      titulo: titulo,
      detalle: detalle || "",
      modulo: modulo || "",
      id: id || null
    });

  }

  // --- Casos -------------------------------------------------
  CasosService.getAll()
    .filter(function (c) { return Number(c.personaId) === Number(personaId); })
    .forEach(function (c) {

      anadir(c.fechaApertura, "caso", "Caso abierto",
        (c.tipo || "") + (c.descripcion ? " · " + c.descripcion : ""), "casos", c.id);

      anadir(c.fechaCierre, "caso-cierre", "Caso cerrado",
        (c.tipo || ""), "casos", c.id);

    });

  // --- Citas -------------------------------------------------
  AgendaService.getAll()
    .filter(function (c) { return Number(c.personaId) === Number(personaId); })
    .forEach(function (c) {

      anadir(c.fecha, "cita", (c.estado === "Realizada" ? "Visita realizada" : "Cita " + (c.estado || "").toLowerCase()),
        (c.titulo || "") + (c.hora ? " · " + c.hora : ""), "agenda", c.id);

    });

  // --- Documentos --------------------------------------------
  DocumentosService.getAll()
    .filter(function (d) { return Number(d.personaId) === Number(personaId); })
    .forEach(function (d) {

      anadir(d.fechaSubida, "documento", "Documento subido",
        d.nombre || "", "documentos", d.id);

    });

  // --- Equipamiento de sus inmuebles --------------------------
  const inmuebles = InmueblesService.getAll()
    .filter(function (i) { return Number(i.personaId) === Number(personaId); });

  inmuebles.forEach(function (i) {

    EstanciaProductosService.getPorInmueble(i.id).forEach(function (l) {

      anadir(l.fecha, l.estado === "Instalado" ? "instalado" : "propuesto",
        l.estado === "Instalado" ? "Producto instalado" : "Producto propuesto",
        l.cantidad + " × " + l.productoNombre + " · " + l.estanciaNombre +
          (i.direccion ? " (" + i.direccion + ")" : ""),
        "inmuebles", i.id);

    });

  });

  // Más reciente primero.
  return eventos
    .sort(function (a, b) { return b.fecha.localeCompare(a.fecha); })
    .slice(0, 40);

}

/**
 * Últimas acciones registradas en el historial de actividad.
 */
function apiGetActividad(cuantos) {

  return ActividadService.getUltimos(cuantos);

}

/**
 * Comprueba de verdad el estado de los servicios de los que depende
 * BABEX, en vez de mostrarlo fijo en el panel. Cada comprobación va
 * en su propio try/catch para que el fallo de una no tumbe el resto.
 *
 * Devuelve para cada servicio: "ok" | "aviso" | "error", más un
 * detalle corto para mostrar bajo el nombre.
 */
function apiEstadoSistema() {

  const estado = {};

  // Drive: se da por bueno si podemos acceder a la carpeta raíz de
  // documentos (creándola si aún no existía).
  try {

    const carpeta = DriveService.getCarpetaRaiz();
    estado.drive = { nivel: "ok", detalle: carpeta.getName() };

  } catch (e) {

    estado.drive = { nivel: "error", detalle: "Sin acceso" };

  }

  // Gmail: además de comprobar que responde, avisamos si queda poca
  // cuota diaria de envío (los avisos de solicitudes dependen de ella).
  try {

    const cuota = MailApp.getRemainingDailyQuota();

    estado.gmail = {
      nivel: cuota > 10 ? "ok" : (cuota > 0 ? "aviso" : "error"),
      detalle: cuota + " envíos hoy"
    };

  } catch (e) {

    estado.gmail = { nivel: "error", detalle: "Sin acceso" };

  }

  // Base de datos: la hoja de cálculo que hace de BBDD.
  try {

    const ss = SpreadsheetApp.openById(CONFIG.DATABASE.ID);
    const hojas = ss.getSheets().length;

    estado.base = { nivel: "ok", detalle: hojas + " tablas" };

  } catch (e) {

    estado.base = { nivel: "error", detalle: "Sin acceso" };

  }

  return estado;

}

/**
 * Cambia la propia contraseña del usuario logueado (autoservicio, sin
 * pasar por Administración). Requiere confirmar la contraseña actual
 * antes de aceptar la nueva.
 */
function apiCambiarMiPassword(emailUsuario, passwordActual, passwordNueva) {

  const usuario = UsuariosService.buscarPorEmail(emailUsuario);

  if (!usuario) {
    return { ok: false, error: "No se ha podido identificar tu usuario." };
  }

  const completo = UsuariosService._filaCompletaPorEmail(emailUsuario);

  if (!completo || !PasswordService.verificar(passwordActual, completo.sal, completo.hash)) {
    return { ok: false, error: "La contraseña actual no es correcta." };
  }

  if (!passwordNueva || String(passwordNueva).length < 6) {
    return { ok: false, error: "La contraseña nueva debe tener al menos 6 caracteres." };
  }

  return UsuariosService.update({ id: usuario.id, password: passwordNueva });

}

/**
 * Función de prueba
 */
function testPersonas() {

  const datos = PersonasService.getAll();

  Logger.log(JSON.stringify(datos));

  return datos;

}
