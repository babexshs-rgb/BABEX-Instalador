# BABEX — Sistema de gestión interno

Empresa de instalación domótica premium (Home Assistant, cámaras Reolink, Shelly).

## Estructura del repositorio

- `backend/` — Archivos del proyecto de Google Apps Script (BFW): lógica de negocio
  (`*.gs`, `Api.js`, `Config.js`) y plantillas HtmlService de la app de oficina
  (`*.js.html`, `*.css.html`, `Index.html`, `Dashboard.html`, `Personas.html`).
  Se despliega con `clasp` — ver `scripts/push.bat` (pruebas) y `scripts/deploy.bat`
  (producción, consume una de las 200 versiones de despliegue disponibles).

- `pwa/` — Aplicación instalable (PWA) para el instalador en el móvil. Es una app
  SEPARADA de `backend/`, pensada para desplegarse en Vercel u otro hosting estático
  (Apps Script no permite Service Worker fiable). Habla con el mismo backend a través
  de la API pública definida en `backend/ApiExterna.gs` + `backend/SesionesService.gs`.
  Antes de desplegar, editar `pwa/js/config.js` con la URL `/exec` real del proyecto
  de Apps Script.

- `docs/` — Documentación del proyecto, incluido `docs/resumen-tecnico-babex.md`
  (resumen técnico detallado de la arquitectura y de lo trabajado más recientemente).

- `assets/` — Logo e isotipo de la marca.

- `catalogo/` — Catálogo de productos (CSV).

- `scripts/` — Scripts de despliegue vía `clasp` (`push.bat` / `deploy.bat`).

## Puesta en marcha rápida

1. Backend: copiar el contenido de `backend/` al proyecto real de Apps Script
   (o usar `clasp push` si el repo ya está vinculado con `clasp clone`), y desplegar.
2. PWA: editar `pwa/js/config.js`, luego desplegar `pwa/` como sitio estático
   (por ejemplo con la CLI de Vercel: `vercel` desde dentro de esa carpeta).

Ver `docs/resumen-tecnico-babex.md` para el detalle completo de la arquitectura.
