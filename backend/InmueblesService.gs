/*
==================================================
BABEX
Archivo : InmueblesService.gs
Versión : 0.2.0
Esquema: ID, PERSONA_ID, DIRECCION, CIUDAD, TIPO, OBSERVACIONES,
         LATITUD, LONGITUD, SUBTIPO, CARACTERISTICAS
==================================================
LATITUD y LONGITUD (columnas 7 y 8) se usan para abrir la dirección
en el navegador GPS desde la app del instalador.

TIPO es la categoría general (Vivienda, Local, Otro) y SUBTIPO la
concreción cuando aplica (Piso, Chalet, Adosado...). Se separan porque
"todas las viviendas" es una consulta que se hará a menudo, y con un
solo campo de texto libre no se puede agrupar.

CARACTERISTICAS guarda, en JSON, las respuestas a las preguntas que
dependen del tipo (plantas, garaje, jardín, ascensor...). Se guarda
así y no en columnas fijas porque las preguntas cambian según el tipo
de inmueble: con columnas habría que añadir una cada vez que aparezca
un caso nuevo, y la mayoría quedarían vacías.

Las columnas que falten se crean solas (ver _inmueblesAsegurarColumnas).
==================================================
*/

const InmueblesService = {};

InmueblesService.COLUMNAS = 10;

/**
 * Añade las cabeceras que falten si la hoja viene de un esquema
 * anterior, para no tener que prepararla a mano.
 */
function _inmueblesAsegurarColumnas(sheet) {

  const ultima = sheet.getLastColumn();

  if (ultima >= InmueblesService.COLUMNAS) return;

  if (ultima < 7) sheet.getRange(1, 7).setValue("LATITUD");
  if (ultima < 8) sheet.getRange(1, 8).setValue("LONGITUD");
  if (ultima < 9) sheet.getRange(1, 9).setValue("SUBTIPO");
  if (ultima < 10) sheet.getRange(1, 10).setValue("CARACTERISTICAS");

}

/**
 * Las características viajan como JSON en una celda. Si la celda está
 * vacía o tiene algo que no se puede leer, se devuelve un objeto
 * vacío: nunca debe reventar la carga de inmuebles por esto.
 */
function _inmueblesLeerCaracteristicas(valor) {

  if (!valor) return {};

  try {

    const objeto = JSON.parse(String(valor));

    return (objeto && typeof objeto === "object") ? objeto : {};

  } catch (e) {

    return {};

  }

}

InmueblesService._hoja = function () {

  const ss = SpreadsheetApp.openById(CONFIG.DATABASE.ID);
  const sheet = ss.getSheetByName(CONFIG.DATABASE.SHEETS.INMUEBLES);

  _inmueblesAsegurarColumnas(sheet);

  return sheet;

};

/**
 * Devuelve todos los inmuebles
 */
InmueblesService.getAll = function () {

  const sheet = InmueblesService._hoja();

  const values = sheet.getDataRange().getValues();

  // Eliminar cabecera
  values.shift();

  return values
    .filter(function (row) { return row[0] !== "" && row[0] !== null; })
    .map(function (row) {

      return {

        id: Number(row[0]),

        personaId: row[1] !== "" && row[1] !== null ? Number(row[1]) : null,

        direccion: String(row[2] || ""),

        ciudad: String(row[3] || ""),

        tipo: String(row[4] || ""),

        observaciones: String(row[5] || ""),

        latitud: row[6] !== "" && row[6] !== null && row[6] !== undefined ? String(row[6]) : "",

        longitud: row[7] !== "" && row[7] !== null && row[7] !== undefined ? String(row[7]) : "",

        subtipo: String(row[8] || ""),

        caracteristicas: _inmueblesLeerCaracteristicas(row[9])

      };

    });

};

/**
 * Inserta un nuevo inmueble
 */
InmueblesService.insert = function (inmueble) {

  const sheet = InmueblesService._hoja();

  const lastRow = sheet.getLastRow();

  let nuevoId = 1;

  if (lastRow > 1) {
    nuevoId = Number(sheet.getRange(lastRow, 1).getValue()) + 1;
  }

  sheet.appendRow([
    nuevoId,
    inmueble.personaId || "",
    inmueble.direccion || "",
    inmueble.ciudad || "",
    inmueble.tipo || "",
    inmueble.observaciones || "",
    inmueble.latitud || "",
    inmueble.longitud || "",
    inmueble.subtipo || "",
    inmueble.caracteristicas ? JSON.stringify(inmueble.caracteristicas) : ""
  ]);

  return {
    ok: true,
    id: nuevoId
  };

};

/**
 * Actualiza un inmueble. Los campos que no se envíen conservan su
 * valor actual, para poder guardar solo las coordenadas desde el
 * móvil sin mandar la ficha entera.
 */
InmueblesService.update = function (inmueble) {

  const sheet = InmueblesService._hoja();

  const values = sheet.getDataRange().getValues();

  for (let i = 1; i < values.length; i++) {

    if (Number(values[i][0]) === Number(inmueble.id)) {

      const fila = values[i];

      function valor(campo, indice) {
        return inmueble[campo] !== undefined ? inmueble[campo] : (fila[indice] !== undefined ? fila[indice] : "");
      }

      sheet.getRange(i + 1, 2, 1, InmueblesService.COLUMNAS - 1).setValues([[
        valor("personaId", 1),
        valor("direccion", 2),
        valor("ciudad", 3),
        valor("tipo", 4),
        valor("observaciones", 5),
        valor("latitud", 6),
        valor("longitud", 7),
        valor("subtipo", 8),
        inmueble.caracteristicas !== undefined
          ? JSON.stringify(inmueble.caracteristicas)
          : (fila[9] !== undefined ? fila[9] : "")
      ]]);

      return { ok: true };

    }

  }

  return { ok: false };

};

/**
 * Elimina un inmueble
 */
InmueblesService.remove = function (id) {

  const sheet = InmueblesService._hoja();

  const values = sheet.getDataRange().getValues();

  for (let i = 1; i < values.length; i++) {

    if (Number(values[i][0]) === Number(id)) {

      sheet.deleteRow(i + 1);

      return { ok: true };

    }

  }

  return { ok: false };

};
