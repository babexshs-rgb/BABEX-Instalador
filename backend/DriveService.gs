/*
==================================================
BABEX
Archivo : DriveService.gs
Versión : 0.1.0
Gestiona el almacenamiento de documentos en Drive
==================================================
*/
const DriveService = {};

DriveService.CARPETA_RAIZ = "BABEX_Documentos";

/**
 * Devuelve la carpeta raíz de documentos de BABEX, creándola
 * en el Drive del usuario si todavía no existe.
 */
DriveService.getCarpetaRaiz = function () {

  const carpetas = DriveApp.getFoldersByName(DriveService.CARPETA_RAIZ);

  if (carpetas.hasNext()) {
    return carpetas.next();
  }

  return DriveApp.createFolder(DriveService.CARPETA_RAIZ);

};

/**
 * Recorre (creando lo que haga falta) una ruta de subcarpetas dentro
 * de la carpeta raíz de documentos. Por ejemplo, ["Juan Pérez","Foto"]
 * deja/crea BABEX_Documentos/Juan Pérez/Foto y la devuelve.
 * Los segmentos vacíos o nulos se ignoran.
 */
DriveService.getCarpetaPorRuta = function (segmentos) {

  let carpeta = DriveService.getCarpetaRaiz();

  (segmentos || []).forEach(function (nombre) {

    if (!nombre) return;

    const encontradas = carpeta.getFoldersByName(nombre);

    carpeta = encontradas.hasNext() ? encontradas.next() : carpeta.createFolder(nombre);

  });

  return carpeta;

};

/**
 * Sube un archivo (en base64) a Drive, dentro de la ruta de subcarpetas
 * indicada en segmentosCarpeta (por ejemplo, [nombreCliente, tipoDocumento]).
 * Devuelve el id y la url del archivo creado en Drive.
 */
DriveService.subirArchivo = function (nombre, base64, mimeType, segmentosCarpeta) {

  const carpeta = DriveService.getCarpetaPorRuta(segmentosCarpeta);
  const bytes = Utilities.base64Decode(base64);
  const blob = Utilities.newBlob(bytes, mimeType || "application/octet-stream", nombre);
  const archivo = carpeta.createFile(blob);

  return {
    id: archivo.getId(),
    url: archivo.getUrl()
  };

};

/**
 * Devuelve la miniatura de un archivo de Drive como data URI.
 *
 * Se sirve desde el servidor en vez de enlazar directamente a Drive
 * porque los archivos son privados: un enlace de imagen solo se vería
 * si quien mira la página tiene permiso en ese Drive, y los usuarios
 * de BABEX no lo tienen. El script sí, porque se ejecuta como el
 * propietario.
 *
 * Devuelve null si el archivo no existe o no tiene miniatura (Drive
 * no la genera para todos los formatos).
 */
DriveService.miniatura = function (fileId) {

  if (!fileId) return null;

  try {

    const archivo = DriveApp.getFileById(fileId);
    const miniatura = archivo.getThumbnail();

    if (!miniatura) return null;

    return "data:" + miniatura.getContentType() + ";base64," +
           Utilities.base64Encode(miniatura.getBytes());

  } catch (e) {

    return null;

  }

};

/**
 * Envía un archivo de Drive a la papelera. No lanza error si
 * el archivo ya no existe (por ejemplo, si se borró a mano).
 */
DriveService.eliminarArchivo = function (fileId) {

  try {

    const archivo = DriveApp.getFileById(fileId);
    archivo.setTrashed(true);
    return true;

  } catch (e) {

    Logger.log(e);
    return false;

  }

};
