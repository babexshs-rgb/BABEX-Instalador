# BABEX — resumen técnico de lo trabajado (para continuar con otro asistente)

## Contexto del proyecto

BABEX es una empresa de instalación domótica premium (Home Assistant, cámaras Reolink, dispositivos Shelly). Tiene un sistema de gestión interno construido sobre:

- **Backend/base de datos**: Google Apps Script + Google Sheets ("SHS_DB").
- **Frontend de oficina**: una SPA en JS vanilla, framework propio llamado **BFW** (`BFW.Router`, `BFW.App.render()`, `BFW.API.*`, `BFW.UI.*`), servida como páginas HtmlService del propio Apps Script.
- Despliegue vía `clasp`: `push.bat` sube a la URL `/dev` (pruebas, gratis/ilimitado) y `deploy.bat` sube a la URL `/exec` de producción (consume una de las 200 versiones de despliegue disponibles — usar con cuidado).

Todo lo descrito abajo son cambios hechos sobre ese mismo proyecto de Apps Script, más una aplicación nueva y separada (la PWA del instalador).

## Punto de partida de esta ronda de trabajo

El usuario probó en campo la vista móvil "Instalador" que ya existía dentro de la propia app web (HtmlService) y no resultó práctica:

- Había que ampliar continuamente la pantalla para ver los campos (controles demasiado pequeños).
- El botón de hacer foto estaba pegado al botón de "Siguiente" → pulsaciones accidentales.

De ahí surgieron dos líneas de trabajo independientes:

1. Mejoras puntuales a la app de oficina existente (búsqueda de productos, fotos por galería, pipeline en el Dashboard).
2. Una **PWA nueva y separada**, solo para el instalador en el móvil, con capacidad offline real.

---

## 1. Mejoras en la app de oficina (BFW, sigue en Apps Script)

Estos cambios son archivos que pertenecen al MISMO proyecto de Apps Script de siempre. Hay que pegarlos sustituyendo a los actuales y hacer push/deploy, igual que cualquier otro cambio en ese proyecto.

### 1.1 Instalador.js.html / Instalador.css.html (vista móvil dentro de la web app)
- Buscador en vivo al añadir un producto a una estancia (`renderBuscadorProducto()`), en vez de un desplegable largo.
- Selección de origen de foto: cámara **o** galería (antes solo cámara), con subida secuencial si son varias.
- Cada foto subida desde el móvil lleva ahora el `estanciaId` asociado.

### 1.2 DocumentosService.gs (v0.3.0)
- Nueva columna `ESTANCIA_ID` (12ª columna) en la hoja de documentos, con auto-migración de columnas si no existe.
- `fotosDeInmueble(inmuebleId)` y `asignarEstancia(id, estanciaId)` (esta última no reutiliza `update()` a propósito, para no pisar otras columnas de relación).

### 1.3 Api.js
- `apiGetInventarioInmueble` ahora también devuelve `fotos`.
- Nuevas: `apiSubirFotoEstancia` (mismo nivel de permiso que `apiInsertDocumento`, no requiere admin), `apiAsignarEstanciaFoto` (solo admin), `apiGetPipelineInstalaciones` (solo admin).

### 1.4 PresupuestosService.gs
Ciclo de vida completo de un presupuesto/instalación:
```js
PresupuestosService.ESTADOS = [
  "Borrador", "Enviado", "Aceptado", "Rechazado", "Cancelada",
  "En ejecución", "Ejecutada", "Facturada", "Cobrada"
];

// Lo que se pinta en el pipeline del Dashboard (incluye los dos estados
// "sin cobro": Rechazado y Cancelada, para dar visibilidad de lo perdido).
PresupuestosService.ESTADOS_PIPELINE = [
  "Enviado", "Aceptado", "En ejecución", "Ejecutada", "Facturada", "Cobrada",
  "Rechazado", "Cancelada"
];
```
- `getPipeline()`: devuelve los presupuestos en cualquiera de esos estados, con cliente y dirección ya resueltos.
- **Nota de diseño**: "Rechazado" = presupuesto rechazado antes de empezar la instalación. "Cancelada" = instalación que se aceptó pero se canceló a mitad de camino. Son conceptualmente distintos pero se agrupan visualmente en el Dashboard (ver más abajo).

### 1.5 Inmuebles.js.html / Inmuebles.css.html
- Galería de fotos por estancia + subida (`elegirFotoEstancia`, `_subirFotosEstancia`).
- Reasignación de fotos sin estancia asignada (`asignarFotoAEstancia`).
- Dropdown de estado del presupuesto ampliado a los 9 estados de arriba, con sus colores (`.pres-borrador`, `.pres-enviado`, `.pres-aceptado`, `.pres-rechazado`, `.pres-cancelada`, `.pres-ejecucion`, `.pres-ejecutada`, `.pres-facturada`, `.pres-cobrada`).

