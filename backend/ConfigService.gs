/*
==================================================
BABEX
Archivo : ConfigService.gs
Versión : 0.1.0
Esquema: CLAVE, VALOR
==================================================
*/
const ConfigService = {};

/**
 * Devuelve todos los parámetros de configuración
 */
ConfigService.getAll = function () {

  const ss = SpreadsheetApp.openById(CONFIG.DATABASE.ID);
  const sheet = ss.getSheetByName(CONFIG.DATABASE.SHEETS.CONFIG);
  const values = sheet.getDataRange().getValues();
  values.shift();

  const config = values
    .filter(function (row) { return row[0] !== "" && row[0] !== null; })
    .map(function (row) {
      return {
        clave: String(row[0] || ""),
        valor: String(row[1] || "")
      };
    });

  return config;

};

/**
 * Inserta una nueva clave. No permite duplicados.
 */
ConfigService.insert = function (item) {

  const ss = SpreadsheetApp.openById(CONFIG.DATABASE.ID);
  const sheet = ss.getSheetByName(CONFIG.DATABASE.SHEETS.CONFIG);
  const values = sheet.getDataRange().getValues();

  for (let i = 1; i < values.length; i++) {

    if (String(values[i][0]) === String(item.clave)) {

      return { ok: false, error: "Ya existe una clave con ese nombre." };

    }

  }

  sheet.appendRow([item.clave, item.valor || ""]);

  return { ok: true };

};

/**
 * Actualiza el valor de una clave existente
 */
ConfigService.update = function (item) {

  const ss = SpreadsheetApp.openById(CONFIG.DATABASE.ID);
  const sheet = ss.getSheetByName(CONFIG.DATABASE.SHEETS.CONFIG);
  const values = sheet.getDataRange().getValues();

  for (let i = 1; i < values.length; i++) {

    if (String(values[i][0]) === String(item.clave)) {

      sheet.getRange(i + 1, 2, 1, 1).setValue(item.valor || "");

      return { ok: true };

    }

  }

  return { ok: false };

};

/**
 * Elimina una clave de configuración
 */
ConfigService.remove = function (clave) {

  const ss = SpreadsheetApp.openById(CONFIG.DATABASE.ID);
  const sheet = ss.getSheetByName(CONFIG.DATABASE.SHEETS.CONFIG);
  const values = sheet.getDataRange().getValues();

  for (let i = 1; i < values.length; i++) {

    if (String(values[i][0]) === String(clave)) {

      sheet.deleteRow(i + 1);

      return { ok: true };

    }

  }

  return { ok: false };

};
