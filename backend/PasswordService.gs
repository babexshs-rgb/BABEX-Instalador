/*
==================================================
BABEX
Archivo : PasswordService.gs
Versión : 0.1.0
==================================================
Hash de contraseñas con sal por usuario (SHA-256). Apps Script no trae
bcrypt/scrypt de serie; con una sal aleatoria por usuario y SHA-256 es
suficiente para una app interna de un equipo pequeño — lo importante es
no guardar nunca la contraseña en claro.
==================================================
*/
const PasswordService = {};

/**
 * Sal aleatoria única por usuario.
 */
PasswordService.generarSal = function () {
  return Utilities.getUuid();
};

/**
 * SHA-256(sal + contraseña), en hexadecimal.
 */
PasswordService.hash = function (password, sal) {

  const bytes = Utilities.computeDigest(
    Utilities.DigestAlgorithm.SHA_256,
    String(sal) + String(password),
    Utilities.Charset.UTF_8
  );

  return bytes.map(function (b) {
    const v = (b < 0 ? b + 256 : b).toString(16);
    return v.length === 1 ? "0" + v : v;
  }).join("");

};

/**
 * Compara una contraseña en claro contra el hash guardado.
 */
PasswordService.verificar = function (password, sal, hashGuardado) {

  if (!sal || !hashGuardado) return false;

  return PasswordService.hash(password, sal) === hashGuardado;

};
