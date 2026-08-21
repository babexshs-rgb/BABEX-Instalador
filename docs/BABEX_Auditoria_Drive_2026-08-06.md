# BABEX | Auditoría de Google Drive — Estado real del proyecto
**Fecha:** 06/08/2026
**Alcance:** Conexión a Drive conectada por primera vez. Se ha mapeado la estructura completa y leído el código fuente relevante de BFW (App Web) y BABEX Health Monitor (Add-on).

---

# 1. HALLAZGO PRINCIPAL: ya existe un plan de reorganización, pero sin ejecutar

Antes de entrar en detalle: el 5 de agosto (ayer) creaste una carpeta `Documentacion` dentro de `BABEX` con una taxonomía numerada tipo Johnny Decimal:

```
00 - Dirección
10 - Comercial
20 - Clientes
30 - Expedientes
40 - Administración
50 - Finanzas
60 - Marketing
70 - Calidad
80 - Recursos Internos
90 - SHS Platform
99 - Archivo Histórico
```

Dentro de `00 - Dirección` hay dos documentos clave, redactados ayer mismo:

- **DOC-000 – Sistema Documental BABEX**
- **DOC-001 – Arquitectura del Ecosistema BABEX** (v0.1, Borrador): define 4 áreas (Dirección / Desarrollo / Infraestructura / Laboratorio BABEX), fija que cada proyecto software tendrá su propio repo Git (`babex-web`, `babex-health-monitor`, `babex-api`, `babex-platform`, `babex-mobile`) y que la documentación estratégica vive en Drive mientras la técnica vive en cada repo.

También existe, desde el 16 de julio, un documento de arquitectura de software mucho más ambicioso de lo que reflejan los 6 chats que ya había leído: **CORE-001 – Arquitectura del Núcleo BABEX OS**, que define BABEX no como un CRM sino como un *Business Operating System* con 5 capas (Kernel, BFW, Servicios de Negocio, Persistencia, Almacenamiento) y comunicación entre módulos por eventos.

**El problema:** este plan (DOC-001, CORE-001) es correcto y resolvería exactamente el caos que detecté en los 6 documentos de contexto, pero **no se ha ejecutado todavía**. Comprobé dos carpetas de la nueva estructura:

| Carpeta | Estado |
|---|---|
| `10 - Comercial` | Vacía |
| `80 - Recursos Internos` | Vacía |
| `00 - Dirección` | Poblada (DOC-000, DOC-001, Arquitectura/CORE-001, Normativa Corporativa/ARCH-001, DATA-001, UX-001) |
| `90 - SHS Platform` | Poblada (ver punto 3) |

No he revisado 20, 30, 40, 50, 60, 70 y 99 — dime si quieres que lo haga.

---

# 2. CAOS DE CARPETAS FUERA DE ESA ESTRUCTURA NUEVA

Al margen de `BABEX/Documentacion`, el resto del Drive tiene una dispersión real:

- **Dos contenedores raíz distintos con nombre BABEX**: `BABEX PROYECT` (nótese la errata, falta la "O") y `BABEX`. No son la misma carpeta.
- El código fuente de la app web (BFW) está **duplicado en al menos 3 sitios**: `BABEX PROYECT/BABEX/src`, `BABEX/Platform/src` + `BABEX/Platform/Backend`, y fragmentos sueltos dentro de dos carpetas distintas llamadas `RECUPERACION_BABEX` (una anidada dentro de `BABEX PROYECT/BABEX`, otra suelta en la raíz del Drive). Es la consecuencia directa de lo que comentabas en el chat de ChatGPT: sincronizaste el proyecto desde Mac y desde Windows en rutas distintas.
- Un archivo suelto en la raíz: `BABEX HEALTH MONITOR.zip` (backup antiguo sin limpiar).
- La base de datos de Inmuebles está duplicada en dos formatos con nombre inconsistente: `BABEX_DB_INMUEBLES_v1` (Google Sheet) y `BABEX_BD_INMUEBLES_v1.xlsx` ("DB" vs "BD").
- El Health Monitor también aparece dos veces: `BABEX/BABEX HEALTH MONITOR/addon/addon` (doble carpeta "addon" anidada — probablemente un error al subir) y `BABEX/Platform/babex-health-monitor/addon`, que es la copia activa (tiene cachés `.pyc` de hoy mismo, 06/08).

---

# 3. ESTADO REAL DEL CÓDIGO — App Web (BFW)