### 1.6 Dashboard.html
**Pipeline de instalaciones** (tablero tipo Kanban, solo visible para Admin):
```js
BFW.Dashboard.COLUMNAS_PIPELINE = [
  { titulo: "Enviado",              color: "#64748b", estados: ["Enviado"] },
  { titulo: "Aceptado",             color: "#3b82f6", estados: ["Aceptado"] },
  { titulo: "En ejecución",         color: "#f97316", estados: ["En ejecución"] },
  { titulo: "Ejecutada",            color: "#a855f7", estados: ["Ejecutada"] },
  { titulo: "Facturada",            color: "#06b6d4", estados: ["Facturada"] },
  { titulo: "Cobrada",              color: "#22c55e", estados: ["Cobrada"] },
  { titulo: "Rechazado / Cancelada", color: "#ef4444", estados: ["Rechazado", "Cancelada"] }
];
```
Cada columna filtra `presupuestos` por su lista de `estados` (la última columna agrupa dos estados en una sola tarjeta visual, con una etiqueta pequeña dentro de cada tarjeta indicando cuál de los dos es).

**Reordenación reciente del Dashboard** (aprobada por maqueta antes de tocar código):
- Columna izquierda: **Próximas citas** → **Pipeline de instalaciones** (antes el pipeline estaba al fondo de toda la página).
- Columna derecha: **Acciones rápidas** → **Actividad reciente** → **Estado del sistema** (antes el orden era Acciones rápidas / Estado del sistema, y Actividad reciente estaba en la columna izquierda).
- **Acciones rápidas**: se quitaron los botones "Agenda" (redundante, ya está en el menú lateral) y "Empresas" (poco uso). Se añadieron "Nueva Cita" (`BFW.Router.accionRapida('agenda', function(){ BFW.Agenda.nueva(); })`) y "Nuevo Inmueble" (`BFW.Router.accionRapida('inmuebles', function(){ BFW.Inmuebles.nueva(); })`), junto a las que ya había (Nueva Persona, Nuevo Caso).

---

## 2. PWA del instalador — app nueva y separada (Vercel, NO Apps Script)

### 2.1 Por qué es una app aparte
Apps Script sirve sus páginas HtmlService dentro de un iframe sandboxed (`googleusercontent.com` envuelto por `script.google.com`). Eso impide registrar un Service Worker de forma fiable, y por tanto impide instalar una PWA de verdad ("Añadir a pantalla de inicio") o que funcione sin conexión. Por eso la PWA del instalador es un sitio estático independiente, pensado para desplegarse en Vercel (o cualquier hosting estático), que habla con el MISMO backend de Apps Script a través de una API pública nueva.

### 2.2 Requisitos que fijó el usuario (vía preguntas explícitas)
- Tipo de app: **PWA instalable**, no app nativa.
- Requisito nº1: **debe funcionar sin conexión** — capturar datos en local durante la visita y sincronizar cuando haya cobertura.
- Causas de la vista móvil anterior no práctica: controles demasiado pequeños (zoom continuo) y botón de foto pegado al de "Siguiente".

### 2.3 Backend nuevo (falta pegarlo en el proyecto de Apps Script real)
Cuatro archivos nuevos/modificados, pensados como una capa fina sobre la lógica de negocio YA EXISTENTE en `Api.js` (no se duplica lógica):

- **`SesionesService.gs`** (nuevo): gestiona tokens de sesión para la API pública. Nueva hoja `SESIONES`. `crear(usuarioId, dispositivo)` genera un token con `Utilities.getUuid()`; `usuarioDeToken(token)` valida que el usuario esté activo y tenga rol `"Instalador"`; `cerrar(token)` cierra sesión. Los tokens no caducan por tiempo, solo se revocan cerrando sesión o borrando la fila.
- **`Config.js`**: añadido `SESIONES: "SESIONES"` a la config de hojas.
- **`ApiExterna.gs`** (nuevo): la API JSON pública. Un único dispatcher:
  ```js
  function _apiExternaDespachar(accion, cuerpo) {
    switch (accion) {
      case "ping": ...
      case "login": ...                 // email+password → token
      case "cerrarSesion": ...
      case "misVisitas": ...            // citas asignadas al instalador autenticado
      case "datosVisita": ...           // estancias, líneas, catálogo, fotos de una cita
      case "sincronizar": ...           // lote de cambios capturados offline
      case "subirFoto": ...             // una foto, fuera del lote (para no arrastrar payloads grandes)
    }
  }
  ```
  El login está **restringido a usuarios con rol `"Instalador"`**. `_apiExternaSincronizar` resuelve IDs temporales (`tmp:...`) creados offline dentro de un mismo lote, usando un `mapaIds` que se va rellenando a medida que cada item del lote se procesa con éxito; los que dependen de un id aún no resuelto se marcan `pendiente` y se reintentan en la siguiente ronda.
