# BABEX — App de gestión

Gestión interna de Babex (Smart Home Solutions), sobre Google Apps Script,
con Google Sheets como base de datos y Google Drive para los documentos.

Son **dos aplicaciones en una**: el panel de oficina y la app de campo para
instaladores. Comparten base de datos, login y servicios; lo que cambia es
la interfaz según el rol de quien entra.

---

## Flujo de trabajo diario

Hay dos scripts en la raíz. **La diferencia importa:**

| Script | Qué hace | Dónde se ve | Gasta versión |
|---|---|---|---|
| `push.bat` | Sube el código | URL `/dev` (solo tú) | No |
| `deploy.bat` | Sube el código **y publica** | URL `/exec` (todos) | **Sí** |

**Mientras desarrollas** → `push.bat` y miras el resultado en `/dev`.
**Cuando está listo para los usuarios** → `deploy.bat` una vez.

### URLs

- **Pruebas (`/dev`)** — siempre sirve el último código subido:
  `https://script.google.com/macros/s/AKfycbzVUTGtRS-SYRmdPKmyTcJ_uQcTKdNGczTauBcRVmQ7/dev`

- **Producción (`/exec`)** — la que usan los usuarios, congelada en la última versión publicada:
  `https://script.google.com/macros/s/AKfycbzBaEQPAKZnqradQsXjNNd_DZ5cPbNhykNWFBRDecPk6K5Kh0PqGHQB3dPSKRcHBQMIEg/exec`

> ⚠️ La `/dev` **no** se forma cambiando `/exec` por `/dev` en la URL de producción.
> Es la del despliegue `@HEAD`, que es otra distinta. La tienes también en el editor:
> **Implementar → Probar implementaciones**.

### Límite de 200 versiones

Apps Script permite **200 versiones por proyecto** y no se pueden borrar desde
`clasp`. Cada `deploy.bat` consume una. Si se agota:

```
Cannot create more versions: Script has reached the limit of 200 versions.
```

Se liberan borrando versiones antiguas desde el editor:
**Historial del proyecto** (icono de reloj en la barra izquierda).

---

## Codificación de archivos (importante)

**Nunca edites los archivos del proyecto con scripts de PowerShell.**

`Get-Content` / `Set-Content` leen y escriben con codificaciones distintas a UTF-8
y corrompen emojis y tildes. Los síntomas van en dos fases:

1. Primera pasada: `Administración` → `AdministraciÃ³n`, `🏠` → `ðŸ `
2. Si se "repara" dos veces: `Administración` → `Administraci?n`, `🏠` → `??`
   — **y esto ya no se puede revertir**, hay que restaurar el archivo.

Edita siempre con **VS Code** (o el editor online de Apps Script), y copia
archivos con el **Explorador de Windows**, nunca con PowerShell.

---

## Estructura

### Servidor (`.gs` / `.js`)

| Archivo | Responsabilidad |
|---|---|
| `Code.js` | `doGet` y la pantalla de confirmación de solicitudes de acceso |
| `Config.js` | ID de la hoja, nombres de pestañas y zona horaria |
| `Api.js` | Todas las funciones que el cliente puede llamar (`api*`) |
| `Logo.gs` | El isotipo en PNG base64, para los documentos que genera el servidor |
| `PasswordService.gs` | Hash y sal de contraseñas |
| `UsuariosService.gs` | Usuarios, roles y verificación de credenciales |
| `SolicitudesService.gs` | Solicitudes de acceso y sus emails |
| `DriveService.gs` | Carpetas y subida de archivos a Drive |
| `ActividadService.gs` | Registro de quién hace qué |
| `CatalogoService.gs` | Catálogo de productos con coste y PVP |
| `EstanciasService.gs` | Estancias de cada inmueble |
| `EstanciaProductosService.gs` | Qué producto hay en cada estancia y en qué estado |
| `PresupuestosService.gs` | Presupuestos, su PDF y su hoja de cálculo |
| `InformesService.gs` | Informes en PDF y CSV |
| `*Service.gs` | Un servicio por módulo (Personas, Casos, Inmuebles, Agenda, Documentos) |

### Cliente (`.html`)

| Archivo | Responsabilidad |
|---|---|
| `Index.html` | Plantilla base; **aquí se declara el orden de carga** |
| `BFW.js.html` | Núcleo: router, layout y `BFW.API` (puente con el servidor) |
| `BFW.UI.js.html` | Avisos, diálogos, barra de carga y `BFW.UI.pedir` |
| `BFW.Movil.css.html` | Adaptación a móvil del panel de oficina |
| `Auth.js.html` | Login, registro y cambio de contraseña |
| `Dashboard.html` | Panel de inicio, bienvenida y estado del sistema |
| `Instalador.js.html` | **App de campo**: visitas, parte por pasos, fotos |
| `Buscador.js.html` | Buscador global |
| `Catalogo.js.html` | Catálogo de productos |
| `Informes.js.html` | Exportación de informes |
| `<Módulo>.js.html` | Un archivo por módulo, con su `.css.html` |

> Los archivos de cliente **deben** ir envueltos en `<script>...</script>`.
> Sin esas etiquetas el código llega al navegador pero no se ejecuta.

> Si defines una función de `BFW.API` fuera de `BFW.js`, engánchale la barra de
> carga a mano: `BFW.UI.engancharCarga("nombreDeLaFuncion")`.

---

## Base de datos

Todo vive en una única hoja de cálculo. **Las pestañas nuevas se crean solas**
la primera vez que se usan: no hay que prepararlas a mano.

