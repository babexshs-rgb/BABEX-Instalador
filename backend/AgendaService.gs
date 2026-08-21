/*
==================================================
BABEX
Archivo : AgendaService.gs
Versión : 0.3.0
Esquema: ID, PERSONA_ID, CASO_ID, INMUEBLE_ID, TITULO, FECHA, HORA,
         ESTADO, NOTAS, TIPO, TECNICO_ID
==================================================
TECNICO_ID (columna 11) es el usuario de la hoja USUARIOS al que se le
asigna la visita. Es lo que permite al instalador ver "sus" citas en la
vista de móvil. Si la columna todavía no existe en la hoja, se crea
sola la primera vez (ver _agendaAsegurarColumnaTecnico).
==================================================
*/
const AgendaService = {};

AgendaService.COLUMNAS = 11;

/**
 * Convierte una celda que puede venir como texto o como Date (si Sheets
 * la autodetectó como fecha) a un string "yyyy-MM-dd" fijo, en la zona
 * horaria del script.
 */
function _agendaFormatearFecha(valor) {
  if (valor instanceof Date) {
    return Utilities.formatDate(valor, Session.getScriptTimeZone(), "yyyy-MM-dd");
  }
  return String(valor || "");
}

/**
 * Igual que arriba pero para la hora, en formato "HH:mm".
 */
function _agendaFormatearHora(valor) {
  if (valor instanceof Date) {
    return Utilities.formatDate(valor, Session.getScriptTimeZone(), "HH:mm");
  }
  return String(valor || "");
}

/**
 * Añade la cabecera TECNICO_ID si la hoja todavía viene del esquema
 * anterior de 10 columnas. Así no hay que preparar nada a mano en la
 * hoja de cálculo antes de desplegar.
 */
function _agendaAsegurarColumnaTecnico(sheet) {

  const ultimaColumna = sheet.getLastColumn();

  if (ultimaColumna >= AgendaService.COLUMNAS) return;

  sheet.getRange(1, AgendaService.COLUMNAS).setValue("TECNICO_ID");

}

AgendaService._hoja = function () {

  const ss = SpreadsheetApp.openById(CONFIG.DATABASE.ID);
  const sheet = ss.getSheetByName(CONFIG.DATABASE.SHEETS.AGENDA);

  _agendaAsegurarColumnaTecnico(sheet);

  return sheet;

};

/**
 * Devuelve todas las citas
 */
AgendaService.getAll = function () {

  const sheet = AgendaService._hoja();
  const values = sheet.getDataRange().getValues();

  // Eliminar cabecera
  values.shift();

  return values
    .filter(function (row) { return row[0] !== "" && row[0] !== null; })
    .map(function (row) {
      return {
        id: Number(row[0]),
        personaId: row[1] !== "" && row[1] !== null ? Number(row[1]) : null,
        casoId: row[2] !== "" && row[2] !== null ? Number(row[2]) : null,
        inmuebleId: row[3] !== "" && row[3] !== null ? Number(row[3]) : null,
        titulo: String(row[4] || ""),
        fecha: _agendaFormatearFecha(row[5]),
        hora: _agendaFormatearHora(row[6]),
        estado: String(row[7] || ""),
        notas: String(row[8] || ""),
        tipo: String(row[9] || "Visita"),
        tecnicoId: row[10] !== "" && row[10] !== null && row[10] !== undefined ? Number(row[10]) : null
      };
    });

};

/**
 * Citas asignadas a un técnico concreto (por su id en USUARIOS),
 * ordenadas por fecha y hora. Se usa en la vista de móvil.
 */
AgendaService.getPorTecnico = function (tecnicoId) {

  if (!tecnicoId) return [];

  return AgendaService.getAll()
    .filter(function (c) {
      return Number(c.tecnicoId) === Number(tecnicoId) && c.estado !== "Cancelada";
    })
    .sort(function (a, b) {
      return ((a.fecha || "") + " " + (a.hora || "")).localeCompare((b.fecha || "") + " " + (b.hora || ""));
    });

};

/**
 * Inserta una nueva cita
 */
AgendaService.insert = function (cita) {

  const sheet = AgendaService._hoja();
  const lastRow = sheet.getLastRow();
  let nuevoId = 1;

  if (lastRow > 1) {
    nuevoId = Number(sheet.getRange(lastRow, 1).getValue()) + 1;
  }

  sheet.appendRow([
    nuevoId,
    cita.personaId || "",
    cita.casoId || "",
    cita.inmuebleId || "",
    cita.titulo || "",
    cita.fecha || "",
    cita.hora || "",
    cita.estado || "Pendiente",
    cita.notas || "",
    cita.tipo || "Visita",
    cita.tecnicoId || ""
  ]);

  return {
    ok: true,
    id: nuevoId
  };

};

/**
 * Actualiza una cita.
 *
 * Los campos que no se envíen mantienen su valor actual, para poder
 * cambiar solo el estado (lo que hace el instalador al cerrar una
 * visita) sin tener que mandar la cita entera.
 */
AgendaService.update = function (cita) {

  const sheet = AgendaService._hoja();
  const values = sheet.getDataRange().getValues();

  for (let i = 1; i < values.length; i++) {

    if (Number(values[i][0]) === Number(cita.id)) {

      const fila = values[i];

      function valor(campo, indice, porDefecto) {
        return cita[campo] !== undefined ? cita[campo] : (fila[indice] !== undefined ? fila[indice] : porDefecto);
      }

      sheet.getRange(i + 1, 2, 1, AgendaService.COLUMNAS - 1).setValues([[
        valor("personaId", 1, ""),
        valor("casoId", 2, ""),
        valor("inmuebleId", 3, ""),
        valor("titulo", 4, ""),
        valor("fecha", 5, ""),
        valor("hora", 6, ""),
        valor("estado", 7, "Pendiente"),
        valor("notas", 8, ""),
        valor("tipo", 9, "Visita"),
        valor("tecnicoId", 10, "")
      ]]);

      return { ok: true };

    }

  }

  return { ok: false };

};

/**
 * Elimina una cita
 */
AgendaService.remove = function (id) {

  const sheet = AgendaService._hoja();
  const values = sheet.getDataRange().getValues();

  for (let i = 1; i < values.length; i++) {
    if (Number(values[i][0]) === Number(id)) {
      sheet.deleteRow(i + 1);
      return { ok: true };
    }
  }

  return { ok: false };

};
