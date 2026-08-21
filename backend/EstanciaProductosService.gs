/*
==================================================
BABEX
Archivo : EstanciaProductosService.gs
Versión : 0.1.0
Esquema: ID, ESTANCIA_ID, PRODUCTO_ID, CANTIDAD, ESTADO,
         OBSERVACIONES, CITA_ID, FECHA
==================================================
Qué producto va (o ha ido) en cada estancia.

ESTADO marca en qué punto del ciclo está cada línea:

  Propuesto  → decidido en el levantamiento, aún sin instalar.
               Es lo que alimentará el presupuesto.
  Instalado  → puesto y funcionando.
  Retirado   → se quitó en un mantenimiento posterior.

CITA_ID guarda en qué visita se registró la línea, para poder
reconstruir después qué se propuso el primer día y qué se acabó
instalando.

No se guarda el precio en la línea: se lee del catálogo en el momento
de presupuestar. Si más adelante hace falta congelar el precio de una
oferta concreta, se añadirá al presupuesto, no aquí.

La hoja se crea sola la primera vez.
==================================================
*/
const EstanciaProductosService = {};

EstanciaProductosService.CABECERAS = [
  "ID", "ESTANCIA_ID", "PRODUCTO_ID", "CANTIDAD", "ESTADO",
  "OBSERVACIONES", "CITA_ID", "FECHA"
];

EstanciaProductosService.ESTADOS = ["Propuesto", "Instalado", "Retirado"];

EstanciaProductosService._hoja = function () {

  const ss = SpreadsheetApp.openById(CONFIG.DATABASE.ID);
  let sheet = ss.getSheetByName(CONFIG.DATABASE.SHEETS.ESTANCIA_PRODUCTOS);

  if (!sheet) {

    sheet = ss.insertSheet(CONFIG.DATABASE.SHEETS.ESTANCIA_PRODUCTOS);
    sheet.appendRow(EstanciaProductosService.CABECERAS);
    sheet.setFrozenRows(1);

  }

  return sheet;

};

EstanciaProductosService.getAll = function () {

  const sheet = EstanciaProductosService._hoja();
  const values = sheet.getDataRange().getValues();

  values.shift();

  return values
    .filter(function (row) { return row[0] !== "" && row[0] !== null; })
    .map(function (row) {
      return {
        id: Number(row[0]),
        estanciaId: row[1] !== "" && row[1] !== null ? Number(row[1]) : null,
        productoId: row[2] !== "" && row[2] !== null ? Number(row[2]) : null,
        cantidad: Number(row[3]) || 0,
        estado: String(row[4] || "Propuesto"),
        observaciones: String(row[5] || ""),
        citaId: row[6] !== "" && row[6] !== null ? Number(row[6]) : null,
        fecha: row[7] ? new Date(row[7]).toISOString() : ""
      };
    });

};

/**
 * Líneas de un inmueble, ya cruzadas con el nombre del producto y el
 * de la estancia. Es lo que consume la app del instalador para
 * enseñar "qué hay en esta casa" sin tener que hacer tres llamadas.
 *
 * No incluye precios: en el móvil no hacen falta y así no se exponen.
 */
EstanciaProductosService.getPorInmueble = function (inmuebleId) {

  const estancias = EstanciasService.getPorInmueble(inmuebleId);

  if (!estancias.length) return [];

  const idsEstancia = estancias.map(function (e) { return Number(e.id); });
  const catalogo = CatalogoService.getAll();

  return EstanciaProductosService.getAll()
    .filter(function (l) { return idsEstancia.indexOf(Number(l.estanciaId)) !== -1; })
    .map(function (l) {

      const estancia = estancias.find(function (e) { return Number(e.id) === Number(l.estanciaId); });
      const producto = catalogo.find(function (p) { return Number(p.id) === Number(l.productoId); });

      l.estanciaNombre = estancia ? estancia.nombre : "";
      l.productoNombre = producto ? producto.nombre : "(producto no encontrado)";
      l.productoFamilia = producto ? producto.familia : "";

      return l;

    });

};

EstanciaProductosService.insert = function (linea) {

  if (!linea || !linea.estanciaId) {
    return { ok: false, error: "Falta indicar la estancia." };
  }

  if (!linea.productoId) {
    return { ok: false, error: "Falta indicar el producto." };
  }

  const cantidad = Number(linea.cantidad) || 0;

  if (cantidad <= 0) {
    return { ok: false, error: "La cantidad tiene que ser mayor que cero." };
  }

  const sheet = EstanciaProductosService._hoja();
  const lastRow = sheet.getLastRow();
  let nuevoId = 1;

  if (lastRow > 1) {
    nuevoId = Number(sheet.getRange(lastRow, 1).getValue()) + 1;
  }

  sheet.appendRow([
    nuevoId,
    linea.estanciaId,
    linea.productoId,
    cantidad,
    linea.estado || "Propuesto",
    linea.observaciones || "",
    linea.citaId || "",
    new Date()
  ]);

  return { ok: true, id: nuevoId };

};

/**
 * Actualiza una línea. Se usa sobre todo para pasar de "Propuesto" a
 * "Instalado" el día de la instalación, o para corregir la cantidad.
 */
EstanciaProductosService.update = function (linea) {

  const sheet = EstanciaProductosService._hoja();
  const values = sheet.getDataRange().getValues();

  for (let i = 1; i < values.length; i++) {

    if (Number(values[i][0]) === Number(linea.id)) {

      const fila = values[i];

      function valor(campo, indice) {
        return linea[campo] !== undefined ? linea[campo] : fila[indice];
      }

      sheet.getRange(i + 1, 2, 1, 6).setValues([[
        valor("estanciaId", 1),
        valor("productoId", 2),
        valor("cantidad", 3),
        valor("estado", 4),
        valor("observaciones", 5),
        valor("citaId", 6)
      ]]);

      return { ok: true };

    }

  }

  return { ok: false, error: "Línea no encontrada." };

};

EstanciaProductosService.remove = function (id) {

  const sheet = EstanciaProductosService._hoja();
  const values = sheet.getDataRange().getValues();

  for (let i = 1; i < values.length; i++) {

    if (Number(values[i][0]) === Number(id)) {

      sheet.deleteRow(i + 1);

      return { ok: true };

    }

  }

  return { ok: false, error: "Línea no encontrada." };

};
