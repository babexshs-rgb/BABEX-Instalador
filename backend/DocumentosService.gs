/*
==================================================
BABEX
Archivo : DocumentosService.gs
Versión : 0.3.0
Esquema: ID, PERSONA_ID, CASO_ID, INMUEBLE_ID, EMPRESA_ID, NOMBRE,
         DRIVE_FILE_ID, URL, TIPO, FECHA_SUBIDA, CATEGORIA, ESTANCIA_ID
==================================================
*/
const DocumentosService = {};

DocumentosService.COLUMNAS = 12;

DocumentosService.CABECERAS = [
  "ID", "PERSONA_ID", "CASO_ID", "INMUEBLE_ID", "EMPRESA_ID", "NOMBRE",
  "DRIVE_FILE_ID", "URL", "TIPO", "FECHA_SUBIDA", "CATEGORIA", "ESTANCIA_ID"
];

/**
 * Añade la columna ESTANCIA_ID si el archivo se creó antes de que
 * existiera (permite asociar una foto a una estancia concreta del
 * inmueble, para verla agrupada desde la ficha en vez de solo en el
 * listado general de documentos).
 */
function _documentosAsegurarColumnas(sheet) {

  const actuales = sheet.getLastColumn();

  if (actuales < DocumentosService.COLUMNAS) {

    sheet.getRange(1, actuales + 1, 1, DocumentosService.COLUMNAS - actuales)
      .setValues([DocumentosService.CABECERAS.slice(actuales)]);

  }

}

/**
 * Convierte una celda que puede venir como texto o como Date (si Sheets
 * la autodetectó como fecha) a un string "yyyy-MM-dd" fijo, en la zona
 * horaria del script.
 */
function _documentosFormatearFecha(valor) {
  if (valor instanceof Date) {
    return Utilities.formatDate(valor, Session.getScriptTimeZone(), "yyyy-MM-dd");
  }
  return String(valor || "");
}

/**
 * Decide el nombre de la subcarpeta de Drive para un documento:
 * prioriza el nombre del cliente (Persona) vinculado y, si no hay,
 * el de la Empresa/Proveedor. Si no está vinculado a ninguno, no usa subcarpeta.
 */
function _documentosNombreCarpeta(doc) {

  if (doc.personaId) {

    const personas = PersonasService.getAll();
    const persona = personas.find(function (p) { return Number(p.id) === Number(doc.personaId); });

    if (persona) {
      return (persona.nombre + " " + (persona.apellidos || "")).trim();
    }

  }

  if (doc.empresaId) {

    const empresas = EmpresasService.getAll();
    const empresa = empresas.find(function (e) { return Number(e.id) === Number(doc.empresaId); });

    if (empresa) {
      return empresa.nombre;
    }

  }

  return null;

}

/**
 * Cuenta cuántos documentos existen ya para la misma entidad
 * (mismo cliente, o misma empresa/proveedor, o ninguno) y la misma
 * categoría, para poder numerar el siguiente correlativo.
 */
function _documentosSiguienteNumero(doc, categoria) {

  const ss = SpreadsheetApp.openById(CONFIG.DATABASE.ID);
  const sheet = ss.getSheetByName(CONFIG.DATABASE.SHEETS.DOCUMENTOS);
  const values = sheet.getDataRange().getValues();
  values.shift();

  let contador = 0;

  values.forEach(function (row) {

    if (row[0] === "" || row[0] === null) return;

    const cat = String(row[10] || "");

    if (cat !== categoria) return;

    const mismaPersona = doc.personaId
      ? Number(row[1]) === Number(doc.personaId)
      : (row[1] === "" || row[1] === null);

    const mismaEmpresa = doc.empresaId
      ? Number(row[4]) === Number(doc.empresaId)
      : (row[4] === "" || row[4] === null);

    if (mismaPersona && mismaEmpresa) {
      contador++;
    }

  });

  return contador + 1;

}

/**
 * Extrae la extensión (con el punto) del nombre de archivo original.
 */
function _documentosExtension(nombreOriginal) {

  const partes = String(nombreOriginal || "").split(".");

  if (partes.length > 1) {
    return "." + partes[partes.length - 1];
  }

  return "";

}

