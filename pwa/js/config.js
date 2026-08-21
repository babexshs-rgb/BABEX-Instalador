/*
==================================================
BABEX Instalador (PWA)
Archivo : config.js
==================================================
Único archivo que hay que tocar para conectar esta app con vuestro
Apps Script. Pon aquí la URL de PRODUCCIÓN (la que termina en /exec,
no la de /dev) — es la misma que usa el navegador para entrar a
BABEX desde el ordenador.

La encuentras en el editor de Apps Script: Implementar > Administrar
implementaciones > la que pone "Web app" > icono de copiar URL.
==================================================
*/

const BABEX_CONFIG = {

  // ⚠️ CAMBIA ESTO por la URL /exec real de tu proyecto.
  API_URL: "https://script.google.com/macros/s/PON_AQUI_TU_ID_DE_DESPLIEGUE/exec",

  VERSION: "1.0.0"

};
