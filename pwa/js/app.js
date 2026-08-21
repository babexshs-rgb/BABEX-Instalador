/*
==================================================
BABEX Instalador (PWA)
Archivo : app.js
==================================================
La app entera: estado, pantallas y lógica. Sin framework, a
propósito — es una app pequeña y de un único usuario a la vez, y así
no hay que arrastrar un empaquetador para poder desplegarla como
simples archivos estáticos.

Principio de diseño, en una frase: TODO lo que hace el instalador se
guarda primero en el móvil, y se sincroniza cuando se puede. Ningún
botón espera al servidor para responder.
==================================================
*/

const App = {

  pantalla: "cargando", // cargando | login | lista | detalle | parte
  sesion: null,          // { token, usuario }
  visitas: [],
  visitaActual: null,
  datos: null,            // { estancias, lineas, catalogo, cita }
  paso: 1,
  estanciaActual: null,
  productoElegido: null,
  busquedaProducto: "",
  pendientesSync: 0,
  ultimoError: null

};

const PASOS = ["Visita", "Estancias", "Productos", "Fotos", "Cierre"];

/* --------------------------------------------------
   Listas de partida (mismas que en la app web, para que un
   instalador que ha usado las dos no note diferencia).
-------------------------------------------------- */

const TIPOS_INMUEBLE = ["Vivienda", "Local", "Nave", "Oficina", "Otro"];

const SUBTIPOS_VIVIENDA = [
  "Piso", "Chalet", "Adosado", "Unifamiliar", "Ático", "Dúplex", "Bajo", "Estudio", "Otro"
];

const TIPOS_ESTANCIA = [
  "Salón", "Cocina", "Dormitorio", "Baño", "Aseo", "Pasillo", "Recibidor",
  "Despacho", "Garaje", "Trastero", "Terraza", "Jardín", "Piscina",
  "Cuadro eléctrico", "Exterior", "Otra"
];

const TIPOS_FOTO = ["General", "Dónde instalar", "Instalado", "Estado / avería", "Detalle"];

const PREGUNTAS = {

  "Vivienda": [
    { id: "personas", etiqueta: "Personas que viven", tipo: "contador", min: 1, max: 12, porDefecto: 2 },
    { id: "internet", etiqueta: "Conexión a internet", tipo: "opciones", opciones: ["Fibra", "ADSL", "Móvil", "Sin internet"] },
    { id: "cuadro", etiqueta: "Cuadro eléctrico accesible", tipo: "si_no" }
  ],
  "Vivienda|Piso": [
    { id: "planta", etiqueta: "En qué planta está", tipo: "contador", min: 0, max: 20, porDefecto: 1 },
    { id: "ascensor", etiqueta: "Ascensor", tipo: "si_no" },
    { id: "terraza", etiqueta: "Terraza o balcón", tipo: "si_no" },
    { id: "trastero", etiqueta: "Trastero", tipo: "si_no" },
    { id: "garaje", etiqueta: "Plaza de garaje", tipo: "si_no" }
  ],
  "Vivienda|Chalet": [
    { id: "plantas", etiqueta: "Número de plantas", tipo: "contador", min: 1, max: 5, porDefecto: 2 },
    { id: "garaje", etiqueta: "Garaje", tipo: "si_no" },
    { id: "jardin", etiqueta: "Jardín", tipo: "si_no" },
    { id: "piscina", etiqueta: "Piscina", tipo: "si_no" },
    { id: "trastero", etiqueta: "Trastero o sótano", tipo: "si_no" },
    { id: "porton", etiqueta: "Portón o cancela", tipo: "si_no" }
  ],
  "Vivienda|Adosado": [
    { id: "plantas", etiqueta: "Número de plantas", tipo: "contador", min: 1, max: 4, porDefecto: 2 },
    { id: "garaje", etiqueta: "Garaje", tipo: "si_no" },
    { id: "jardin", etiqueta: "Jardín o patio", tipo: "si_no" },
    { id: "trastero", etiqueta: "Trastero", tipo: "si_no" }
  ],
  "Vivienda|Unifamiliar": [
    { id: "plantas", etiqueta: "Número de plantas", tipo: "contador", min: 1, max: 5, porDefecto: 2 },
    { id: "garaje", etiqueta: "Garaje", tipo: "si_no" },
    { id: "jardin", etiqueta: "Jardín", tipo: "si_no" },
    { id: "piscina", etiqueta: "Piscina", tipo: "si_no" },
    { id: "porton", etiqueta: "Portón o cancela", tipo: "si_no" }
  ],
  "Vivienda|Ático": [
    { id: "planta", etiqueta: "En qué planta está", tipo: "contador", min: 1, max: 20, porDefecto: 5 },
    { id: "ascensor", etiqueta: "Ascensor", tipo: "si_no" },
    { id: "terraza", etiqueta: "Terraza", tipo: "si_no" },
    { id: "trastero", etiqueta: "Trastero", tipo: "si_no" }
  ],
  "Vivienda|Dúplex": [
    { id: "plantas", etiqueta: "Número de plantas", tipo: "contador", min: 2, max: 3, porDefecto: 2 },
    { id: "ascensor", etiqueta: "Ascensor", tipo: "si_no" },
    { id: "terraza", etiqueta: "Terraza", tipo: "si_no" },
    { id: "garaje", etiqueta: "Plaza de garaje", tipo: "si_no" }
  ],
  "Vivienda|Bajo": [
    { id: "jardin", etiqueta: "Jardín o patio", tipo: "si_no" },
    { id: "trastero", etiqueta: "Trastero", tipo: "si_no" },
    { id: "garaje", etiqueta: "Plaza de garaje", tipo: "si_no" }
  ],
  "Vivienda|Estudio": [
    { id: "planta", etiqueta: "En qué planta está", tipo: "contador", min: 0, max: 20, porDefecto: 1 },
    { id: "ascensor", etiqueta: "Ascensor", tipo: "si_no" }
  ],
  "Local": [
    { id: "plantas", etiqueta: "Número de plantas", tipo: "contador", min: 1, max: 4, porDefecto: 1 },
    { id: "escaparate", etiqueta: "Escaparate a la calle", tipo: "si_no" },
    { id: "almacen", etiqueta: "Almacén o trastienda", tipo: "si_no" },
    { id: "aseo", etiqueta: "Aseo", tipo: "si_no" },
    { id: "alarma", etiqueta: "Alarma ya instalada", tipo: "si_no" },
    { id: "internet", etiqueta: "Conexión a internet", tipo: "opciones", opciones: ["Fibra", "ADSL", "Móvil", "Sin internet"] }
  ],
  "Nave": [
    { id: "altura", etiqueta: "Altura aproximada (m)", tipo: "contador", min: 3, max: 15, porDefecto: 6 },
    { id: "oficinas", etiqueta: "Oficinas dentro", tipo: "si_no" },
    { id: "muelle", etiqueta: "Muelle de carga", tipo: "si_no" },
    { id: "porton", etiqueta: "Portón automático", tipo: "si_no" },
    { id: "internet", etiqueta: "Conexión a internet", tipo: "opciones", opciones: ["Fibra", "ADSL", "Móvil", "Sin internet"] }
  ],
  "Oficina": [
    { id: "planta", etiqueta: "En qué planta está", tipo: "contador", min: 0, max: 30, porDefecto: 1 },
    { id: "ascensor", etiqueta: "Ascensor", tipo: "si_no" },
    { id: "puestos", etiqueta: "Puestos de trabajo", tipo: "contador", min: 1, max: 50, porDefecto: 5 },
    { id: "sala", etiqueta: "Sala de reuniones", tipo: "si_no" },
    { id: "internet", etiqueta: "Conexión a internet", tipo: "opciones", opciones: ["Fibra", "ADSL", "Móvil", "Sin internet"] }
  ],
  "Otro": [
    { id: "plantas", etiqueta: "Número de plantas", tipo: "contador", min: 1, max: 10, porDefecto: 1 },
    { id: "internet", etiqueta: "Conexión a internet", tipo: "opciones", opciones: ["Fibra", "ADSL", "Móvil", "Sin internet"] }
  ]

};