/**
 * Convierte un texto libre en un "slug" seguro para nombres de archivo:
 * sin acentos, en minúsculas y con espacios/símbolos como "_".
 * Ej: "Cámara jardín nº2" -> "camara_jardin_n_2"
 */
function _documentosSlug(texto) {

  if (!texto) return "";

  const rangoDiacriticos = new RegExp("[̀-ͯ]", "g");

  const sinAcentos = String(texto)
    .normalize("NFD")
    .replace(rangoDiacriticos, "");

  return sinAcentos
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");

}

/**
 * Nombre de la subcarpeta "por tipo" dentro de la carpeta del cliente/
 * empresa/proveedor. Todas las fotos (sea cual sea el subtipo: Visita,
 * Instalación, Mantenimiento...) van juntas en una única carpeta "Fotos".
 * Los PDF van cada uno en su propia carpeta según su tipo (Presupuesto,
 * Factura, Contrato, Informe, Otro).
 */
function _documentosCarpetaPorTipo(tipoDetectado, categoria) {

  if (tipoDetectado === "Foto") {
    return "Fotos";
  }

  return String(categoria || "Otro");

}

/**
 * Genera el nombre visible del documento: Categoria_001[_observacion]
 * Ej: "Foto_Instalación_001_camara_jardin"
 */
function _documentosGenerarNombre(categoria, numero, observacion) {

  const num = String(numero).padStart(3, "0");
  let nombre = String(categoria || "Otro") + "_" + num;

  const obsSlug = _documentosSlug(observacion);

  if (obsSlug) {
    nombre += "_" + obsSlug;
  }

  return nombre;

}

/**
 * Devuelve todos los documentos
 */
DocumentosService.getAll = function () {

  const ss = SpreadsheetApp.openById(CONFIG.DATABASE.ID);
  const sheet = ss.getSheetByName(CONFIG.DATABASE.SHEETS.DOCUMENTOS);

  _documentosAsegurarColumnas(sheet);

  const values = sheet.getDataRange().getValues();
  values.shift();

  const documentos = values
    .filter(function (row) { return row[0] !== "" && row[0] !== null; })
    .map(function (row) {
      return {
        id: Number(row[0]),
        personaId: row[1] !== "" && row[1] !== null ? Number(row[1]) : null,
        casoId: row[2] !== "" && row[2] !== null ? Number(row[2]) : null,
        inmuebleId: row[3] !== "" && row[3] !== null ? Number(row[3]) : null,
        empresaId: row[4] !== "" && row[4] !== null ? Number(row[4]) : null,
        nombre: String(row[5] || ""),
        driveFileId: String(row[6] || ""),
        url: String(row[7] || ""),
        tipo: String(row[8] || ""),
        fechaSubida: _documentosFormatearFecha(row[9]),
        categoria: String(row[10] || ""),
        estanciaId: row[11] !== "" && row[11] !== null && row[11] !== undefined ? Number(row[11]) : null
      };
    });

  return documentos;

};

/**
 * Fotos (solo imágenes) de un inmueble, agrupables por estancia en el
 * cliente a partir de `estanciaId`.
 */
DocumentosService.fotosDeInmueble = function (inmuebleId) {

  return DocumentosService.getAll().filter(function (d) {

    const esImagen = String(d.tipo || "").indexOf("image") === 0;

    return esImagen && Number(d.inmuebleId) === Number(inmuebleId);

  });

};

/**
 * Sube el archivo a Drive (en la subcarpeta del cliente/empresa si aplica)
 * con un nombre autogenerado a partir de la categoría, un correlativo por
 * entidad y, opcionalmente, una observación. Inserta la fila de metadatos.
 * Espera: { nombreOriginal, base64, mimeType, categoria, observacion,
 *           personaId, casoId, inmuebleId, empresaId }
 */
