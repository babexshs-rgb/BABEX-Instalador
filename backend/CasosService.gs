/*
==================================================
BABEX
Archivo : CasosService.gs
Versión : 0.1.0
Esquema: ID, PERSONA_ID, INMUEBLE_ID, ESTADO, TIPO, DESCRIPCION, FECHA_APERTURA, FECHA_CIERRE
==================================================
*/
const CasosService = {};

/**
 * Convierte una celda que puede venir como texto o como Date (si Sheets
 * la autodetectó como fecha) a un string "yyyy-MM-dd" fijo, en la zona
 * horaria del script.
 */
function _casosFormatearFecha(valor) {
  if (valor instanceof Date) {
    return Utilities.formatDate(valor, Session.getScriptTimeZone(), "yyyy-MM-dd");
  }
  return String(valor || "");
}

/**
 * Devuelve todos los casos
 */
CasosService.getAll = function () {
  const ss = SpreadsheetApp.openById(CONFIG.DATABASE.ID);
  const sheet = ss.getSheetByName(CONFIG.DATABASE.SHEETS.CASOS);
  const values = sheet.getDataRange().getValues();
  // Eliminar cabecera
  values.shift();
  const casos = values.map(function (row) {
    return {
      id: Number(row[0]),
      personaId: row[1] !== "" && row[1] !== null ? Number(row[1]) : null,
      inmuebleId: row[2] !== "" && row[2] !== null ? Number(row[2]) : null,
      estado: String(row[3] || ""),
      tipo: String(row[4] || ""),
      descripcion: String(row[5] || ""),
      fechaApertura: _casosFormatearFecha(row[6]),
      fechaCierre: _casosFormatearFecha(row[7])
    };
  });
  Logger.log(JSON.stringify(casos));
  return casos;
};
/**
 * Inserta un nuevo caso
 */
CasosService.insert = function (caso) {
  const ss = SpreadsheetApp.openById(CONFIG.DATABASE.ID);
  const sheet = ss.getSheetByName(CONFIG.DATABASE.SHEETS.CASOS);
  const lastRow = sheet.getLastRow();
  let nuevoId = 1;
  if (lastRow > 1) {
    nuevoId = Number(sheet.getRange(lastRow, 1).getValue()) + 1;
  }
  const fechaApertura = caso.fechaApertura || Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "yyyy-MM-dd");
  sheet.appendRow([
    nuevoId,
    caso.personaId || "",
    caso.inmuebleId || "",
    caso.estado || "Abierto",
    caso.tipo || "",
    caso.descripcion || "",
    fechaApertura,
    caso.fechaCierre || ""
  ]);
  return {
    ok: true,
    id: nuevoId
  };
};
/**
 * Actualiza un caso
 */
CasosService.update = function (caso) {
  const ss = SpreadsheetApp.openById(CONFIG.DATABASE.ID);
  const sheet = ss.getSheetByName(CONFIG.DATABASE.SHEETS.
CASOS);
  const values = sheet.getDataRange().getValues();
  for (let i = 1; i < values.length; i++) {
    if (Number(values[i][0]) === Number(caso.id)) {
      sheet.getRange(i + 1, 2, 1, 7).setValues([[
        caso.personaId,
        caso.inmuebleId,
        caso.estado,
        caso.tipo,
        caso.descripcion,
        caso.fechaApertura,
        caso.fechaCierre
      ]]);
      return { ok: true };
    }
  }
  return { ok: false };
};
/**
 * Elimina un caso
 */
CasosService.remove = function (id) {
  const ss = SpreadsheetApp.openById(CONFIG.DATABASE.ID);
  const sheet = ss.getSheetByName(CONFIG.DATABASE.SHEETS.CASOS);
  const values = sheet.getDataRange().getValues();
  for (let i = 1; i < values.length; i++) {
    if (Number(values[i][0]) === Number(id)) {
      sheet.deleteRow(i + 1);
      return { ok: true };
    }
  }
  return { ok: false };
};
