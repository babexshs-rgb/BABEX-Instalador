/*
==================================================
BABEX
Archivo : SesionesService.gs
Versión : 1.0.0

SESIONES
  ID, USUARIO_ID, TOKEN, CREADA, ULTIMO_USO, DISPOSITIVO
==================================================
Tokens de acceso para la PWA del instalador.

Por qué hace falta esto y el resto de la app no lo tiene: el panel de
oficina y la app de campo de dentro de la web se sirven desde el
propio Apps Script, así que solo puede llamarlos quien ya tiene la
página cargada — el email que viaja en cada llamada no es una prueba
de identidad fuerte, pero el canal ya está acotado.

La PWA es distinta: vive en otro dominio y su único punto de contacto
con BABEX es esta API pública por HTTP. Cualquiera que sepa la URL
puede llamarla. Por eso aquí sí hace falta un token: se emite uno al
iniciar sesión, se guarda en el móvil y viaja en cada petición en vez
del email suelto.

El token no caduca por tiempo (un instalador puede estar días sin
visitas y no tiene sentido pedirle que vuelva a entrar la contraseña
en la furgoneta), pero se puede revocar a mano desactivando al
usuario, cerrando sesión desde la propia app, o borrando la fila.
==================================================
*/
const SesionesService = {};

SesionesService.CABECERAS = ["ID", "USUARIO_ID", "TOKEN", "CREADA", "ULTIMO_USO", "DISPOSITIVO"];

SesionesService._hoja = function () {

  const ss = SpreadsheetApp.openById(CONFIG.DATABASE.ID);
  let sheet = ss.getSheetByName(CONFIG.DATABASE.SHEETS.SESIONES);

  if (!sheet) {
    sheet = ss.insertSheet(CONFIG.DATABASE.SHEETS.SESIONES);
    sheet.appendRow(SesionesService.CABECERAS);
    sheet.setFrozenRows(1);
  }

  return sheet;

};

/**
 * Crea un token nuevo para el usuario y lo guarda. Un mismo usuario
 * puede tener varios tokens a la vez (por ejemplo, si reinstala la
 * PWA en otro móvil): no se invalidan los anteriores al crear uno,
 * solo al cerrar sesión explícitamente o al desactivar el usuario.
 */
SesionesService.crear = function (usuarioId, dispositivo) {

  const sheet = SesionesService._hoja();
  const lastRow = sheet.getLastRow();

  let nuevoId = 1;

  if (lastRow > 1) {
    nuevoId = Number(sheet.getRange(lastRow, 1).getValue()) + 1;
  }

  const token = Utilities.getUuid();
  const ahora = new Date();

  sheet.appendRow([nuevoId, usuarioId, token, ahora, ahora, dispositivo || ""]);

  return token;

};

/**
 * Resuelve un token al usuario Instalador activo al que pertenece, o
 * null si el token no existe, el usuario ya no existe, está
 * desactivado, o no tiene rol Instalador. Actualiza la marca de
 * último uso de paso: sirve para ver desde Administración cuándo se
 * usó la app por última vez.
 */
SesionesService.usuarioDeToken = function (token) {

  if (!token) return null;

  const sheet = SesionesService._hoja();
  const values = sheet.getDataRange().getValues();

  for (let i = 1; i < values.length; i++) {

    if (String(values[i][2]) === String(token)) {

      const usuarioId = Number(values[i][1]);

      sheet.getRange(i + 1, 5).setValue(new Date());

      const usuario = UsuariosService.getAll().find(function (u) {
        return Number(u.id) === usuarioId;
      });

      if (!usuario || usuario.activo !== "SI" || usuario.rol !== "Instalador") {
        return null;
      }

      return usuario;

    }

  }

  return null;

};

/**
 * Cierra sesión: borra el token para que deje de servir.
 */
SesionesService.cerrar = function (token) {

  const sheet = SesionesService._hoja();
  const values = sheet.getDataRange().getValues();

  for (let i = 1; i < values.length; i++) {

    if (String(values[i][2]) === String(token)) {
      sheet.deleteRow(i + 1);
      return { ok: true };
    }

  }

  return { ok: true }; // ya no estaba: el resultado que importa es el mismo

};
