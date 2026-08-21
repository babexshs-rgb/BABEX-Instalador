/*
==================================================
BABEX
Archivo : CatalogoService.gs
Versión : 0.1.0
Esquema: ID, REFERENCIA, NOMBRE, MARCA, REF_FABRICANTE, TIPO,
         UNIDAD, COSTE, PVP, ACTIVO, OBSERVACIONES
==================================================
Catálogo de productos y servicios. Es la base sobre la que después se
montarán los productos por estancia y el motor de presupuestos, por
eso guarda precio en vez de texto libre.

TODOS LOS PRECIOS VAN SIN IVA.

COSTE es el precio de compra: se guarda para poder calcular márgenes
reales, pero no se enseña al cliente en el presupuesto. PVP es lo que
se factura.

La hoja se crea sola la primera vez (ver _hoja).
==================================================
*/
const CatalogoService = {};

CatalogoService.CABECERAS = [
  "ID", "REFERENCIA", "NOMBRE", "MARCA", "REF_FABRICANTE", "TIPO",
  "FAMILIA", "UNIDAD", "COSTE", "PVP", "ACTIVO", "OBSERVACIONES"
];

CatalogoService._hoja = function () {

  const ss = SpreadsheetApp.openById(CONFIG.DATABASE.ID);
  let sheet = ss.getSheetByName(CONFIG.DATABASE.SHEETS.CATALOGO);

  if (!sheet) {

    sheet = ss.insertSheet(CONFIG.DATABASE.SHEETS.CATALOGO);
    sheet.appendRow(CatalogoService.CABECERAS);
    sheet.setFrozenRows(1);

  }

  return sheet;

};

/**
 * Convierte a número aceptando tanto "12,50" como "12.50", que es
 * como suele quedar al escribirlo a mano en la hoja.
 */
function _catalogoNumero(valor) {

  if (valor === "" || valor === null || valor === undefined) return 0;

  if (typeof valor === "number") return valor;

  const limpio = String(valor).replace(/\s/g, "").replace(",", ".");
  const numero = parseFloat(limpio);

  return isNaN(numero) ? 0 : numero;

}

CatalogoService.getAll = function () {

  const sheet = CatalogoService._hoja();
  const values = sheet.getDataRange().getValues();

  values.shift();

  return values
    .filter(function (row) { return row[0] !== "" && row[0] !== null; })
    .map(function (row) {
      return {
        id: Number(row[0]),
        referencia: String(row[1] || ""),
        nombre: String(row[2] || ""),
        marca: String(row[3] || ""),
        refFabricante: String(row[4] || ""),
        tipo: String(row[5] || "Hardware"),
        familia: String(row[6] || ""),
        unidad: String(row[7] || "Unidad"),
        coste: _catalogoNumero(row[8]),
        pvp: _catalogoNumero(row[9]),
        activo: String(row[10] || "SI"),
        observaciones: String(row[11] || "")
      };
    });

};

/**
 * Solo los productos dados de alta, para los desplegables donde se
 * elige qué se instala.
 */
CatalogoService.getActivos = function () {

  return CatalogoService.getAll().filter(function (p) { return p.activo === "SI"; });

};

/**
 * Comprueba que la referencia interna no esté repetida: es la que
 * usaréis para buscar un producto, así que debe ser única.
 */
CatalogoService._referenciaLibre = function (referencia, idQueSeEdita) {

  const ref = String(referencia || "").trim().toLowerCase();

  if (!ref) return true;

  return !CatalogoService.getAll().some(function (p) {
    return String(p.referencia).trim().toLowerCase() === ref &&
           Number(p.id) !== Number(idQueSeEdita || 0);
  });

};

CatalogoService.insert = function (producto) {

  if (!producto || !String(producto.nombre || "").trim()) {
    return { ok: false, error: "El producto necesita un nombre." };
  }

  if (!CatalogoService._referenciaLibre(producto.referencia)) {
    return { ok: false, error: 'Ya existe un producto con la referencia "' + producto.referencia + '".' };
  }

  const sheet = CatalogoService._hoja();
  const lastRow = sheet.getLastRow();
  let nuevoId = 1;

  if (lastRow > 1) {
    nuevoId = Number(sheet.getRange(lastRow, 1).getValue()) + 1;
  }

  sheet.appendRow([
    nuevoId,
    producto.referencia || "",
    producto.nombre || "",
    producto.marca || "",
    producto.refFabricante || "",
    producto.tipo || "Hardware",
    producto.familia || "",
    producto.unidad || "Unidad",
    _catalogoNumero(producto.coste),
    _catalogoNumero(producto.pvp),
    producto.activo || "SI",
    producto.observaciones || ""
  ]);

  return { ok: true, id: nuevoId };

};

/**
 * Actualiza un producto. Los campos que no se envíen conservan su
 * valor, para poder cambiar solo el precio o solo el estado.
 */
CatalogoService.update = function (producto) {

  if (producto.referencia !== undefined && !CatalogoService._referenciaLibre(producto.referencia, producto.id)) {
    return { ok: false, error: 'Ya existe otro producto con la referencia "' + producto.referencia + '".' };
  }

  const sheet = CatalogoService._hoja();
  const values = sheet.getDataRange().getValues();

  for (let i = 1; i < values.length; i++) {

    if (Number(values[i][0]) === Number(producto.id)) {

      const fila = values[i];

      function valor(campo, indice) {
        return producto[campo] !== undefined ? producto[campo] : fila[indice];
      }

      sheet.getRange(i + 1, 2, 1, CatalogoService.CABECERAS.length - 1).setValues([[
        valor("referencia", 1),
        valor("nombre", 2),
        valor("marca", 3),
        valor("refFabricante", 4),
        valor("tipo", 5),
        valor("familia", 6),
        valor("unidad", 7),
        _catalogoNumero(valor("coste", 8)),
        _catalogoNumero(valor("pvp", 9)),
        valor("activo", 10),
        valor("observaciones", 11)
      ]]);

      return { ok: true };

    }

  }

  return { ok: false, error: "Producto no encontrado." };

};

/**
 * Elimina un producto del catálogo.
 *
 * Ojo: si el producto ya se ha usado en visitas o presupuestos, es
 * preferible marcarlo como inactivo en vez de borrarlo, para no dejar
 * huérfanos los registros históricos.
 */
CatalogoService.remove = function (id) {

  const sheet = CatalogoService._hoja();
  const values = sheet.getDataRange().getValues();

  for (let i = 1; i < values.length; i++) {

    if (Number(values[i][0]) === Number(id)) {

      sheet.deleteRow(i + 1);

      return { ok: true };

    }

  }

  return { ok: false, error: "Producto no encontrado." };

};
