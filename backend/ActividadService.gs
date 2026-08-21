/*
==================================================
BABEX
Archivo : ActividadService.gs
Versión : 0.1.0
Esquema: ID, FECHA, USUARIO, ACCION, MODULO, DETALLE
ACCION : "Creado" | "Editado" | "Eliminado"
==================================================
Registro de quién hace qué y cuándo. Se escribe desde Api.gs después
de cada alta, modificación o borrado.

Un fallo al registrar NUNCA debe tumbar la operación que lo provocó:
si no se puede escribir el historial, se traga el error y la acción
del usuario sigue adelante.

La pestaña ACTIVIDAD se crea sola la primera vez, así que no hay que
prepararla a mano en la hoja de cálculo.
==================================================
*/
const ActividadService = {};

ActividadService.MAXIMO_FILAS = 2000;

/**
 * Devuelve la hoja de actividad, creándola con sus cabeceras si es la
 * primera vez que se usa.
 */
ActividadService._hoja = function () {

  const ss = SpreadsheetApp.openById(CONFIG.DATABASE.ID);
  let sheet = ss.getSheetByName(CONFIG.DATABASE.SHEETS.ACTIVIDAD);

  if (!sheet) {

    sheet = ss.insertSheet(CONFIG.DATABASE.SHEETS.ACTIVIDAD);
    sheet.appendRow(["ID", "FECHA", "USUARIO", "ACCION", "MODULO", "DETALLE"]);
    sheet.setFrozenRows(1);

  }

  return sheet;

};

/**
 * Anota una acción en el historial.
 *
 * emailUsuario: quién la ha hecho (puede llegar vacío).
 * accion      : "Creado" | "Editado" | "Eliminado".
 * modulo      : "Personas", "Casos", ...
 * detalle     : texto corto que identifique el registro afectado.
 */
ActividadService.registrar = function (emailUsuario, accion, modulo, detalle) {

  try {

    const sheet = ActividadService._hoja();
    const lastRow = sheet.getLastRow();
    let nuevoId = 1;

    if (lastRow > 1) {
      nuevoId = Number(sheet.getRange(lastRow, 1).getValue()) + 1;
    }

    // Se guarda el nombre del usuario si lo conocemos; si no, el email.
    let quien = String(emailUsuario || "").trim();

    if (quien) {

      const usuario = UsuariosService.buscarPorEmail(quien);

      if (usuario && usuario.nombre) {
        quien = usuario.nombre;
      }

    } else {

      quien = "Desconocido";

    }

    sheet.appendRow([
      nuevoId,
      new Date(),
      quien,
      accion || "",
      modulo || "",
      String(detalle || "").slice(0, 200)
    ]);

    ActividadService._podar(sheet);

  } catch (e) {

    // No propaga: el historial no puede romper la app.

  }

};

/**
 * Evita que la hoja crezca sin límite: si se pasa del máximo, borra
 * las filas más antiguas.
 */
ActividadService._podar = function (sheet) {

  const filas = sheet.getLastRow() - 1; // sin la cabecera

  if (filas <= ActividadService.MAXIMO_FILAS) return;

  const sobran = filas - ActividadService.MAXIMO_FILAS;

  sheet.deleteRows(2, sobran);

};

/**
 * Últimas acciones registradas, de la más reciente a la más antigua.
 * La fecha se devuelve como texto ISO: los objetos Date no viajan
 * bien hacia el cliente a través de google.script.run.
 */
ActividadService.getUltimos = function (cuantos) {

  try {

    const sheet = ActividadService._hoja();
    const values = sheet.getDataRange().getValues();

    values.shift();

    return values
      .filter(function (row) { return row[0] !== "" && row[0] !== null; })
      .map(function (row) {
        return {
          id: Number(row[0]),
          fecha: row[1] ? new Date(row[1]).toISOString() : "",
          usuario: String(row[2] || ""),
          accion: String(row[3] || ""),
          modulo: String(row[4] || ""),
          detalle: String(row[5] || "")
        };
      })
      .reverse()
      .slice(0, cuantos || 8);

  } catch (e) {

    return [];

  }

};
