/*
==================================================
BABEX
Archivo : InformesService.gs
Versión : 0.1.0
==================================================
Genera informes en PDF o CSV a partir de los datos de la app y los
deja en Drive, dentro de BABEX_Documentos/Informes. Devuelve la URL
para que el usuario lo abra o lo descargue.

Se generan en el servidor (y no en el navegador) porque dentro del
iframe de Apps Script las descargas directas quedan bloqueadas.
==================================================
*/
const InformesService = {};

InformesService.CARPETA = "Informes";

/**
 * Definición de cada informe: de dónde salen los datos, por qué campo
 * se filtra por fechas y qué columnas se muestran.
 */
InformesService.TIPOS = {

  personas: {
    titulo: "Listado de personas",
    campoFecha: "fechaAlta",
    columnas: [
      { clave: "id",           etiqueta: "ID" },
      { clave: "nombre",       etiqueta: "Nombre" },
      { clave: "apellidos",    etiqueta: "Apellidos" },
      { clave: "tipo",         etiqueta: "Tipo" },
      { clave: "telefono",     etiqueta: "Teléfono" },
      { clave: "email",        etiqueta: "Email" },
      { clave: "ciudad",       etiqueta: "Ciudad" },
      { clave: "activo",       etiqueta: "Activo" }
    ]
  },

  casos: {
    titulo: "Casos",
    campoFecha: "fechaApertura",
    columnas: [
      { clave: "id",             etiqueta: "ID" },
      { clave: "_cliente",       etiqueta: "Cliente" },
      { clave: "tipo",           etiqueta: "Tipo" },
      { clave: "estado",         etiqueta: "Estado" },
      { clave: "descripcion",    etiqueta: "Descripción" },
      { clave: "fechaApertura",  etiqueta: "Apertura" },
      { clave: "fechaCierre",    etiqueta: "Cierre" }
    ]
  },

  citas: {
    titulo: "Agenda",
    campoFecha: "fecha",
    columnas: [
      { clave: "id",        etiqueta: "ID" },
      { clave: "fecha",     etiqueta: "Fecha" },
      { clave: "hora",      etiqueta: "Hora" },
      { clave: "titulo",    etiqueta: "Título" },
      { clave: "tipo",      etiqueta: "Tipo" },
      { clave: "estado",    etiqueta: "Estado" },
      { clave: "_cliente",  etiqueta: "Cliente" }
    ]
  },

  documentos: {
    titulo: "Documentos",
    campoFecha: "fechaSubida",
    columnas: [
      { clave: "id",           etiqueta: "ID" },
      { clave: "nombre",       etiqueta: "Nombre" },
      { clave: "categoria",    etiqueta: "Categoría" },
      { clave: "_cliente",     etiqueta: "Cliente" },
      { clave: "fechaSubida",  etiqueta: "Subido" }
    ]
  },

  actividad: {
    titulo: "Actividad",
    campoFecha: "fecha",
    columnas: [
      { clave: "fecha",    etiqueta: "Fecha" },
      { clave: "usuario",  etiqueta: "Usuario" },
      { clave: "accion",   etiqueta: "Acción" },
      { clave: "modulo",   etiqueta: "Módulo" },
      { clave: "detalle",  etiqueta: "Detalle" }
    ]
  }

};

/**
 * Trae las filas del informe pedido, ya filtradas por fechas y con el
 * nombre del cliente resuelto donde hace falta.
 */
InformesService._filas = function (tipo, desde, hasta) {

  const personas = PersonasService.getAll();

  function nombreCliente(personaId) {

    if (!personaId) return "";

    const p = personas.find(function (x) { return Number(x.id) === Number(personaId); });

    return p ? (p.nombre + " " + (p.apellidos || "")).trim() : "";

  }

  let datos;

  if (tipo === "personas") {

    datos = personas.slice();

  } else if (tipo === "casos") {

    datos = CasosService.getAll().map(function (c) {
      c._cliente = nombreCliente(c.personaId);
      return c;
    });

  } else if (tipo === "citas") {

    datos = AgendaService.getAll().map(function (c) {
      c._cliente = nombreCliente(c.personaId);
      return c;
    });

  } else if (tipo === "documentos") {

    datos = DocumentosService.getAll().map(function (d) {
      d._cliente = nombreCliente(d.personaId);
      return d;
    });

  } else if (tipo === "actividad") {

    datos = ActividadService.getUltimos(100000);

  } else {

    return [];

  }

  const campoFecha = InformesService.TIPOS[tipo].campoFecha;

  // El filtro por fechas es opcional: si no se indican, entra todo.
  return datos.filter(function (fila) {

    if (!desde && !hasta) return true;

    const valor = String(fila[campoFecha] || "").slice(0, 10);

    if (!valor) return false;
    if (desde && valor < desde) return false;
    if (hasta && valor > hasta) return false;

    return true;

  });

};

