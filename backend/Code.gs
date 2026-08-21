/**
 * ==========================================================
 * BABEX Framework
 * Archivo: Code.gs
 * Versión: 1.4.0
 * ==========================================================
 * Login: email + contraseña propios (ver UsuariosService), sin
 * depender de la identidad de Google. Se probaron antes dos vías
 * basadas en Google (acceso nativo de Apps Script, y un cliente OAuth
 * propio con flujo de redirección) y las dos toparon con límites
 * reales del entorno para cuentas Gmail personales — ver el
 * encabezado de UsuariosService.gs para el detalle. Por eso doGet ya
 * no necesita procesar nada especial: el login ocurre después, vía
 * llamadas normales del cliente (apiLogin / apiRegistrar).
 * ==========================================================
 */

function doGet(e) {

  // Con ?accion=... se trata como llamada a la API pública de la PWA
  // (útil sobre todo para el botón "Probar conexión": un GET es más
  // fácil de probar a mano, pegando la URL en el navegador, que un
  // POST). El resto de acciones reales de la PWA van por doPost.
  if (e && e.parameter && e.parameter.accion) {
    return _apiExternaManejar(e);
  }

  const template = HtmlService.createTemplateFromFile('Index');

  return template
    .evaluate()
    .setTitle('BABEX')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);

}

/**
 * Toda la API pública de la PWA del instalador entra por aquí. Ver
 * ApiExterna.gs para el porqué de este diseño (token en vez de
 * sesión, text/plain para evitar el preflight de CORS, etc.).
 */
function doPost(e) {

  return _apiExternaManejar(e);

}

/**
 * Permite incluir archivos HTML dentro de otros.
 */
function include(nombreArchivo) {
  return HtmlService
    .createHtmlOutputFromFile(nombreArchivo)
    .getContent();
}
function testPersonas(){

  Logger.log(PersonasService.getAll());

}