| Pestaña | Contenido |
|---|---|
| `PERSONAS` | Clientes, proveedores y colaboradores |
| `INMUEBLES` | Inmuebles, con coordenadas GPS, tipo/subtipo y características en JSON |
| `CASOS` | Incidencias, presupuestos, instalaciones, mantenimientos |
| `EMPRESAS` | Clientes empresa y proveedores |
| `AGENDA` | Citas, con el instalador asignado (`TECNICO_ID`) |
| `DOCUMENTOS` | Metadatos de lo subido a Drive |
| `CONFIG` | Listas configurables desde Administración |
| `USUARIOS` | Quién entra, con qué rol y su contraseña cifrada |
| `SOLICITUDES` | Peticiones de acceso pendientes de aprobar |
| `ACTIVIDAD` | Histórico de acciones (se poda a 2000 filas) |
| `CATALOGO_PRODUCTOS` | Productos con coste, PVP y familia |
| `ESTANCIAS` | Habitaciones de cada inmueble |
| `ESTANCIA_PRODUCTOS` | Qué hay en cada estancia y en qué estado |
| `PRESUPUESTOS` | Cabecera de cada presupuesto |
| `PRESUPUESTO_LINEAS` | Sus líneas, con el precio congelado |

---

## Permisos

Tres roles, en la pestaña `USUARIOS`:

- **Admin** — acceso completo, incluidos costes, márgenes y presupuestos.
- **Empleado** — puede **crear y consultar**, no editar ni eliminar.
- **Instalador** — entra directamente a la app de campo; solo ve sus visitas.

La restricción se aplica **en el servidor** (`_bloqueoSiNoAdmin` en `Api.js`),
no solo ocultando botones. Ocultarlos es cosmética.

Dos datos no salen nunca del servidor para quien no es Admin: **el coste de los
productos** y **los presupuestos**.

---

## Cómo funciona el trabajo de campo

```
Oficina                          Instalador (móvil)
───────────────────────────      ─────────────────────────────
Crea la cita y le asigna    →    La ve en "Mis visitas"
un instalador                    Llamar · Ir (GPS) · Abrir parte

                                 Parte en 5 pasos:
                                 1. Confirmar y tipo de inmueble
                                 2. Estancias
                                 3. Productos por estancia
                                 4. Fotos
                                 5. Cierre

Ve el resultado en la ficha ←    Todo queda en el inmueble
del inmueble y genera el
presupuesto con lo propuesto
```

El **inmueble es el centro**: las estancias y su equipamiento cuelgan de él, no
de una visita concreta. Así el levantamiento las crea y las instalaciones y
mantenimientos posteriores las reutilizan.

### Estados de un producto en una estancia

`Propuesto` → `Instalado` → `Retirado`

Los presupuestos se generan con lo que esté en **Propuesto**.

---

## Presupuestos

Se generan desde la ficha del inmueble con lo que haya propuesto. Dos salidas:

- **PDF** — para el cliente. Agrupado por estancias. **No lleva costes ni márgenes.**
- **Hoja de cálculo** — uso interno. **Sí lleva coste y margen por línea.**

Los precios se **copian** a las líneas al generar el presupuesto, no se leen del
catálogo al mostrarlo: una oferta con fecha no puede cambiar porque el proveedor
suba la tarifa la semana siguiente.

El descuento se aplica solo al material, no a la mano de obra.

---

## Marca

Azul marino `#16294A` · Azul señal `#2F7BF6` · Azul claro `#5C9DFF` (sobre oscuro)

El isotipo —una casa sostenida por una señal— está en tres sitios:

- `babex-logo-definitivo.svg` y su versión blanca, para web e impresión.
- Incrustado como SVG en `Auth.js.html` y `Dashboard.html`, para que se vea sin
  depender de Drive ni de permisos.
- Incrustado como PNG base64 en `Logo.gs`, para los PDF que genera el servidor
  (el conversor de Apps Script no renderiza SVG de forma fiable).

---

## Problemas conocidos y su causa

| Síntoma | Causa real |
|---|---|
| Los cambios no se ven en `/exec` | Falta `deploy.bat` |
| Los cambios no se ven en `/dev` | Estás usando la `/dev` formada a mano; usa la del despliegue `@HEAD` |
| Un usuario ve datos viejos | Su navegador tiene el JS cacheado: **Ctrl+F5** |
| `Error subiendo el documento` | La **Google Drive API** no está habilitada en el proyecto de Cloud |
| `You do not have permission to call MailApp.sendEmail` | Falta reautorizar en `myaccount.google.com/permissions` |
| Emojis y tildes rotos | Alguien editó los archivos con PowerShell |
| Una función nueva devuelve `null` al cliente | Devuelve un `Date` sin convertir; pásalo a texto con `.toISOString()` |
| Un desplegable sale vacío | Se llegó a la ficha sin pasar por el listado del módulo y sus datos no se cargaron |
| Contenido cortado dentro de una tarjeta | Falta `min-width:0` en los hijos de la rejilla CSS |

### Proyecto de Google Cloud

Vinculado a un proyecto GCP **estándar** (nº `519610143259`). Si añades algo que
use una API de Google nueva, hay que habilitarla a mano ahí:
**APIs y servicios → Biblioteca**.

No fijes `oauthScopes` en `appsscript.json`: deja que Apps Script los deduzca.
Fijarlos obliga a tener las APIs habilitadas de antemano y provoca errores de
"Permission denied while enabling APIs".
