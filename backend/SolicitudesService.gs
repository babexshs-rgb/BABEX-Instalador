/*
==================================================
BABEX
Archivo : SolicitudesService.gs
Versión : 0.3.0
Esquema: ID, EMAIL, NOMBRE, FECHA, ESTADO, SAL, HASH, TOKEN
ESTADO : "SinConfirmar" | "Pendiente" | "Aprobada" | "Rechazada"
TOKEN  : código de confirmación que se manda por email; se usa para
         pasar de "SinConfirmar" a "Pendiente" (ver confirmarPorToken).
==================================================
Registro de acceso propio: alguien sin cuenta entra en la pantalla de
"Regístrate", elige email + nombre + contraseña, y eso genera una
solicitud pendiente aquí (con su contraseña ya cifrada, igual que un
usuario normal) y un aviso por email a los administradores activos.
Cuando el Admin la aprueba desde Administración, se da de alta en
USUARIOS reutilizando esa misma sal/hash, así la persona entra ya con
la contraseña que ella misma eligió, sin tener que comunicársela por
otro lado.
==================================================
*/
const SolicitudesService = {};

/**
 * Devuelve todas las solicitudes registradas (sin sal/hash: la usan
 * internamente aprobar() y _filaCompletaPorId(), pero no debe salir
 * hacia el cliente el resto de veces que se usa este listado).
 */
SolicitudesService.getAll = function () {
  const ss = SpreadsheetApp.openById(CONFIG.DATABASE.ID);
  const sheet = ss.getSheetByName(CONFIG.DATABASE.SHEETS.SOLICITUDES);
  const values = sheet.getDataRange().getValues();
  values.shift();
  return values
    .filter(function (row) { return row[1] !== "" && row[1] !== null; })
    .map(function (row) {
      return {
        id: Number(row[0]),
        email: String(row[1] || ""),
        nombre: String(row[2] || ""),
        fecha: row[3] ? new Date(row[3]).toISOString() : "",
        estado: String(row[4] || "Pendiente")
      };
    });
};

/**
 * Solo las solicitudes todavía sin resolver, para pintarlas en
 * Administración.
 */
SolicitudesService.getPendientes = function () {
  return SolicitudesService.getAll().filter(function (s) { return s.estado === "Pendiente"; });
};

SolicitudesService.buscarPendientePorEmail = function (email) {
  const objetivo = _usuariosNormalizarEmail(email);
  return SolicitudesService.getAll().find(function (s) {
    return s.estado === "Pendiente" && _usuariosNormalizarEmail(s.email) === objetivo;
  }) || null;
};

/**
 * Igual que buscarPendientePorEmail, pero cuenta también las
 * solicitudes que están esperando a que el propio usuario confirme su
 * email (estado "SinConfirmar"), no solo las ya confirmadas. Se usa
 * en crear() para no dejar pedir dos veces el mismo email mientras
 * hay una solicitud en marcha, esté confirmada o no.
 */
SolicitudesService.buscarActivaPorEmail = function (email) {
  const objetivo = _usuariosNormalizarEmail(email);
  return SolicitudesService.getAll().find(function (s) {
    return (s.estado === "Pendiente" || s.estado === "SinConfirmar") && _usuariosNormalizarEmail(s.email) === objetivo;
  }) || null;
};

/**
 * Registra una solicitud de acceso nueva a partir de lo que rellena el
 * propio usuario en la pantalla de "Regístrate", y avisa por email a
 * los administradores activos.
 */
