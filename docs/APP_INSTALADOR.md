# BABEX — App de instalador

*Propuesta de diseño · pendiente de validar*

---

## Idea

Una vista móvil pensada para **usarse con una mano y de pie**, dentro de la
misma app y la misma base de datos. Botones grandes, una decisión por pantalla,
la cámara siempre a mano.

No es el panel de oficina reducido: es otra herramienta, con solo lo que hace
falta delante del cliente.

---

## Los tres momentos

La app acompaña al inmueble a lo largo de su vida, y el parte cambia según en
qué momento estemos:

| Tipo de visita | Para qué | Qué se documenta |
|---|---|---|
| **Levantamiento** (primera visita) | Presupuestar | Estancias del inmueble y qué producto va en cada una. Fotos del estado inicial. |
| **Instalación** | Ejecutar | Qué se ha instalado realmente en cada estancia, materiales, fotos del resultado. |
| **Mantenimiento / reparación** | Posventa | Qué fallaba, qué se ha hecho, fotos. |

Las tres comparten estructura: **estancias → productos → fotos → cierre**.
Lo que cambia es si los productos son *propuestos* (levantamiento) o
*instalados* (instalación), y que en mantenimiento se parte de lo ya instalado.

---

## Datos nuevos

### Tablas nuevas

**ESTANCIAS** — las habitaciones de un inmueble. Se crean en el levantamiento
y se reutilizan en las visitas siguientes.

```
ID · INMUEBLE_ID · NOMBRE · TIPO · OBSERVACIONES · FECHA_ALTA
```

> `NOMBRE` es libre ("Salón", "Dormitorio principal"), `TIPO` sale de una lista
> configurable en Administración, igual que los tipos de caso.

**ESTANCIA_PRODUCTOS** — qué va (o ha ido) en cada estancia.

```
ID · ESTANCIA_ID · PRODUCTO · CANTIDAD · ESTADO · OBSERVACIONES · VISITA_ID
```

> `ESTADO`: `Propuesto` → `Instalado` → `Retirado`.
> Guardar el `VISITA_ID` permite saber en qué visita se propuso o se instaló.

**VISITAS** — el parte en sí. Una fila por visita realizada.

```
ID · CITA_ID · CASO_ID · INMUEBLE_ID · PERSONA_ID · TIPO ·
FECHA · INSTALADOR · ESTADO_CIERRE · OBSERVACIONES
```

> `ESTADO_CIERRE`: `Realizada` · `Incidencia` · `Cliente ausente` · `Pendiente de volver`.

### Cambios en tablas existentes

- **AGENDA** → nueva columna `INSTALADOR_ID`, para saber a quién se le asigna
  cada cita. Sin esto la app no puede mostrar "mis visitas".
- **INMUEBLES** → nuevas columnas `LATITUD` y `LONGITUD`, para abrir la
  dirección en el mapa y para que el instalador pueda fijar las coordenadas
  desde el propio móvil cuando esté allí.

### Configuración nueva (Administración)

- `ESTANCIAS_TIPOS` — Salón, Cocina, Dormitorio, Baño, Pasillo, Exterior...
- `PRODUCTOS_CATALOGO` — cámara Reolink, sensor de puerta, termostato...

Ambas con el mismo sistema de chips que ya usas para los tipos de caso.

---

## Recorrido en el móvil

```
  Mis visitas  ──►  Ficha de la visita  ──►  Parte por pasos  ──►  Cierre
   (agenda)          (cliente, mapa)          (1 · 2 · 3 · 4)
```

### 1. Mis visitas

Las citas asignadas, agrupadas en **Hoy** y **Próximas**. Cada tarjeta:

- Hora, cliente y tipo de visita
- Dirección
- Tres botones grandes: **Llamar** · **Ir** (abre Maps con las coordenadas) · **Abrir parte**

### 2. Parte por pasos

Una pantalla por paso, con "Siguiente" fijo abajo al alcance del pulgar y
guardado automático entre pasos (si se corta, no se pierde lo hecho).

1. **Confirmar** — cliente, dirección y motivo. Botón de "empezar visita" que
   registra la hora de llegada.
2. **Estancias** — añadir/editar estancias. En instalación y mantenimiento
   aparecen ya las del levantamiento.
3. **Productos por estancia** — dentro de cada estancia, qué productos y
   cuántos. En instalación se marcan como instalados los que estaban propuestos.
4. **Fotos** — desde la cámara, asociadas a la estancia o a la visita entera.
5. **Cierre** — estado final, observaciones y, si hace falta, abrir un caso
   nuevo (incidencia detectada).

### Fotos

Se suben a Drive con el mismo servicio que ya existe, en
`BABEX_Documentos/<Cliente>/<Tipo>` y quedan registradas en `DOCUMENTOS`
vinculadas a persona, caso e inmueble. El nombre se genera solo:
`Visita_<id>_<estancia>_<n>`.

> **Sobre trabajar sin cobertura**: Apps Script necesita conexión para
> cargar la página, así que una app realmente offline no es posible en este
> entorno. Lo que sí se puede es guardar el parte en el propio móvil mientras
> se rellena y subirlo al recuperar señal — pero las fotos son pesadas y
> conviene probarlo antes de prometerlo.

---

## Por dónde empezar

1. Rol `Instalador` y arranque directo en la vista móvil. **(hecho)**
2. `INSTALADOR_ID` en AGENDA + asignación desde el panel de oficina.
3. Pantalla "Mis visitas" con llamar / ir / abrir.
4. Parte por pasos, empezando por levantamiento (estancias + productos + fotos).
5. Cierre de visita y creación de incidencia.
6. Coordenadas GPS en inmuebles, capturables desde el móvil.

Cada punto es utilizable por sí solo: se puede parar en cualquiera y lo
anterior sigue sirviendo.