InformesService._escaparHtml = function (texto) {

  return String(texto == null ? "" : texto)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

};

/**
 * Carpeta BABEX_Documentos/Informes, creándola si no existe.
 */
InformesService._carpeta = function () {

  return DriveService.getCarpetaPorRuta([InformesService.CARPETA]);

};

/**
 * Genera el informe y lo guarda en Drive.
 *
 * tipo   : clave de InformesService.TIPOS
 * desde  : "AAAA-MM-DD" o vacío
 * hasta  : "AAAA-MM-DD" o vacío
 * formato: "pdf" | "csv"
 */
InformesService.generar = function (tipo, desde, hasta, formato) {

  const definicion = InformesService.TIPOS[tipo];

  if (!definicion) {
    return { ok: false, error: "Tipo de informe no reconocido." };
  }

  const filas = InformesService._filas(tipo, desde, hasta);

  if (!filas.length) {
    return { ok: false, error: "No hay datos para ese informe en el periodo indicado." };
  }

  const ahora = new Date();
  const marca = Utilities.formatDate(ahora, CONFIG.ZONA_HORARIA || "Europe/Madrid", "yyyy-MM-dd_HH-mm");
  const nombreArchivo = "BABEX_" + definicion.titulo.replace(/\s+/g, "_") + "_" + marca;

  const carpeta = InformesService._carpeta();

  let archivo;

  if (formato === "csv") {

    const lineas = [];

    lineas.push(definicion.columnas.map(function (c) { return '"' + c.etiqueta + '"'; }).join(","));

    filas.forEach(function (fila) {

      lineas.push(definicion.columnas.map(function (c) {

        const valor = String(fila[c.clave] == null ? "" : fila[c.clave]).replace(/"/g, '""');

        return '"' + valor + '"';

      }).join(","));

    });

    // El BOM inicial hace que Excel abra el CSV con las tildes bien.
    const contenido = "﻿" + lineas.join("\r\n");

    archivo = carpeta.createFile(Utilities.newBlob(contenido, "text/csv", nombreArchivo + ".csv"));

  } else {

    const periodo = (desde || hasta)
      ? "Periodo: " + (desde || "inicio") + " a " + (hasta || "hoy")
      : "Todos los registros";

    let html = '<html><head><meta charset="UTF-8"><style>' +
      'body{font-family:Arial,Helvetica,sans-serif;color:#222;font-size:11px;}' +
      'h1{font-size:18px;margin:0 0 4px;}' +
      '.sub{color:#666;font-size:11px;margin:0 0 16px;}' +
      'table{width:100%;border-collapse:collapse;}' +
      'th{background:#1d4ed8;color:#fff;text-align:left;padding:7px 8px;font-size:11px;}' +
      'td{padding:6px 8px;border-bottom:1px solid #e5e7eb;vertical-align:top;}' +
      'tr:nth-child(even) td{background:#f7f8fa;}' +
      '.pie{margin-top:18px;color:#888;font-size:10px;}' +
      '</style></head><body>';

    html += '<h1>BABEX — ' + definicion.titulo + '</h1>';
    html += '<p class="sub">' + periodo + ' · ' + filas.length + ' registros · Generado el ' +
            Utilities.formatDate(ahora, CONFIG.ZONA_HORARIA || "Europe/Madrid", "dd/MM/yyyy HH:mm") + '</p>';

    html += '<table><tr>';

    definicion.columnas.forEach(function (c) {
      html += '<th>' + c.etiqueta + '</th>';
    });

    html += '</tr>';

    filas.forEach(function (fila) {

      html += '<tr>';

      definicion.columnas.forEach(function (c) {

        let valor = fila[c.clave];

        // Las fechas ISO se recortan a la parte de día.
        if (typeof valor === "string" && /^\d{4}-\d{2}-\d{2}T/.test(valor)) {
          valor = valor.slice(0, 10);
        }

        html += '<td>' + InformesService._escaparHtml(valor) + '</td>';

      });

      html += '</tr>';

    });

    html += '</table><p class="pie">BABEX · Smart Home Solutions</p></body></html>';

    const pdf = Utilities.newBlob(html, "text/html", nombreArchivo + ".html")
      .getAs("application/pdf")
      .setName(nombreArchivo + ".pdf");

    archivo = carpeta.createFile(pdf);

  }

  return {
    ok: true,
    nombre: archivo.getName(),
    url: archivo.getUrl(),
    registros: filas.length
  };

};