SolicitudesService.crear = function (email, nombre, password) {

  const emailLimpio = _usuariosNormalizarEmail(email);

  if (!emailLimpio) {
    return { ok: false, error: "Introduce un email." };
  }

  if (UsuariosService.buscarPorEmail(emailLimpio)) {
    return { ok: false, error: "Ya existe una cuenta con ese email. Prueba a iniciar sesión." };
  }

  if (SolicitudesService.buscarActivaPorEmail(emailLimpio)) {
    return { ok: false, error: "Ya hay una solicitud en marcha para ese email. Revisa tu correo para confirmarla, o espera a que el administrador la revise si ya la confirmaste." };
  }

  if (!password || String(password).length < 6) {
    return { ok: false, error: "La contraseña debe tener al menos 6 caracteres." };
  }

  const sal = PasswordService.generarSal();
  const hash = PasswordService.hash(password, sal);
  const token = Utilities.getUuid();

  const ss = SpreadsheetApp.openById(CONFIG.DATABASE.ID);
  const sheet = ss.getSheetByName(CONFIG.DATABASE.SHEETS.SOLICITUDES);
  const lastRow = sheet.getLastRow();
  let nuevoId = 1;

  if (lastRow > 1) {
    nuevoId = Number(sheet.getRange(lastRow, 1).getValue()) + 1;
  }

  // Columna 8 (TOKEN): mientras no se confirme, la solicitud se queda
  // en "SinConfirmar" y NO es visible para el administrador (getPendientes
  // solo devuelve las que están en "Pendiente"). Se vuelve "Pendiente",
  // y ahí sí se avisa al administrador, cuando el propio solicitante
  // confirma haciendo clic en el enlace de su email (ver confirmarPorToken).
  sheet.appendRow([nuevoId, emailLimpio, nombre || "", new Date(), "SinConfirmar", sal, hash, token]);

  SolicitudesService._enviarConfirmacion(emailLimpio, nombre, token);

  return { ok: true };

};

/**
 * Envía al solicitante el email con el enlace para confirmar su
 * solicitud de acceso. Hasta que no confirme, el administrador no se
 * entera de que existe. Igual que el resto de envíos de email, un
 * fallo aquí no debe romper el registro de la persona.
 */
SolicitudesService._enviarConfirmacion = function (email, nombre, token) {

  try {

    const url = ScriptApp.getService().getUrl() + "?confirmar=" + encodeURIComponent(token);

    MailApp.sendEmail({
      to: email,
      subject: "BABEX: confirma tu solicitud de acceso",
      body:
        (nombre ? "Hola " + nombre + ",\n\n" : "Hola,\n\n") +
        "Hemos recibido una solicitud de acceso a BABEX con este email (" + email + ").\n\n" +
        "Para confirmarla, entra en este enlace:\n" + url + "\n\n" +
        "Hasta que no la confirmes, el administrador no verá tu solicitud. En cuanto la confirmes, se le avisará y podrás entrar en cuanto la apruebe.\n\n" +
        "Si no has sido tú quien ha pedido esto, puedes ignorar este correo.\n"
    });

  } catch (e) {

    // No propaga: un fallo de email no debe bloquear el registro.

  }

};

/**
 * Se llama al hacer clic en el enlace de confirmación del email. Si
 * el token es válido y la solicitud sigue "SinConfirmar", la pasa a
 * "Pendiente" y AHORA SÍ avisa a los administradores — este es el
 * único sitio donde se les notifica.
 */
SolicitudesService.confirmarPorToken = function (token) {

  if (!token) {
    return { ok: false, error: "Enlace no válido." };
  }

  const ss = SpreadsheetApp.openById(CONFIG.DATABASE.ID);
  const sheet = ss.getSheetByName(CONFIG.DATABASE.SHEETS.SOLICITUDES);
  const values = sheet.getDataRange().getValues();

  for (let i = 1; i < values.length; i++) {

    const filaToken = String(values[i][7] || "");

    if (filaToken !== "" && filaToken === String(token)) {

      const filaEstado = String(values[i][4] || "");

      if (filaEstado !== "SinConfirmar") {
        return { ok: false, error: "Este enlace ya se ha usado o la solicitud ya no está pendiente de confirmar." };
      }

      const email = String(values[i][1] || "");
      const nombre = String(values[i][2] || "");

      sheet.getRange(i + 1, 5).setValue("Pendiente");

      SolicitudesService._notificarAdmins(email, nombre);

      return { ok: true };

    }

  }

  return { ok: false, error: "Enlace no válido." };

};