DocumentosService.insert = function (doc) {

  const ss = SpreadsheetApp.openById(CONFIG.DATABASE.ID);
  const sheet = ss.getSheetByName(CONFIG.DATABASE.SHEETS.DOCUMENTOS);

  _documentosAsegurarColumnas(sheet);

  const lastRow = sheet.getLastRow();

  let nuevoId = 1;

  if (lastRow > 1) {
    nuevoId = Number(sheet.getRange(lastRow, 1).getValue()) + 1;
  }

  const categoria = doc.categoria || "Otro";
  const numero = _documentosSiguienteNumero(doc, categoria);
  const nombreVisible = _documentosGenerarNombre(categoria, numero, doc.observacion);
  const extension = _documentosExtension(doc.nombreOriginal);
  const nombreArchivo = nombreVisible + extension;

  const nombreCarpeta = _documentosNombreCarpeta(doc);
  const carpetaPorTipo = _documentosCarpetaPorTipo(doc.tipoDetectado, categoria);

  const segmentosCarpeta = [];
  if (nombreCarpeta) segmentosCarpeta.push(nombreCarpeta);
  segmentosCarpeta.push(carpetaPorTipo);

  const subida = DriveService.subirArchivo(nombreArchivo, doc.base64, doc.mimeType, segmentosCarpeta);
  const fecha = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "yyyy-MM-dd");

  sheet.appendRow([
    nuevoId,
    doc.personaId || "",
    doc.casoId || "",
    doc.inmuebleId || "",
    doc.empresaId || "",
    nombreVisible,
    subida.id,
    subida.url,
    doc.mimeType || "",
    fecha,
    categoria,
    doc.estanciaId || ""
  ]);

  return {
    ok: true,
    id: nuevoId,
    url: subida.url,
    nombre: nombreVisible
  };

};

/**
 * Actualiza solo las relaciones de un documento (cliente/empresa/caso/inmueble).
 * El archivo, el nombre y la categoría se fijan al crear el documento.
 */
DocumentosService.update = function (doc) {

  const ss = SpreadsheetApp.openById(CONFIG.DATABASE.ID);
  const sheet = ss.getSheetByName(CONFIG.DATABASE.SHEETS.DOCUMENTOS);
  const values = sheet.getDataRange().getValues();

  for (let i = 1; i < values.length; i++) {

    if (Number(values[i][0]) === Number(doc.id)) {

      sheet.getRange(i + 1, 2, 1, 4).setValues([[
        doc.personaId || "",
        doc.casoId || "",
        doc.inmuebleId || "",
        doc.empresaId || ""
      ]]);

      return { ok: true };

    }

  }

  return { ok: false };

};

/**
 * Asigna (o quita, con estanciaId vacío) la estancia de una foto ya
 * subida. Va aparte de `update()` porque esa función sobrescribe las
 * cuatro relaciones (persona/caso/inmueble/empresa) de golpe con lo
 * que reciba; aquí solo se toca la columna de la estancia, para no
 * arriesgarse a vaciar las demás por no incluirlas en la llamada.
 */
DocumentosService.asignarEstancia = function (id, estanciaId) {

  const ss = SpreadsheetApp.openById(CONFIG.DATABASE.ID);
  const sheet = ss.getSheetByName(CONFIG.DATABASE.SHEETS.DOCUMENTOS);

  _documentosAsegurarColumnas(sheet);

  const values = sheet.getDataRange().getValues();

  for (let i = 1; i < values.length; i++) {

    if (Number(values[i][0]) === Number(id)) {

      sheet.getRange(i + 1, 12).setValue(estanciaId || "");

      return { ok: true };

    }

  }

  return { ok: false, error: "Documento no encontrado." };

};

/**
 * Elimina la fila de metadatos y envía el archivo de Drive a la papelera.
 */
DocumentosService.remove = function (id) {

  const ss = SpreadsheetApp.openById(CONFIG.DATABASE.ID);
  const sheet = ss.getSheetByName(CONFIG.DATABASE.SHEETS.DOCUMENTOS);
  const values = sheet.getDataRange().getValues();

  for (let i = 1; i < values.length; i++) {

    if (Number(values[i][0]) === Number(id)) {

      const fileId = String(values[i][6] || "");

      if (fileId) {
        DriveService.eliminarArchivo(fileId);
      }

      sheet.deleteRow(i + 1);

      return { ok: true };

    }

  }

  return { ok: false };

};