- **`Code.gs`**: `doGet(e)` gana una rama temprana para `e.parameter.accion` (permite pings/lecturas simples por GET); nuevo `doPost(e) { return _apiExternaManejar(e); }`.

**Truco de CORS importante**: las peticiones POST de la PWA a Apps Script van con `Content-Type: text/plain;charset=utf-8` aunque el cuerpo sea JSON (`JSON.stringify` en el cliente, `JSON.parse(e.postData.contents)` en el servidor). Esto convierte la petición en una "simple request" para el navegador, evitando el preflight OPTIONS que Apps Script no sabe responder. Sin este truco, la PWA no podría hablar con Apps Script desde un dominio externo (Vercel).

### 2.4 Frontend de la PWA (carpeta `pwa/`, ya generada y entregada en un .zip)

```
pwa/
  index.html          → app shell, registra el service worker
  manifest.json        → nombre, iconos, colores de marca, start_url
  sw.js                 → cachea el "armazón" de la app para que abra offline
  css/app.css           → estilos táctiles (ver 2.5)
  js/config.js          → BABEX_CONFIG.API_URL (placeholder a rellenar con la URL /exec real)
  js/db.js              → BabexDB: wrapper de IndexedDB
  js/api.js             → BabexAPI: única puerta de salida hacia el backend
  js/sync.js            → BabexSync: motor de sincronización
  js/app.js             → toda la lógica de pantallas (login, lista de visitas, detalle, parte de visita en 5 pasos, fotos, cierre)
  icons/                → icon-192.png, icon-512.png, icon-512-maskable.png
```

**IndexedDB (`BabexDB`, base `babex_instalador` v1)** — 5 almacenes:
- `sesion`: token + usuario actual.
- `visitas`: caché de las citas asignadas.
- `datosVisita`: por cada cita, sus estancias/líneas/catálogo/fotos, para poder trabajar sin conexión.
- `cola`: cola de cambios pendientes de sincronizar (todo lo que no sea una foto).
- `fotos`: cola de fotos pendientes de subir (separada de `cola` a propósito, para que un fallo subiendo una foto grande no bloquee el resto de cambios).

**`BabexSync`**: sincroniza `cola` en un único POST por lote, luego sube las fotos una a una y de forma secuencial. Se dispara solo al reconectar (`online`), al volver a primer plano (`visibilitychange`), cada 30s, o a mano. Un flag `enMarcha` evita solapes. Usa el `mapaIds` que devuelve el servidor para reescribir, antes de subirlas, las fotos que quedaron con un id temporal (`tmp:...`) de una estancia/línea creada offline.

**Patrón de reconciliación de IDs temporales**: cualquier entidad creada offline (estancia nueva, línea de producto nueva) recibe un id local `"tmp:xxxx"`. Al sincronizar, el servidor la crea de verdad y devuelve el id real; el cliente reescribe ese id en cualquier cosa que lo referenciara (incluidas fotos en cola).

### 2.5 Diseño visual — las dos quejas concretas, resueltas
1. *"Tenía que ampliar la pantalla para ver los campos"* → `<meta viewport ... maximum-scale=1, user-scalable=no>` + tipografía base a 18px + inputs a 17px (por encima del umbral de 16px que dispara el zoom automático de iOS) + controles con alto táctil mínimo de 52-60px.
2. *"El botón de foto pegado al de seguir"* → en cada paso del parte de visita, el botón de foto y el botón "Siguiente" viven en **dos franjas completamente separadas** (fondos distintos, separación visual de varios px), nunca flotando uno encima o al lado del otro.

### 2.6 Estado actual / pendiente
- El .zip de la PWA (`babex-pwa.zip`) ya se le entregó al usuario. Falta que él:
  1. Rellene `js/config.js` con la URL `/exec` real del proyecto de Apps Script (una vez pegados los 4 archivos backend de arriba y hecho deploy).
  2. Despliegue el contenido del zip en Vercel (u otro hosting estático) desde su propio terminal — el asistente ya NO ejecuta despliegues de Vercel directamente, solo da instrucciones.
  3. Pruebe login como Instalador, "Probar conexión", instalación en el móvil, y captura en modo avión para confirmar que el offline-first funciona de verdad.
- Los 4 archivos backend (`SesionesService.gs`, `ApiExterna.gs`, `Code.gs` modificado, `Config.js` modificado) **todavía no se han pegado en el proyecto real de Apps Script** — siguen solo en el entorno de trabajo de esta conversación.

---

## Nota sobre continuidad del trabajo

El usuario ha seguido desarrollando la app web (BFW) en paralelo con otro asistente (ChatGPT) por limitaciones de este entorno. Cualquier cambio hecho allí sobre archivos como `Api.js`, `PresupuestosService.gs`, `Inmuebles.js.html`, `Dashboard.html`, etc. puede haber divergido de las versiones descritas aquí — conviene diffear contra la versión real del proyecto de Apps Script antes de asumir que este resumen es el estado actual exacto.