/**
 * Envía un email a todos los Admin activos avisando de la solicitud.
 * Un fallo aquí (por ejemplo, cuota de email agotada) no debe romper
 * el registro de la persona que la generó, así que se traga el error.
 */
SolicitudesService._notificarAdmins = function (email, nombre) {

  try {

    const admins = UsuariosService.getAll().filter(function (u) {
      return u.rol === "Admin" && u.activo === "SI";
    });

    if (!admins.length) return;

    const destinatarios = admins.map(function (a) { return a.email; }).join(",");
    const url = ScriptApp.getService().getUrl();

    MailApp.sendEmail({
      to: destinatarios,
      subject: "BABEX: nueva solicitud de acceso (" + email + ")",
      body:
        (nombre ? nombre + " (" + email + ")" : email) + " ha pedido acceso a BABEX y todavía no tiene cuenta.\n\n" +
        "Entra en BABEX y ve a Administración > Solicitudes de acceso para aprobarla o rechazarla:\n" +
        url + "\n"
    });

  } catch (e) {

    // No propaga: un fallo de email no debe bloquear el registro.

  }

};

/**
 * Aprueba una solicitud: da de alta al usuario reutilizando la sal y
 * el hash que generó al registrarse (misma contraseña que eligió él
 * mismo), con el nombre/rol que decida el administrador, y marca la
 * solicitud como resuelta.
 */
SolicitudesService.aprobar = function (id, nombre, rol) {

  const solicitud = SolicitudesService._filaCompletaPorId(id);
  if (!solicitud) return { ok: false, error: "Solicitud no encontrada." };

  const resultado = UsuariosService._insertConHash({
    email: solicitud.email,
    nombre: nombre || solicitud.nombre || "",
    rol: rol || "Empleado",
    activo: "SI",
    sal: solicitud.sal,
    hash: solicitud.hash
  });

  if (resultado.ok === false) return resultado;

  SolicitudesService._marcarEstado(id, "Aprobada");

  return { ok: true };

};

/**
 * Rechaza una solicitud sin dar de alta a nadie.
 */
SolicitudesService.rechazar = function (id) {

  const solicitud = SolicitudesService._filaCompletaPorId(id);
  if (!solicitud) return { ok: false, error: "Solicitud no encontrada." };

  SolicitudesService._marcarEstado(id, "Rechazada");

  return { ok: true };

};

/**
 * Igual que buscar por id sobre getAll(), pero incluyendo sal/hash —
 * solo para uso interno de aprobar().
 */
SolicitudesService._filaCompletaPorId = function (id) {

  const ss = SpreadsheetApp.openById(CONFIG.DATABASE.ID);
  const sheet = ss.getSheetByName(CONFIG.DATABASE.SHEETS.SOLICITUDES);
  const values = sheet.getDataRange().getValues();

  for (let i = 1; i < values.length; i++) {
    if (Number(values[i][0]) === Number(id)) {
      return {
        id: Number(values[i][0]),
        email: String(values[i][1] || ""),
        nombre: String(values[i][2] || ""),
        fecha: values[i][3],
        estado: String(values[i][4] || "Pendiente"),
        sal: values[i][5],
        hash: values[i][6]
      };
    }
  }

  return null;

};

SolicitudesService._marcarEstado = function (id, estado) {

  const ss = SpreadsheetApp.openById(CONFIG.DATABASE.ID);
  const sheet = ss.getSheetByName(CONFIG.DATABASE.SHEETS.SOLICITUDES);
  const values = sheet.getDataRange().getValues();

  for (let i = 1; i < values.length; i++) {
    if (Number(values[i][0]) === Number(id)) {
      sheet.getRange(i + 1, 5).setValue(estado);
      return;
    }
  }

};