## Personas: confirmado terminado
`Personas.html` (v0.5.0) implementa CRUD completo: listado, búsqueda, filtro por tipo, formulario, alta, edición, borrado y vista de detalle. `PersonasService.gs` (backend, v0.3.0) implementa `getAll`, `insert`, `update`, `remove` contra Google Sheets. Coincide con lo documentado.

Hay datos reales en la base de datos activa (`SHS_DB/BABEX_DB_v0.3`, hoja PERSONAS): 19 registros, incluidos tú (Gorka Marcos, Fundador) y Reolink España como proveedor. La calidad de los datos es baja en varias filas de prueba (campos vacíos, teléfonos con letras) — normal en fase de pruebas, pero a limpiar antes de un uso real.

## Inmuebles: bug concreto encontrado
`BFW.js.html` (v0.3.1) solo tiene implementado `BFW.API.getInmuebles` — no existen `insertInmueble`, `updateInmueble` ni `deleteInmueble`. Esto coincide con lo documentado (CRUD pendiente).

Pero hay algo más grave que no estaba documentado: **el archivo que debería ser `InmueblesService.gs` contiene en realidad el contenido de `Code.gs`** (funciones `doGet`, `include`, `testPersonas`). No tiene ninguna función `getAll()` para Inmuebles. Si esto es fiel al proyecto real de Apps Script (y no solo un artefacto de esta copia sincronizada), **la lectura de Inmuebles está rota ahora mismo**: `apiGetInmuebles()` llamaría a un método que no existe en ese archivo. Te recomiendo abrir el editor de Apps Script directamente y comprobar el contenido real de `InmueblesService.gs` antes de seguir tocando ese módulo.

## Apps Script "oficial"
Existe un proyecto de Apps Script vivo, `BABEX v0.2 Alpha`, dentro de `90 - SHS Platform/SHS Platform`. No he podido leer su contenido con las herramientas de Drive (es un tipo de archivo Apps Script, no un archivo de texto plano), pero es probablemente la fuente de verdad real, distinta de las copias sueltas de `.gs`/`.html` que sí he podido leer.

---

# 4. ESTADO REAL DEL CÓDIGO — BABEX Health Monitor

Confirmado Sprint 1 completo: `engine.py`, `console_report.py`, `watchdog.py`, checks de CPU/Memoria/Disco/Temperatura/Uptime/Internet.

Novedad respecto a lo documentado: **la integración con Home Assistant ya está empezada**, antes de lo que indicaba el roadmap (estaba previsto para el Sprint 3). Existen `homeassistant_api.py` (clase `HomeAssistantAPI`, método `get_config()` contra `/api/config`) y `test_homeassistant.py`. Sin embargo el token sigue siendo un placeholder (`PEGA_AQUI_UN_LONG_LIVED_ACCESS_TOKEN`), así que no se ha probado todavía contra un Home Assistant real.

---

# 5. CONTEXTO NUEVO QUE NO ESTABA EN LOS 6 DOCUMENTOS

- **"SHS Platform"**: nombre de la plataforma tecnológica interna de BABEX (distinto de la marca comercial BABEX). Según `ARCH-001`, la jerarquía es: Empresa BABEX → BABEX CORE (sistema documental) → SHS Platform (plataforma tecnológica) → Aplicaciones (SHS Assistant, SHS Field, SHS Office, SHS LAB).
- Esto amplía considerablemente la ambición del proyecto respecto a lo que transmitían los 6 chats exportados (que hablaban de "app de gestión" sin más). Vale la pena que confirmes si este alcance (varias apps sobre una plataforma común) sigue siendo el objetivo real o quedó como ejercicio de arquitectura.

---

# 6. RECOMENDACIÓN ACTUALIZADA

Mi recomendación anterior (consolidar la estrategia comercial) sigue siendo válida, pero ahora hay un bloqueante más urgente y más barato de arreglar: **ya tienes el plan de reorganización escrito (DOC-001) pero las carpetas que deberían recibir esa información siguen vacías, y el propio código tiene una carpeta duplicada por 3 y un archivo con contenido cruzado**. Antes de escribir una sola línea nueva de Inmuebles, propondría:

1. Verificar en el editor de Apps Script si `InmueblesService.gs` está realmente roto o es solo un artefacto de sincronización.
2. Elegir una única carpeta como fuente de verdad del código de BFW (recomendación: `BABEX/Platform`) y borrar o archivar las otras tres copias.
3. Ejecutar el propio DOC-001: mover el contenido de los 6 chats consolidados a `10 - Comercial`, `80 - Recursos Internos`, etc.

¿Empezamos por el punto 1 (comprobar el bug de Inmuebles en Apps Script) o prefieres que primero ordene las carpetas duplicadas?
