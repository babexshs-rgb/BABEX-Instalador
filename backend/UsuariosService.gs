/*
==================================================
BABEX
Archivo : UsuariosService.gs
Versión : 0.4.0
Esquema: ID, EMAIL, NOMBRE, ROL, ACTIVO, SAL, HASH
ROL   : "Admin" | "Empleado"
ACTIVO: "SI" | "NO"
SAL/HASH: contraseña con sal (ver PasswordService), nunca en claro.

Login propio con email + contraseña. Se probaron antes dos vías
basadas en la identidad de Google (el control de acceso nativo de
Apps Script, y un cliente OAuth propio con flujo de redirección) y las
dos chocaron con límites reales del entorno: Session.getActiveUser()
solo identifica de forma fiable cuentas del mismo dominio de Google
Workspace que el propietario del script (no cuentas Gmail personales),
y el flujo OAuth por redirección topa con un origin_mismatch
persistente al lanzarse desde dentro del sandbox de Apps Script. Con
cuentas Gmail personales (nuestro caso), ninguna de las dos es viable.
==================================================
*/
const UsuariosService = {};

function _usuariosNormalizarEmail(email) {
  return String(email || "").trim().toLowerCase();
}

/**
 * Devuelve todos los usuarios autorizados de la app (sin sal/hash: eso
 * nunca debe salir hacia el cliente).
 */
UsuariosService.getAll = function () {
  const ss = SpreadsheetApp.openById(CONFIG.DATABASE.ID);
  const sheet = ss.getSheetByName(CONFIG.DATABASE.SHEETS.USUARIOS);
  const values = sheet.getDataRange().getValues();
  values.shift();
  return values
    .filter(function (row) { return row[1] !== "" && row[1] !== null; })
    .map(function (row) {
      return {
        id: Number(row[0]),
        email: String(row[1] || ""),
        nombre: String(row[2] || ""),
        rol: String(row[3] || "Empleado"),
        activo: String(row[4] || "SI")
      };
    });
};

/**
 * Busca un usuario por email (sin distinguir mayúsculas/minúsculas),
 * sin sal/hash — para pantallas y comprobaciones que no verifican
 * contraseña.
 */
UsuariosService.buscarPorEmail = function (email) {
  const objetivo = _usuariosNormalizarEmail(email);
  if (!objetivo) return null;
  const usuarios = UsuariosService.getAll();
  return usuarios.find(function (u) {
    return _usuariosNormalizarEmail(u.email) === objetivo;
  }) || null;
};

/**
 * Igual que buscarPorEmail, pero con sal/hash incluidos — solo para
 * uso interno de verificarCredenciales(), nunca debe llegar al
 * cliente.
 */
UsuariosService._filaCompletaPorEmail = function (email) {

  const objetivo = _usuariosNormalizarEmail(email);
  if (!objetivo) return null;

  const ss = SpreadsheetApp.openById(CONFIG.DATABASE.ID);
  const sheet = ss.getSheetByName(CONFIG.DATABASE.SHEETS.USUARIOS);
  const values = sheet.getDataRange().getValues();

  for (let i = 1; i < values.length; i++) {

    if (_usuariosNormalizarEmail(values[i][1]) === objetivo) {

      return {
        id: Number(values[i][0]),
        email: String(values[i][1] || ""),
        nombre: String(values[i][2] || ""),
        rol: String(values[i][3] || "Empleado"),
        activo: String(values[i][4] || "SI"),
        sal: values[i][5],
        hash: values[i][6]
      };

    }

  }

  return null;

};

/**
 * true si el email pertenece a un usuario activo con rol Admin.
 * Se usa como guarda de seguridad en el servidor antes de acciones
 * sensibles (borrar registros, tocar Administración) — no basta con
 * ocultar botones en el navegador.
 */
UsuariosService.esAdmin = function (email) {
  const usuario = UsuariosService.buscarPorEmail(email);
  return !!usuario && usuario.activo === "SI" && usuario.rol === "Admin";
};

/**
 * Verifica email + contraseña. Devuelve siempre el mismo mensaje
 * genérico si el email no existe o la contraseña no coincide, para no
 * revelar qué emails están dados de alta.
 */
UsuariosService.verificarCredenciales = function (email, password) {

  const emailLimpio = _usuariosNormalizarEmail(email);

  if (!emailLimpio || !password) {
    return { ok: false, error: "Introduce tu email y tu contraseña." };
  }

  const usuario = UsuariosService._filaCompletaPorEmail(emailLimpio);

  if (!usuario) {
    return { ok: false, error: "Email o contraseña incorrectos." };
  }

  if (usuario.activo !== "SI") {
    return { ok: false, error: "Tu acceso a BABEX está desactivado. Contacta con el administrador." };
  }

  if (!PasswordService.verificar(password, usuario.sal, usuario.hash)) {
    return { ok: false, error: "Email o contraseña incorrectos." };
  }

  return {
    ok: true,
    email: usuario.email,
    nombre: usuario.nombre || usuario.email,
    rol: usuario.rol
  };

};

