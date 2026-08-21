# BABEX — Hoja de ruta

*Actualizada: 14 de agosto de 2026*

---

## ✅ Completado

### Módulos de oficina
- **Personas** — clientes, proveedores y colaboradores. Sus casos, citas e inmuebles se abren con un clic, y tiene un **historial** con todo lo que ha pasado con ese cliente: casos, visitas, documentos y equipamiento instalado.
- **Inmuebles** — el centro del sistema. Cada ficha reúne datos, características, estancias con su equipamiento, presupuestos y documentos.
- **Casos** — incidencias, presupuestos, instalaciones y mantenimientos.
- **Empresas** — clientes empresa y proveedores.
- **Agenda** — calendario con código de colores, instalador asignable y resumen del parte de campo.
- **Documentos** — subida a Drive con carpetas por cliente y tipo.
- **Catálogo** — productos con referencia, marca, familia, coste y PVP. Cargado con 261 referencias de Shelly.
- **Informes** — exportación a PDF y CSV de casos, agenda, personas, documentos y actividad.
- **Buscador global** — cruza personas, inmuebles, casos, empresas y documentos a la vez.
- **Administración** — listas configurables, usuarios y solicitudes de acceso.

### App de campo (instaladores)
- Rol **Instalador**: al entrar va directo a la vista de móvil, sin panel de oficina.
- **Mis visitas** — las citas asignadas, agrupadas en Hoy y Próximas, con llamar e ir por GPS.
- **Parte de visita en 5 pasos** — confirmar, estancias, productos, fotos y cierre.
- **Preguntas según el tipo de inmueble** — a un chalet se le pregunta por plantas, jardín y piscina; a un piso por planta y ascensor; a una nave por altura y muelle de carga.
- **Fotos desde cada estancia y cada producto**, con la cámara siempre a mano en un botón flotante. Se nombran solas: "Salón · Cámara Reolink · Dónde instalar".
- **Observaciones a demanda** en estancias y productos.
- Cierre de visita con tres salidas y observaciones que se añaden a las notas firmadas.

### Presupuestos
- Se generan desde el inmueble con lo que esté marcado como **Propuesto**.
- Numeración anual (`P-2026-0001`), estados y totales con mano de obra, descuento e IVA.
- **PDF para el cliente** agrupado por estancias, sin costes ni márgenes.
- **Hoja de cálculo interna** con coste y margen por línea.
- Los precios se congelan al generar.

### Acceso y seguridad
- Login propio con email y contraseña (sal + hash).
- Alta con **doble confirmación por email**: hasta que el usuario no confirma, el administrador no ve la solicitud.
- Tres roles con restricciones aplicadas **en el servidor**.
- Cambio de contraseña propio y restablecimiento desde Administración.

### Interfaz
- Barra de progreso global, avisos propios y diálogos de confirmación con el diseño de la app.
- Pantalla de bienvenida con el logotipo.
- Estado del sistema real: Drive, cuota de Gmail y base de datos.
- Historial de actividad: quién ha creado, editado o borrado qué.
- Adaptación a móvil del panel de oficina.

### Marca
- Logotipo definitivo: la casa sostenida por la señal. Versiones para fondo claro, fondo oscuro e isotipo suelto.

---

## 🔜 Corto plazo

| Tarea | Notas |
|---|---|
| **Probar con instaladores reales** | Una jornada completa de trabajo con la app en la mano. Es lo que va a destapar lo que falta. |
| **Miniaturas de las fotos** | Ahora son enlaces. Ver la foto sin abrir Drive ahorra muchos clics al revisar un parte. |
| **Presupuestos desde el caso** | Ahora solo se generan desde el inmueble. Desde un caso concreto tendría sentido para reparaciones. |
| **Diálogos de confirmación propios en el móvil** | Los `confirm()` del navegador siguen ahí en algunos sitios de la app de campo. |

## 🗓 Medio plazo

| Tarea | Notas |
|---|---|
| **Home Assistant** | Ahora figura como "No configurado" en el panel. Necesita salida a la red del cliente y decidir qué exponer. |
| **Cámaras Reolink** | Vincularlas a inmuebles y consultarlas desde la ficha. |
| **Aceptación del presupuesto por el cliente** | Un enlace donde el cliente vea el PDF y lo acepte, en vez de esperar un correo. |
| **De presupuesto aceptado a instalación** | Que al aceptar se generen las citas y el material quede en "pendiente de instalar". |
| **Control de stock** | Saber qué material hay en el almacén y qué se ha consumido en cada instalación. |
| **Firma del cliente en el parte** | Cerrar la visita con la firma en el móvil. |

## 🌅 Largo plazo

- **Portal de cliente** — que vea sus casos, citas, documentos y qué tiene instalado.
- **Facturación** — del presupuesto aceptado a la factura.
- **Mantenimientos programados** — avisar solo de las revisiones que tocan, según lo instalado en cada casa.
- **Migración de la base de datos** — Sheets funciona bien ahora; si el volumen crece habrá que plantear algo más sólido.

---

## ⚠️ Deuda técnica pendiente

- Las funciones de `BFW.API` **no llaman al callback cuando la petición falla**, solo avisan del error. Por eso la barra de carga necesita un tope de seguridad. Conviene arreglarlo en origen.
- `BFW.js.html` mezcla router, layout y todas las llamadas al servidor. Partirlo facilitaría el mantenimiento.
- Las **preguntas por tipo de inmueble están en el código**, no en Administración. Son estructurales (contadores, mínimos, máximos), pero si hay que tocarlas a menudo habría que llevarlas a configuración.
- Las **características se guardan en JSON en una celda**. Es lo correcto para datos que cambian según el tipo, pero en la hoja no son legibles ni se pueden filtrar. Si hacen falta en informes, habría que desplegarlas a columnas al exportar.
- El límite de **200 versiones** de Apps Script sigue ahí. `push.bat` para probar, `deploy.bat` solo para publicar.
- **Nunca editar los archivos con scripts de PowerShell** — corrompen tildes y emojis de forma irreversible.
- **Sin conexión no hay app.** Apps Script necesita red para cargar la página. Si aparece trabajo habitual en sitios sin cobertura, eso condiciona la tecnología y hay que hablarlo antes de seguir añadiendo funciones al móvil.