function preguntasDe(tipo, subtipo) {
  if (!tipo) return [];
  const comunes = PREGUNTAS[tipo] || [];
  const propias = subtipo ? (PREGUNTAS[tipo + "|" + subtipo] || []) : [];
  return comunes.concat(propias);
}

/* --------------------------------------------------
   Utilidades
-------------------------------------------------- */

function escapar(texto) {
  return String(texto == null ? "" : texto)
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function tmpId() {
  return "t" + Date.now() + "_" + Math.random().toString(36).slice(2, 7);
}

function hoyISO() {
  const d = new Date();
  return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
}

function fechaBonita(iso) {
  if (!iso) return "";
  const hoy = hoyISO();
  if (iso === hoy) return "Hoy";
  const manana = new Date();
  manana.setDate(manana.getDate() + 1);
  const isoManana = manana.getFullYear() + "-" + String(manana.getMonth() + 1).padStart(2, "0") + "-" + String(manana.getDate()).padStart(2, "0");
  if (iso === isoManana) return "Mañana";
  const p = iso.split("-");
  return p[2] + "/" + p[1];
}

function visitaCerrada(v) {
  return v && ["Realizada", "Cancelada"].indexOf(v.estado) !== -1;
}

/* --------------------------------------------------
   Render: se limita a volcar HTML en #app. Nada de diffing: la app es
   pequeña, y hacerlo simple es menos sitios donde esconder un error.
-------------------------------------------------- */

function render() {

  const raiz = document.getElementById("app");

  const vistas = {
    cargando: renderCargando,
    login: renderLogin,
    lista: renderLista,
    detalle: renderDetalle,
    parte: renderParte
  };

  raiz.innerHTML = (vistas[App.pantalla] || renderCargando)();

  actualizarBarraSync();

}

function renderCargando() {
  return `<div class="pantalla-centrada"><div class="spinner"></div><p>Cargando...</p></div>`;
}

/* ================================================
   LOGIN
================================================ */

function renderLogin() {

  return `

  <div class="pantalla-login">

    <div class="login-marca">
      <img src="/icons/icon-192.png" alt="" width="72" height="72">
      <h1>Babex</h1>
      <p>App del instalador</p>
    </div>

    <form id="form-login" class="login-form">

      <label class="campo">
        <span>Email</span>
        <input type="email" id="login-email" autocomplete="username" required inputmode="email">
      </label>

      <label class="campo">
        <span>Contraseña</span>
        <input type="password" id="login-password" autocomplete="current-password" required>
      </label>

      ${App.ultimoError ? `<p class="login-error">${escapar(App.ultimoError)}</p>` : ""}

      <button type="submit" class="boton boton-primario boton-ancho">Entrar</button>

    </form>

    <p class="login-nota">Necesitas conexión la primera vez. Después, la app funciona sin internet.</p>

  </div>

  `;

}

function iniciarLogin() {

  document.getElementById("form-login").addEventListener("submit", function (ev) {

    ev.preventDefault();

    const email = document.getElementById("login-email").value.trim();
    const password = document.getElementById("login-password").value;

    if (!navigator.onLine) {
      App.ultimoError = "Necesitas conexión para iniciar sesión la primera vez.";
      render();
      return;
    }

    const boton = ev.target.querySelector("button");
    boton.disabled = true;
    boton.textContent = "Entrando...";

    BabexAPI.login(email, password).then(function (r) {

      if (!r || r.ok === false) {

        App.ultimoError = (r && r.error) || "No se ha podido iniciar sesión.";
        render();
        return;

      }

      App.sesion = { token: r.token, usuario: r.usuario };
      App.ultimoError = null;
      BabexAPI.fijarToken(r.token);

      BabexDB.guardarValor("sesion", App.sesion).then(function () {
        irALista();
      });

    });

  });

}

function cerrarSesion() {

  if (!confirm("¿Cerrar sesión? Si tienes cambios sin sincronizar, se quedarán guardados en este móvil hasta que vuelvas a entrar.")) return;

  BabexAPI.cerrarSesion();
  BabexDB.borrarValor("sesion").then(function () {
    App.sesion = null;
    App.pantalla = "login";
    render();
    iniciarLogin();
  });

}

/* ================================================
   LISTA DE VISITAS
================================================ */

function irALista() {

  App.pantalla = "lista";
  render();
  iniciarListaEventos();

  BabexDB.todasLasVisitas().then(function (visitas) {
    App.visitas = visitas;
    render();
    iniciarListaEventos();
  });

  if (navigator.onLine) {

    BabexAPI.misVisitas().then(function (r) {

      if (r && r.ok && Array.isArray(r.visitas)) {

        BabexDB.guardarVisitas(r.visitas).then(function () {
          App.visitas = r.visitas;
          if (App.pantalla === "lista") { render(); iniciarListaEventos(); }
        });

      }

    });

  }

}

function renderLista() {

  const hoy = hoyISO();
  const pendientes = (App.visitas || []).filter(function (v) { return v.fecha >= hoy; });

  const deHoy = pendientes.filter(function (v) { return v.fecha === hoy; });
  const proximas = pendientes.filter(function (v) { return v.fecha > hoy; });

  function tarjeta(v) {

    return `

    <div class="tarjeta-visita" data-id="${v.id}">

      <div class="tarjeta-visita-hora">
        <strong>${v.hora || "--:--"}</strong>
        <span>${fechaBonita(v.fecha)}</span>
      </div>

      <div class="tarjeta-visita-datos">
        <div class="tarjeta-visita-cliente">${escapar(v.clienteNombre || "Sin cliente")}</div>
        <div class="tarjeta-visita-titulo">${escapar(v.titulo || "")}</div>
        ${v.direccion ? `<div class="tarjeta-visita-direccion">${escapar(v.direccion)}</div>` : ""}
        <span class="chip">${escapar(v.tipo || "Visita")}</span>
        <span class="chip chip-estado">${escapar(v.estado || "")}</span>
      </div>

      <div class="tarjeta-visita-flecha">›</div>

    </div>

    `;

  }

  let cuerpo = "";

  if (!pendientes.length) {
    cuerpo = `<div class="vacio"><div class="vacio-icono">📋</div><h2>No tienes visitas</h2><p>Cuando te asignen una, aparecerá aquí.</p></div>`;
  } else {

    if (deHoy.length) cuerpo += `<div class="lista-seccion">Hoy · ${deHoy.length}</div>` + deHoy.map(tarjeta).join("");
    if (proximas.length) cuerpo += `<div class="lista-seccion">Próximas</div>` + proximas.map(tarjeta).join("");

  }

  return `

  <header class="cabecera">
    <div class="cabecera-marca"><strong>Babex</strong><span>${escapar((App.sesion && App.sesion.usuario && App.sesion.usuario.nombre) || "")}</span></div>
    <div class="cabecera-acciones">
      <button class="icono" id="btn-refrescar" aria-label="Actualizar">⟳</button>
      <button class="icono" id="btn-salir" aria-label="Salir">⏻</button>
    </div>
  </header>

  <div class="contenido">${cuerpo}</div>

  `;

}

function iniciarListaEventos() {

  const btnRefrescar = document.getElementById("btn-refrescar");
  if (btnRefrescar) btnRefrescar.addEventListener("click", function () { irALista(); BabexSync.ejecutar(); });

  const btnSalir = document.getElementById("btn-salir");
  if (btnSalir) btnSalir.addEventListener("click", cerrarSesion);

  document.querySelectorAll(".tarjeta-visita").forEach(function (el) {
    el.addEventListener("click", function () { abrirVisita(Number(el.dataset.id)); });
  });

}

/* ================================================
   DETALLE DE VISITA
================================================ */

function abrirVisita(id) {

  App.visitaActual = (App.visitas || []).find(function (v) { return Number(v.id) === id; }) || null;
  App.pantalla = "detalle";
  render();
  iniciarDetalleEventos();

}

function renderDetalle() {

  const v = App.visitaActual;

  if (!v) return `<div class="vacio"><p>Esta visita ya no está disponible.</p></div>`;

  return `

  <header class="cabecera">
    <button class="atras" id="btn-volver-lista">‹</button>
    <div class="cabecera-titulo">Visita</div>
    <span></span>
  </header>

  <div class="contenido">

    <div class="detalle-cuando">${fechaBonita(v.fecha)} · ${v.hora || "--:--"}</div>
    <h1 class="detalle-titulo">${escapar(v.titulo || "Visita")}</h1>
    <span class="chip">${escapar(v.tipo || "Visita")}</span>
    <span class="chip chip-estado">${escapar(v.estado || "")}</span>

    <div class="bloque">
      <div class="bloque-titulo">Cliente</div>
      <div class="bloque-valor">${escapar(v.clienteNombre || "Sin cliente")}</div>
      <div class="bloque-secundario">${escapar(v.clienteTelefono || "Sin teléfono registrado")}</div>
    </div>

    <div class="bloque">
      <div class="bloque-titulo">Dirección</div>
      <div class="bloque-valor">${escapar(v.direccion || "Sin dirección registrada")}</div>
    </div>

    ${v.notas ? `<div class="bloque"><div class="bloque-titulo">Notas de oficina</div><div class="bloque-nota">${escapar(v.notas)}</div></div>` : ""}

    <div class="fila-dos-botones">
      <button class="boton boton-secundario" id="btn-llamar">📞 Llamar</button>
      <button class="boton boton-primario" id="btn-ir">🧭 Ir</button>
    </div>

    <button class="boton boton-primario boton-ancho boton-alto" id="btn-empezar-parte">
      ${visitaCerrada(v) ? "Revisar el parte" : "Empezar parte de visita"}
    </button>

  </div>

  `;

}

function iniciarDetalleEventos() {

  document.getElementById("btn-volver-lista").addEventListener("click", irALista);

  document.getElementById("btn-llamar").addEventListener("click", function () {
    const v = App.visitaActual;
    if (!v.clienteTelefono) { alert("Este cliente no tiene teléfono registrado."); return; }
    window.open("tel:" + String(v.clienteTelefono).replace(/\s+/g, ""), "_self");
  });

  document.getElementById("btn-ir").addEventListener("click", function () {
    const v = App.visitaActual;
    let url;
    if (v.latitud && v.longitud) url = "https://www.google.com/maps/dir/?api=1&destination=" + encodeURIComponent(v.latitud + "," + v.longitud);
    else if (v.direccion) url = "https://www.google.com/maps/dir/?api=1&destination=" + encodeURIComponent(v.direccion);
    else { alert("Esta visita no tiene dirección registrada."); return; }
    window.open(url, "_blank");
  });

  document.getElementById("btn-empezar-parte").addEventListener("click", abrirParte);

}

/* ================================================
   PARTE DE VISITA
================================================ */

function abrirParte() {

  const citaId = App.visitaActual.id;

  App.paso = 1;
  App.estanciaActual = null;
  App.productoElegido = null;
  App.busquedaProducto = "";
  App.pantalla = "parte";

  BabexDB.leerDatosVisita(citaId).then(function (guardado) {

    if (guardado) {

      App.datos = guardado;
      render();
      iniciarParteEventos();

    } else if (navigator.onLine) {

      render(); // pantalla de "cargando parte" mientras llega

      BabexAPI.datosVisita(citaId).then(function (r) {

        if (r && r.ok) {

          const datos = { cita: r.cita, estancias: r.estancias, lineas: r.lineas, catalogo: r.catalogo, fotos: r.fotos };
          App.datos = datos;
          BabexDB.guardarDatosVisita(citaId, datos);

        } else {

          App.datos = { estancias: [], lineas: [], catalogo: [], fotos: [], cita: App.visitaActual };

        }

        render();
        iniciarParteEventos();

      });

    } else {

      alert("Esta visita no se ha abierto nunca en este móvil y no hay conexión para descargarla. Acércate a una zona con cobertura una vez, y luego funcionará sin conexión.");
      App.pantalla = "detalle";
      render();
      iniciarDetalleEventos();

    }

  });

}

function guardarDatosLocal() {
  return BabexDB.guardarDatosVisita(App.visitaActual.id, App.datos);
}

function renderParte() {

  if (!App.datos) return `<div class="vacio"><p>Cargando la visita...</p></div>`;

  const pasos = { 1: renderPasoConfirmar, 2: renderPasoEstancias, 3: renderPasoProductos, 4: renderPasoFotos, 5: renderPasoCierre };

  return `

  <header class="cabecera">
    <button class="atras" id="btn-paso-atras">‹</button>
    <div class="cabecera-titulo">${App.paso}/5 · ${PASOS[App.paso - 1]}</div>
    <button class="icono" id="btn-salir-parte">✕</button>
  </header>

  <div class="progreso">
    ${PASOS.map(function (nombre, i) {
      const n = i + 1;
      const clase = n === App.paso ? "activo" : (n < App.paso ? "hecho" : "");
      return `<div class="progreso-punto ${clase}" data-paso="${n}"></div>`;
    }).join("")}
  </div>

  <div class="contenido">${pasos[App.paso]()}</div>

  `;

}

function iniciarParteEventos() {

  document.getElementById("btn-paso-atras").addEventListener("click", pasoAnterior);
  document.getElementById("btn-salir-parte").addEventListener("click", function () { App.pantalla = "detalle"; render(); iniciarDetalleEventos(); });

  document.querySelectorAll(".progreso-punto").forEach(function (el) {
    el.addEventListener("click", function () { irAPaso(Number(el.dataset.paso)); });
  });

  const pasoEventos = { 1: eventosPasoConfirmar, 2: eventosPasoEstancias, 3: eventosPasoProductos, 4: eventosPasoFotos, 5: eventosPasoCierre };
  if (pasoEventos[App.paso]) pasoEventos[App.paso]();

}

function irAPaso(n) { App.paso = n; render(); iniciarParteEventos(); }

function siguientePaso() {
  if (App.paso < 5) { App.paso++; render(); iniciarParteEventos(); document.querySelector(".contenido").scrollTop = 0; }
}

function pasoAnterior() {
  if (App.paso > 1) { App.paso--; render(); iniciarParteEventos(); }
  else { App.pantalla = "detalle"; render(); iniciarDetalleEventos(); }
}

/* --- Paso 1: confirmar + tipo de inmueble + preguntas --- */

function renderPasoConfirmar() {

  const v = App.visitaActual;
  const cerrada = visitaCerrada(v);
  const inmuebleId = v.inmuebleId;

  let bloqueTipo = "";

  if (inmuebleId) {

    bloqueTipo = `

    <div class="bloque">
      <div class="bloque-titulo">Tipo de inmueble</div>
      <div class="bloque-valor">${v.inmuebleTipo ? escapar(v.inmuebleTipo) + (v.inmuebleSubtipo ? " · " + escapar(v.inmuebleSubtipo) : "") : "Sin definir"}</div>
      <button class="boton boton-secundario boton-ancho" id="btn-tipo-inmueble">${v.inmuebleTipo ? "Cambiar" : "Definir ahora"}</button>
    </div>

    ${renderPreguntas()}

    `;

  } else {

    bloqueTipo = `<div class="aviso">Esta visita no tiene inmueble vinculado: no se pueden registrar estancias ni productos. Avisa a la oficina.</div>`;

  }

  return `

  <h2 class="paso-titulo">${cerrada ? "Visita ya cerrada" : "¿Es esta la visita?"}</h2>
  ${cerrada ? `<p class="paso-texto">Se cerró como «${escapar(v.estado)}». Sigue adelante para corregir o añadir algo.</p>` : ""}

  <div class="bloque"><div class="bloque-titulo">Cliente</div><div class="bloque-valor">${escapar(v.clienteNombre || "Sin cliente")}</div></div>
  <div class="bloque"><div class="bloque-titulo">Dirección</div><div class="bloque-valor">${escapar(v.direccion || "Sin dirección")}</div></div>

  ${bloqueTipo}

  <div class="paso-pie">
    <div class="paso-pie-principal">
      <button class="boton boton-primario boton-ancho boton-alto" id="btn-siguiente">${cerrada ? "Continuar" : "Empezar"}</button>
    </div>
  </div>

  `;

}

function eventosPasoConfirmar() {

  document.getElementById("btn-siguiente").addEventListener("click", siguientePaso);

  const btnTipo = document.getElementById("btn-tipo-inmueble");
  if (btnTipo) btnTipo.addEventListener("click", elegirTipoInmueble);

  document.querySelectorAll("[data-responder]").forEach(function (el) {
    el.addEventListener("click", function () {
      responderPregunta(el.dataset.responder, JSON.parse(el.dataset.valor));
    });
  });

  document.querySelectorAll("[data-sumar]").forEach(function (el) {
    el.addEventListener("click", function () {
      sumarPregunta(el.dataset.sumar, Number(el.dataset.delta), Number(el.dataset.min), Number(el.dataset.max), Number(el.dataset.pordefecto));
    });
  });

}

function caracteristicas() {
  const v = App.visitaActual;
  if (!v.inmuebleCaracteristicas) v.inmuebleCaracteristicas = {};
  return v.inmuebleCaracteristicas;
}

function renderPreguntas() {

  const v = App.visitaActual;
  if (!v.inmuebleId || !v.inmuebleTipo) return "";

  const preguntas = preguntasDe(v.inmuebleTipo, v.inmuebleSubtipo);
  if (!preguntas.length) return "";

  const c = caracteristicas();

  const bloques = preguntas.map(function (p) {

    const valor = c[p.id];

    if (p.tipo === "si_no") {
      return `
      <div class="pregunta">
        <div class="pregunta-etiqueta">${p.etiqueta}</div>
        <div class="pregunta-botones">
          <button class="opcion ${valor === true ? "activa" : ""}" data-responder="${p.id}" data-valor="true">Sí</button>
          <button class="opcion ${valor === false ? "activa" : ""}" data-responder="${p.id}" data-valor="false">No</button>
        </div>
      </div>`;
    }

    if (p.tipo === "contador") {
      const n = valor !== undefined ? valor : p.porDefecto;
      return `
      <div class="pregunta">
        <div class="pregunta-etiqueta">${p.etiqueta}</div>
        <div class="contador">
          <button class="opcion" data-sumar="${p.id}" data-delta="-1" data-min="${p.min}" data-max="${p.max}" data-pordefecto="${p.porDefecto}">−</button>
          <span class="contador-valor">${n}</span>
          <button class="opcion" data-sumar="${p.id}" data-delta="1" data-min="${p.min}" data-max="${p.max}" data-pordefecto="${p.porDefecto}">+</button>
        </div>
      </div>`;
    }

    return `
    <div class="pregunta">
      <div class="pregunta-etiqueta">${p.etiqueta}</div>
      <div class="pregunta-botones pregunta-botones-multi">
        ${p.opciones.map(function (op) {
          return `<button class="opcion ${valor === op ? "activa" : ""}" data-responder="${p.id}" data-valor='"${op}"'>${op}</button>`;
        }).join("")}
      </div>
    </div>`;

  }).join("");

  return `<div class="bloque"><div class="bloque-titulo">Sobre el inmueble</div><p class="pregunta-ayuda">Se guarda solo al tocar.</p>${bloques}</div>`;

}

function guardarCaracteristicasLocal() {

  const v = App.visitaActual;

  BabexDB.encolarCambio("caracteristicas", { inmuebleId: v.inmuebleId, caracteristicas: caracteristicas() });

  // También se refleja en la caché de la visita, para que si se
  // reabre offline se vea lo último que se tocó.
  const idx = App.visitas.findIndex(function (x) { return x.id === v.id; });
  if (idx !== -1) App.visitas[idx].inmuebleCaracteristicas = v.inmuebleCaracteristicas;
  BabexDB.guardarVisitas(App.visitas);

  actualizarBarraSync();
  BabexSync.ejecutar();

}

function responderPregunta(id, valor) {
  caracteristicas()[id] = valor;
  guardarCaracteristicasLocal();
  render();
  iniciarParteEventos();
}

function sumarPregunta(id, delta, min, max, porDefecto) {
  const c = caracteristicas();
  const actual = c[id] !== undefined ? Number(c[id]) : porDefecto;
  let nuevo = actual + delta;
  if (nuevo < min) nuevo = min;
  if (nuevo > max) nuevo = max;
  responderPregunta(id, nuevo);
}

function elegirTipoInmueble() {

  abrirModalSelector("¿Qué tipo de inmueble es?", TIPOS_INMUEBLE, function (tipo) {

    if (tipo !== "Vivienda") { guardarTipoInmueble(tipo, ""); return; }

    abrirModalSelector("¿Qué tipo de vivienda?", SUBTIPOS_VIVIENDA, function (subtipo) {
      guardarTipoInmueble("Vivienda", subtipo);
    });

  });

}

function guardarTipoInmueble(tipo, subtipo) {

  const v = App.visitaActual;

  v.inmuebleTipo = tipo;
  v.inmuebleSubtipo = subtipo;

  BabexDB.encolarCambio("tipoInmueble", { inmuebleId: v.inmuebleId, tipo: tipo, subtipo: subtipo });

  const idx = App.visitas.findIndex(function (x) { return x.id === v.id; });
  if (idx !== -1) { App.visitas[idx].inmuebleTipo = tipo; App.visitas[idx].inmuebleSubtipo = subtipo; }
  BabexDB.guardarVisitas(App.visitas);

  render();
  iniciarParteEventos();
  BabexSync.ejecutar();

}

/* --- Paso 2: estancias --- */

function lineasDe(estanciaId) {
  return (App.datos.lineas || []).filter(function (l) { return String(l.estanciaId) === String(estanciaId); });
}

function renderPasoEstancias() {

  const estancias = App.datos.estancias || [];

  const bloques = estancias.map(function (e) {

    const cuantos = lineasDe(e.id).length;

    return `
    <div class="tarjeta-estancia">
      <div class="tarjeta-estancia-fila">
        <div>
          <div class="tarjeta-estancia-nombre">${escapar(e.nombre)}</div>
          <div class="tarjeta-estancia-meta">${cuantos} producto${cuantos === 1 ? "" : "s"}</div>
        </div>
        <button class="mini-boton" data-foto-estancia="${e.id}">📷</button>
      </div>
    </div>`;

  }).join("");

  return `

  <h2 class="paso-titulo">Estancias</h2>
  <p class="paso-texto">Repasa las estancias de la vivienda. Si falta alguna, añádela.</p>

  ${bloques || `<div class="aviso">Todavía no hay ninguna estancia registrada.</div>`}

  <button class="boton boton-secundario boton-ancho" id="btn-nueva-estancia">+ Añadir estancia</button>

  <div class="paso-pie">
    <div class="paso-pie-secundaria">
      <button class="boton boton-foto boton-ancho" id="btn-foto-general">📷 Añadir foto</button>
    </div>
    <div class="paso-pie-principal">
      <button class="boton boton-primario boton-ancho boton-alto" id="btn-siguiente">Siguiente</button>
    </div>
  </div>

  `;

}

function eventosPasoEstancias() {

  document.getElementById("btn-siguiente").addEventListener("click", siguientePaso);
  document.getElementById("btn-nueva-estancia").addEventListener("click", nuevaEstancia);
  document.getElementById("btn-foto-general").addEventListener("click", function () { elegirOrigenFoto(null, null); });

  document.querySelectorAll("[data-foto-estancia]").forEach(function (el) {
    el.addEventListener("click", function () { elegirOrigenFoto(el.dataset.fotoEstancia, null); });
  });

}

function nuevaEstancia() {

  abrirModalSelector("Tipo de estancia", TIPOS_ESTANCIA, function (tipo) {

    const necesitaDetalle = true;

    abrirModalTexto(
      tipo === "Otra" ? "¿Cuál es?" : "Detalle (opcional)",
      tipo === "Otra" ? "Ej. leñera, cuarto de instalaciones..." : "Ej. principal, infantil, planta baja...",
      function (detalle) {

        if (tipo === "Otra" && !detalle.trim()) { alert("Escribe de qué estancia se trata."); return; }

        const nombre = tipo === "Otra" ? detalle.trim() : (detalle.trim() ? tipo + " " + detalle.trim() : tipo);
        const id = tmpId();

        App.datos.estancias.push({ id: id, inmuebleId: App.visitaActual.inmuebleId, nombre: nombre, tipo: tipo, observaciones: "" });

        BabexDB.encolarCambio("estanciaNueva", { inmuebleId: App.visitaActual.inmuebleId, nombre: nombre, tipo: tipo }, id);
        guardarDatosLocal();

        render();
        iniciarParteEventos();
        BabexSync.ejecutar();

      }

    );

  });

}

/* --- Paso 3: productos (con buscador) --- */

function renderPasoProductos() {

  const estancias = App.datos.estancias || [];

  if (!estancias.length) {
    return `<h2 class="paso-titulo">Productos</h2><div class="aviso">Añade primero alguna estancia.</div>${piePasoSimple()}`;
  }

  if (!App.estanciaActual) {

    const tarjetas = estancias.map(function (e) {
      const n = lineasDe(e.id).length;
      return `<div class="tarjeta-estancia tarjeta-pulsable" data-elegir-estancia="${e.id}">
        <div><div class="tarjeta-estancia-nombre">${escapar(e.nombre)}</div><div class="tarjeta-estancia-meta">${n} producto${n === 1 ? "" : "s"}</div></div>
        <div class="flecha">›</div>
      </div>`;
    }).join("");

    return `<h2 class="paso-titulo">¿En qué estancia estás?</h2>${tarjetas}${piePasoSimple()}`;

  }

  const estancia = estancias.find(function (e) { return String(e.id) === String(App.estanciaActual); });
  const lineas = lineasDe(App.estanciaActual);

  const listaLineas = lineas.map(function (l) {
    return `
    <div class="tarjeta-linea">
      <div class="tarjeta-linea-nombre">${l.cantidad} × ${escapar(l.productoNombre)}</div>
      <div class="tarjeta-linea-estado estado-${String(l.estado).toLowerCase()}">${l.estado}</div>
    </div>`;
  }).join("");

  return `

  <h2 class="paso-titulo">${escapar(estancia ? estancia.nombre : "")}</h2>
  <button class="enlace" id="btn-cambiar-estancia">‹ Cambiar de estancia</button>

  ${listaLineas || `<div class="aviso">Todavía no hay productos en esta estancia.</div>`}

  <div class="bloque">
    <div class="bloque-titulo">Añadir producto</div>
    ${renderBuscadorProducto()}
  </div>

  <div class="paso-pie">
    <div class="paso-pie-secundaria">
      <button class="boton boton-foto boton-ancho" data-foto-estancia="${App.estanciaActual}">📷 Añadir foto</button>
    </div>
    <div class="paso-pie-principal">
      <button class="boton boton-primario boton-ancho boton-alto" id="btn-siguiente">Siguiente</button>
    </div>
  </div>

  `;

}

function renderBuscadorProducto() {

  const catalogo = App.datos.catalogo || [];

  if (App.productoElegido) {
    return `
    <div class="producto-elegido">
      <div class="producto-elegido-nombre">${escapar(App.productoElegido.nombre)}</div>
      <button class="mini-boton" id="btn-cambiar-producto">Cambiar</button>
    </div>
    <div class="fila-cantidad">
      <input id="input-cantidad" type="number" min="1" value="1" inputmode="numeric">
      <button class="boton boton-primario" id="btn-anadir-producto">Añadir</button>
    </div>`;
  }

  const busqueda = (App.busquedaProducto || "").trim().toLowerCase();

  if (busqueda.length >= 2) {

    const coincidencias = catalogo.filter(function (p) { return (p.nombre || "").toLowerCase().indexOf(busqueda) !== -1; }).slice(0, 25);

    const resultados = coincidencias.length
      ? coincidencias.map(function (p) {
          return `<div class="resultado" data-elegir-producto="${p.id}"><span>${escapar(p.nombre)}</span><span class="resultado-familia">${escapar(p.familia || "")}</span></div>`;
        }).join("")
      : `<p class="bloque-secundario">Sin resultados.</p>`;

    return `<input class="buscador" type="search" inputmode="search" placeholder="Buscar producto..." value="${escapar(App.busquedaProducto)}" id="input-buscar-producto" autofocus>
      <div class="resultados">${resultados}</div>`;

  }

  return `<input class="buscador" type="search" inputmode="search" placeholder="Buscar producto..." value="" id="input-buscar-producto">`;

}

function piePasoSimple() {
  return `<div class="paso-pie"><div class="paso-pie-principal"><button class="boton boton-primario boton-ancho boton-alto" id="btn-siguiente">Siguiente</button></div></div>`;
}

function eventosPasoProductos() {

  const btnSig = document.getElementById("btn-siguiente");
  if (btnSig) btnSig.addEventListener("click", siguientePaso);

  document.querySelectorAll("[data-elegir-estancia]").forEach(function (el) {
    el.addEventListener("click", function () {
      App.estanciaActual = el.dataset.elegirEstancia;
      App.productoElegido = null;
      App.busquedaProducto = "";
      render(); iniciarParteEventos();
    });
  });

  const btnCambiarEstancia = document.getElementById("btn-cambiar-estancia");
  if (btnCambiarEstancia) btnCambiarEstancia.addEventListener("click", function () {
    App.estanciaActual = null; App.productoElegido = null; App.busquedaProducto = "";
    render(); iniciarParteEventos();
  });

  document.querySelectorAll("[data-foto-estancia]").forEach(function (el) {
    el.addEventListener("click", function () { elegirOrigenFoto(el.dataset.fotoEstancia, null); });
  });

  const input = document.getElementById("input-buscar-producto");
  if (input) input.addEventListener("input", function () {
    App.busquedaProducto = input.value;
    render(); iniciarParteEventos();
    const nuevoInput = document.getElementById("input-buscar-producto");
    if (nuevoInput) { nuevoInput.focus(); nuevoInput.setSelectionRange(nuevoInput.value.length, nuevoInput.value.length); }
  });

  document.querySelectorAll("[data-elegir-producto]").forEach(function (el) {
    el.addEventListener("click", function () {
      const p = (App.datos.catalogo || []).find(function (x) { return String(x.id) === el.dataset.elegirProducto; });
      if (!p) return;
      App.productoElegido = p;
      App.busquedaProducto = "";
      render(); iniciarParteEventos();
    });
  });

  const btnCambiarProducto = document.getElementById("btn-cambiar-producto");
  if (btnCambiarProducto) btnCambiarProducto.addEventListener("click", function () {
    App.productoElegido = null; render(); iniciarParteEventos();
  });

  const btnAnadir = document.getElementById("btn-anadir-producto");
  if (btnAnadir) btnAnadir.addEventListener("click", anadirProducto);

}

function anadirProducto() {

  const cantidad = Number(document.getElementById("input-cantidad").value) || 1;
  const producto = App.productoElegido;
  const estanciaId = App.estanciaActual;
  const id = tmpId();

  const tipoVisita = (App.visitaActual.tipo || "").toLowerCase();
  const estado = tipoVisita.indexOf("instalac") !== -1 ? "Instalado" : "Propuesto";

  App.datos.lineas.push({ id: id, estanciaId: estanciaId, productoId: producto.id, productoNombre: producto.nombre, cantidad: cantidad, estado: estado, observaciones: "" });

  BabexDB.encolarCambio("lineaNueva", {
    estanciaId: estanciaId, productoId: producto.id, cantidad: cantidad, estado: estado, citaId: App.visitaActual.id
  }, id);

  guardarDatosLocal();

  App.productoElegido = null;
  App.busquedaProducto = "";

  render(); iniciarParteEventos();
  BabexSync.ejecutar();

}

/* --- Paso 4: fotos --- */

function renderPasoFotos() {

  return `

  <h2 class="paso-titulo">Fotos de este inmueble</h2>
  <p class="paso-texto">Las fotos se hacen desde cada estancia o producto, en el paso anterior, para que quede claro a qué corresponde cada una.</p>

  <div class="bloque">
    <div class="bloque-titulo">Pendientes de subir en este móvil</div>
    <div class="bloque-valor" id="contador-fotos-pendientes">…</div>
  </div>

  <button class="boton boton-foto boton-ancho" id="btn-foto-general-2">📷 Foto general</button>

  ${piePasoSimple()}

  `;

}

function eventosPasoFotos() {

  document.getElementById("btn-siguiente").addEventListener("click", siguientePaso);
  document.getElementById("btn-foto-general-2").addEventListener("click", function () { elegirOrigenFoto(null, null); });

  BabexDB.fotosPendientes().then(function (fotos) {
    const propias = fotos.filter(function (f) { return Number(f.citaId) === Number(App.visitaActual.id); });
    const el = document.getElementById("contador-fotos-pendientes");
    if (el) el.textContent = propias.length + " foto" + (propias.length === 1 ? "" : "s");
  });

}

/* --- Paso 5: cierre --- */

function renderPasoCierre() {

  const lineas = App.datos.lineas || [];
  const estancias = App.datos.estancias || [];
  const cerrada = visitaCerrada(App.visitaActual);

  return `

  <h2 class="paso-titulo">${cerrada ? "Actualizar el cierre" : "Cerrar la visita"}</h2>

  <div class="bloque">
    <div class="bloque-titulo">Resumen</div>
    <div class="bloque-valor">${estancias.length} estancia${estancias.length === 1 ? "" : "s"}</div>
    <div class="bloque-secundario">${lineas.length} línea${lineas.length === 1 ? "" : "s"} de producto</div>
  </div>

  <div class="bloque">
    <div class="bloque-titulo">Observaciones para la oficina</div>
    <textarea id="input-observaciones" class="textarea" placeholder="Qué ha pasado, qué queda pendiente..."></textarea>
  </div>

  <div class="cierre-botones">
    <button class="boton boton-primario boton-ancho boton-alto" data-cerrar="Realizada">✓ Realizada</button>
    <button class="boton boton-secundario boton-ancho" data-cerrar="Pendiente">Queda pendiente</button>
    <button class="boton boton-secundario boton-ancho" data-cerrar="Cancelada">Cliente ausente</button>
  </div>

  `;

}

function eventosPasoCierre() {

  document.querySelectorAll("[data-cerrar]").forEach(function (el) {
    el.addEventListener("click", function () { cerrarVisita(el.dataset.cerrar); });
  });

}

function cerrarVisita(estado) {

  const observaciones = document.getElementById("input-observaciones").value.trim();

  if (!confirm('¿Cerrar la visita como "' + estado + '"?')) return;

  BabexDB.encolarCambio("cierre", { citaId: App.visitaActual.id, estado: estado, observaciones: observaciones });

  App.visitaActual.estado = estado;
  const idx = App.visitas.findIndex(function (x) { return x.id === App.visitaActual.id; });
  if (idx !== -1) App.visitas[idx].estado = estado;
  BabexDB.guardarVisitas(App.visitas);

  BabexSync.ejecutar();

  alert("Visita guardada. Se sincronizará con la oficina en cuanto haya conexión.");

  App.pantalla = "lista";
  render();
  iniciarListaEventos();

}

/* ================================================
   FOTOS: elegir tipo + origen (cámara o galería)
================================================ */

function elegirOrigenFoto(estanciaId, lineaId) {

  abrirModalFoto(function (tipoFoto, origen) {

    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.style.display = "none";

    if (origen === "galeria") input.multiple = true;
    else input.capture = "environment";

    input.addEventListener("change", function () {
      const archivos = Array.prototype.slice.call(input.files || []);
      if (input.parentNode) input.parentNode.removeChild(input);
      archivos.forEach(function (archivo) { encolarFoto(archivo, estanciaId, lineaId, tipoFoto); });
    });

    document.body.appendChild(input);
    input.click();

  });

}

function encolarFoto(archivo, estanciaId, lineaId, tipoFoto) {

  const lector = new FileReader();

  lector.onload = function (e) {

    const base64 = String(e.target.result).split(",")[1];
    const v = App.visitaActual;

    const estancia = estanciaId ? (App.datos.estancias || []).find(function (x) { return String(x.id) === String(estanciaId); }) : null;

    const descripcion = [estancia ? estancia.nombre : "", tipoFoto || ""].filter(Boolean).join(" · ");

    BabexDB.encolarFoto({
      citaId: v.id,
      personaId: v.personaId || "",
      casoId: v.casoId || "",
      inmuebleId: v.inmuebleId || "",
      estanciaId: estanciaId || "",
      lineaId: lineaId || "",
      tipoVisita: v.tipo || "Visita",
      descripcion: descripcion,
      nombreOriginal: archivo.name,
      mimeType: archivo.type,
      base64: base64
    }).then(function () {
      actualizarBarraSync();
      BabexSync.ejecutar();
      if (App.pantalla === "parte" && App.paso === 4) eventosPasoFotos();
    });

  };

  lector.readAsDataURL(archivo);

}

/* ================================================
   MODALES SENCILLOS (sin depender de prompt()/confirm() feos)
================================================ */

function abrirModalSelector(titulo, opciones, alElegir) {

  const capa = document.createElement("div");
  capa.className = "modal-capa";
  capa.innerHTML = `
    <div class="modal">
      <h3>${escapar(titulo)}</h3>
      <div class="modal-opciones">
        ${opciones.map(function (op) { return `<button class="opcion opcion-modal" data-op="${escapar(op)}">${escapar(op)}</button>`; }).join("")}
      </div>
      <button class="boton boton-secundario boton-ancho modal-cancelar">Cancelar</button>
    </div>
  `;

  document.body.appendChild(capa);

  capa.querySelectorAll("[data-op]").forEach(function (el) {
    el.addEventListener("click", function () { document.body.removeChild(capa); alElegir(el.dataset.op); });
  });

  capa.querySelector(".modal-cancelar").addEventListener("click", function () { document.body.removeChild(capa); });

}

function abrirModalTexto(titulo, placeholder, alAceptar) {

  const capa = document.createElement("div");
  capa.className = "modal-capa";
  capa.innerHTML = `
    <div class="modal">
      <h3>${escapar(titulo)}</h3>
      <input type="text" class="modal-input" placeholder="${escapar(placeholder || "")}">
      <button class="boton boton-primario boton-ancho modal-aceptar">Aceptar</button>
      <button class="boton boton-secundario boton-ancho modal-cancelar">Cancelar</button>
    </div>
  `;

  document.body.appendChild(capa);

  const input = capa.querySelector(".modal-input");
  input.focus();

  capa.querySelector(".modal-aceptar").addEventListener("click", function () {
    const valor = input.value;
    document.body.removeChild(capa);
    alAceptar(valor);
  });

  capa.querySelector(".modal-cancelar").addEventListener("click", function () { document.body.removeChild(capa); });

}

function abrirModalFoto(alElegir) {

  const capa = document.createElement("div");
  capa.className = "modal-capa";
  capa.innerHTML = `
    <div class="modal">
      <h3>¿Qué vas a fotografiar?</h3>
      <div class="modal-opciones">
        ${TIPOS_FOTO.map(function (t) { return `<button class="opcion opcion-modal" data-tipo="${escapar(t)}">${escapar(t)}</button>`; }).join("")}
      </div>
      <div class="modal-origen">
        <button class="boton boton-secundario" data-origen="camara">📷 Cámara</button>
        <button class="boton boton-secundario" data-origen="galeria">🖼️ Galería</button>
      </div>
      <button class="boton boton-secundario boton-ancho modal-cancelar">Cancelar</button>
    </div>
  `;

  document.body.appendChild(capa);

  let tipoElegido = TIPOS_FOTO[0];

  capa.querySelectorAll("[data-tipo]").forEach(function (el) {
    el.addEventListener("click", function () {
      tipoElegido = el.dataset.tipo;
      capa.querySelectorAll("[data-tipo]").forEach(function (x) { x.classList.remove("activa"); });
      el.classList.add("activa");
    });
  });

  capa.querySelectorAll("[data-origen]").forEach(function (el) {
    el.addEventListener("click", function () {
      document.body.removeChild(capa);
      alElegir(tipoElegido, el.dataset.origen);
    });
  });

  capa.querySelector(".modal-cancelar").addEventListener("click", function () { document.body.removeChild(capa); });

}

/* ================================================
   BARRA DE SINCRONIZACIÓN
================================================ */

function actualizarBarraSync() {

  BabexSync.pendientes().then(function (n) {

    App.pendientesSync = n;

    let barra = document.getElementById("barra-sync");

    if (!barra) {
      barra = document.createElement("div");
      barra.id = "barra-sync";
      document.body.appendChild(barra);
    }

    if (!App.sesion) { barra.style.display = "none"; return; }

    barra.style.display = "flex";
    barra.className = "barra-sync " + (navigator.onLine ? "" : "barra-sync-offline");

    barra.innerHTML = navigator.onLine
      ? (n > 0 ? `<span>⏳ Sincronizando ${n} cambio${n === 1 ? "" : "s"}...</span>` : `<span>✓ Todo sincronizado</span>`)
      : `<span>📴 Sin conexión${n > 0 ? " · " + n + " pendiente" + (n === 1 ? "" : "s") : ""}</span>`;

  });

}

BabexSync.onCambioEstado(function () { actualizarBarraSync(); });
window.addEventListener("online", actualizarBarraSync);
window.addEventListener("offline", actualizarBarraSync);

/* ================================================
   ARRANQUE
================================================ */

function iniciar() {

  BabexDB.leerValor("sesion").then(function (sesion) {

    if (sesion && sesion.token) {

      App.sesion = sesion;
      BabexAPI.fijarToken(sesion.token);
      irALista();

    } else {

      App.pantalla = "login";
      render();
      iniciarLogin();

    }

  });

}

document.addEventListener("DOMContentLoaded", iniciar);