/**
 * Da de alta un nuevo usuario autorizado a partir de una contraseña en
 * claro (la escribe un Admin desde Administración): genera sal y hash
 * y delega en _insertConHash.
 */
UsuariosService.insert = function (usuario) {

  const password = usuario.password || "";

  if (!password || String(password).length < 6) {
    return { ok: false, error: "La contraseña debe tener al menos 6 caracteres." };
  }

  const sal = PasswordService.generarSal();
  const hash = PasswordService.hash(password, sal);

  return UsuariosService._insertConHash({
    email: usuario.email,
    nombre: usuario.nombre,
    rol: usuario.rol,
    activo: usuario.activo,
    sal: sal,
    hash: hash
  });

};

/**
 * Inserta un usuario con sal/hash ya calculados de antemano — lo usa
 * insert() de arriba, y también SolicitudesService.aprobar() para dar
 * de alta a alguien reutilizando la sal/hash que ya generó al
 * registrarse, sin tener que pedirle la contraseña otra vez.
 */
UsuariosService._insertConHash = function (usuario) {

  const emailNuevo = _usuariosNormalizarEmail(usuario.email);

  if (!emailNuevo) {
    return { ok: false, error: "Introduce un email." };
  }

  if (UsuariosService.buscarPorEmail(emailNuevo)) {
    return { ok: false, error: "Ya existe un usuario con ese email." };
  }

  const ss = SpreadsheetApp.openById(CONFIG.DATABASE.ID);
  const sheet = ss.getSheetByName(CONFIG.DATABASE.SHEETS.USUARIOS);
  const lastRow = sheet.getLastRow();
  let nuevoId = 1;

  if (lastRow > 1) {
    nuevoId = Number(sheet.getRange(lastRow, 1).getValue()) + 1;
  }

  sheet.appendRow([
    nuevoId,
    emailNuevo,
    usuario.nombre || "",
    usuario.rol || "Empleado",
    usuario.activo || "SI",
    usuario.sal,
    usuario.hash
  ]);

  return { ok: true, id: nuevoId };

};

/**
 * Actualiza nombre/rol/activo/contraseña de un usuario existente. Los
 * campos que no se envíen mantienen su valor actual (para poder, por
 * ejemplo, cambiar solo el rol o solo restablecer la contraseña sin
 * tener que volver a mandar el resto). Si se manda "password", se
 * genera una sal y un hash nuevos.
 */
UsuariosService.update = function (usuario) {

  const ss = SpreadsheetApp.openById(CONFIG.DATABASE.ID);
  const sheet = ss.getSheetByName(CONFIG.DATABASE.SHEETS.USUARIOS);
  const values = sheet.getDataRange().getValues();

  for (let i = 1; i < values.length; i++) {
    if (Number(values[i][0]) === Number(usuario.id)) {

      const actual = {
        email: values[i][1],
        nombre: values[i][2],
        rol: values[i][3],
        activo: values[i][4],
        sal: values[i][5],
        hash: values[i][6]
      };

      let sal = actual.sal;
      let hash = actual.hash;

      if (usuario.password) {

        if (String(usuario.password).length < 6) {
          return { ok: false, error: "La contraseña debe tener al menos 6 caracteres." };
        }

        sal = PasswordService.generarSal();
        hash = PasswordService.hash(usuario.password, sal);

      }

      sheet.getRange(i + 1, 2, 1, 6).setValues([[
        usuario.email !== undefined ? _usuariosNormalizarEmail(usuario.email) : actual.email,
        usuario.nombre !== undefined ? usuario.nombre : actual.nombre,
        usuario.rol !== undefined ? usuario.rol : actual.rol,
        usuario.activo !== undefined ? usuario.activo : actual.activo,
        sal,
        hash
      ]]);

      return { ok: true };

    }
  }

  return { ok: false, error: "Usuario no encontrado." };

};

/**
 * Elimina un usuario autorizado (revoca su acceso a la app).
 */
UsuariosService.remove = function (id) {
  const ss = SpreadsheetApp.openById(CONFIG.DATABASE.ID);
  const sheet = ss.getSheetByName(CONFIG.DATABASE.SHEETS.USUARIOS);
  const values = sheet.getDataRange().getValues();

  for (let i = 1; i < values.length; i++) {
    if (Number(values[i][0]) === Number(id)) {
      sheet.deleteRow(i + 1);
      return { ok: true };
    }
  }

  return { ok: false };
};
