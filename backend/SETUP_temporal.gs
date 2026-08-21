/*
==================================================
BABEX — SOLO PARA EL ARRANQUE INICIAL
==================================================
Este archivo es temporal. Sirve para poner tu contraseña la primera
vez (tu fila de Admin en USUARIOS todavía no tiene ninguna, y hasta
que no la tenga no puedes entrar por la app para ponértela tú mismo).

Cómo usarlo:
1. Cambia "CAMBIA_ESTO_123" por la contraseña que quieras usar
   (mínimo 6 caracteres).
2. Arriba, en el desplegable de funciones del editor, selecciona
   "establecerMiPasswordInicial" y pulsa "Ejecutar".
3. Mira el registro (Ver > Registros, o Ctrl+Enter) para confirmar que
   dice "Contraseña establecida".
4. Borra este archivo entero (clic derecho sobre él en el árbol de
   archivos > Eliminar) — ya no hace falta, y no debe quedar ninguna
   contraseña en texto plano dando vueltas por el código.
==================================================
*/

function establecerMiPasswordInicial() {

  const emailAdmin = "babex.shs@gmail.com";
  const passwordNueva = "CAMBIA_ESTO_123";

  const sal = PasswordService.generarSal();
  const hash = PasswordService.hash(passwordNueva, sal);

  const ss = SpreadsheetApp.openById(CONFIG.DATABASE.ID);
  const sheet = ss.getSheetByName(CONFIG.DATABASE.SHEETS.USUARIOS);
  const values = sheet.getDataRange().getValues();

  for (let i = 1; i < values.length; i++) {

    if (String(values[i][1]).toLowerCase().trim() === emailAdmin) {

      sheet.getRange(i + 1, 6, 1, 2).setValues([[sal, hash]]);
      Logger.log("Contraseña establecida para " + values[i][1]);
      return;

    }

  }

  Logger.log("No se ha encontrado " + emailAdmin + " en la hoja USUARIOS. Compruébalo antes de reintentar.");

}
