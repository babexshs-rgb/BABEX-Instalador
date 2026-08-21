/*
==================================================
BABEX
Archivo : EstanciasService.gs
Versión : 0.1.0
Esquema: ID, INMUEBLE_ID, NOMBRE, TIPO, OBSERVACIONES, FECHA_ALTA
==================================================
Las estancias de un inmueble (salón, cocina, dormitorio...).

Cuelgan del INMUEBLE y no de la visita: se levantan una vez en la
primera visita y se reutilizan en la instalación y en los
mantenimientos posteriores. Así el histórico de qué hay en cada
habitación se mantiene aunque cambien los técnicos o pasen los años.

La hoja se crea sola la primera vez.
==================================================
*/
const EstanciasService = {};

EstanciasService.CABECERAS = ["ID", "INMUEBLE_ID", "NOMBRE", "TIPO", "OBSERVACIONES", "FECHA_ALTA"];

EstanciasService._hoja = function () {

  const ss = SpreadsheetApp.openById(CONFIG.DATABASE.ID);
  let sheet = ss.getSheetByName(CONFIG.DATABASE.SHEETS.ESTANCIAS);

  if (!sheet) {

    sheet = ss.insertSheet(CONFIG.DATABASE.SHEETS.ESTANCIAS);
    sheet.appendRow(EstanciasService.CABECERAS);
    sheet.setFrozenRows(1);

  }

  return sheet;

};

EstanciasService.getAll = function () {

  const sheet = EstanciasService._hoja();
  const values = sheet.getDataRange().getValues();

  values.shift();

  return values
    .filter(function (row) { return row[0] !== "" && row[0] !== null; })
    .map(function (row) {
      return {
        id: Number(row[0]),
        inmuebleId: row[1] !== "" && row[1] !== null ? Number(row[1]) : null,
        nombre: String(row[2] || ""),
        tipo: String(row[3] || ""),
        observaciones: String(row[4] || ""),
        fechaAlta: row[5] ? new Date(row[5]).toISOString() : ""
      };
    });

};

/**
 * Estancias de un inmueble concreto, en el orden en que se dieron de
 * alta (que suele ser el orden en que se recorre la casa).
 */
EstanciasService.getPorInmueble = function (inmuebleId) {

  if (!inmuebleId) return [];

  return EstanciasService.getAll().filter(function (e) {
    return Number(e.inmuebleId) === Number(inmuebleId);
  });

};

EstanciasService.insert = function (estancia) {

  if (!estancia || !estancia.inmuebleId) {
    return { ok: false, error: "La estancia tiene que pertenecer a un inmueble." };
  }

  if (!String(estancia.nombre || "").trim()) {
    return { ok: false, error: "La estancia necesita un nombre." };
  }

  const sheet = EstanciasService._hoja();
  const lastRow = sheet.getLastRow();
  let nuevoId = 1;

  if (lastRow > 1) {
    nuevoId = Number(sheet.getRange(lastRow, 1).getValue()) + 1;
  }

  sheet.appendRow([
    nuevoId,
    estancia.inmuebleId,
    String(estancia.nombre).trim(),
    estancia.tipo || "",
    estancia.observaciones || "",
    new Date()
  ]);

  return { ok: true, id: nuevoId };

};

EstanciasService.update = function (estancia) {

  const sheet = EstanciasService._hoja();
  const values = sheet.getDataRange().getValues();

  for (let i = 1; i < values.length; i++) {

    if (Number(values[i][0]) === Number(estancia.id)) {

      const fila = values[i];

      function valor(campo, indice) {
        return estancia[campo] !== undefined ? estancia[campo] : fila[indice];
      }

      sheet.getRange(i + 1, 2, 1, 4).setValues([[
        valor("inmuebleId", 1),
        valor("nombre", 2),
        valor("tipo", 3),
        valor("observaciones", 4)
      ]]);

      return { ok: true };

    }

  }

  return { ok: false, error: "Estancia no encontrada." };

};

EstanciasService.remove = function (id) {

  const sheet = EstanciasService._hoja();
  const values = sheet.getDataRange().getValues();

  for (let i = 1; i < values.length; i++) {

    if (Number(values[i][0]) === Number(id)) {

      sheet.deleteRow(i + 1);

      return { ok: true };

    }

  }

  return { ok: false, error: "Estancia no encontrada." };

};
