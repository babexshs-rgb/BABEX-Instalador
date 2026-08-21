/*
==================================================
BABEX
Archivo : EmpresasService.gs
Versión : 0.2.0
Esquema: ID, NOMBRE, CIF, TELEFONO, EMAIL, WEB, TIPO
==================================================
*/
const EmpresasService = {};
/**
 * Devuelve todas las empresas
 */
EmpresasService.getAll = function () {
  const ss = SpreadsheetApp.openById(CONFIG.DATABASE.ID);
  const sheet = ss.getSheetByName(CONFIG.DATABASE.SHEETS.EMPRESAS);
  const values = sheet.getDataRange().getValues();
  // Eliminar cabecera
  values.shift();
  const empresas = values.map(function (row) {
    return {
      id: Number(row[0]),
      nombre: String(row[1] || ""),
      cif: String(row[2] || ""),
      telefono: String(row[3] || ""),
      email: String(row[4] || ""),
      web: String(row[5] || ""),
      tipo: String(row[6] || "Empresa")
    };
  });
  Logger.log(JSON.stringify(empresas));
  return empresas;
};
/**
 * Inserta una nueva empresa
 */
EmpresasService.insert = function (empresa) {
  const ss = SpreadsheetApp.openById(CONFIG.DATABASE.ID);
  const sheet = ss.getSheetByName(CONFIG.DATABASE.SHEETS.EMPRESAS);
  const lastRow = sheet.getLastRow();
  let nuevoId = 1;
  if (lastRow > 1) {
    nuevoId = Number(sheet.getRange(lastRow, 1).getValue()) + 1;
  }
  sheet.appendRow([
    nuevoId,
    empresa.nombre || "",
    empresa.cif || "",
    empresa.telefono || "",
    empresa.email || "",
    empresa.web || "",
    empresa.tipo || "Empresa"
  ]);
  return {
    ok: true,
    id: nuevoId
  };
};
/**
 * Actualiza una empresa
 */
EmpresasService.update = function (empresa) {
  const ss = SpreadsheetApp.openById(CONFIG.DATABASE.ID);
  const sheet = ss.getSheetByName(CONFIG.DATABASE.SHEETS.EMPRESAS);
  const values = sheet.getDataRange().getValues();
  for (let i = 1; i < values.length; i++) {
    if (Number(values[i][0]) === Number(empresa.id)) {
      sheet.getRange(i + 1, 2, 1, 6).setValues([[
        empresa.nombre,
        empresa.cif,
        empresa.telefono,
        empresa.email,
        empresa.web,
        empresa.tipo || "Empresa"
      ]]);
      return { ok: true };
    }
  }
  return { ok: false };
};
/**
 * Elimina una empresa
 */
EmpresasService.remove = function (id) {
  const ss = SpreadsheetApp.openById(CONFIG.DATABASE.ID);
  const sheet = ss.getSheetByName(CONFIG.DATABASE.SHEETS.EMPRESAS);
  const values = sheet.getDataRange().getValues();
  for (let i = 1; i < values.length; i++) {
    if (Number(values[i][0]) === Number(id)) {
      sheet.deleteRow(i + 1);
      return { ok: true };
    }
  }
  return { ok: false };
};
