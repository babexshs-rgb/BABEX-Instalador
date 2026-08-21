# BABEX | Proveedores
**Estado:** Documento reconstruido a partir de la conversación con ChatGPT (el archivo original con este nombre no contenía datos de proveedores)
**Fecha:** Agosto 2026

---

# 1. OBJETIVO Y CONTEXTO

Módulo dedicado a fabricantes, distribuidores y relación comercial con proveedores estratégicos de BABEX.

**Nota correctiva:** el documento `BABEX_Proveedores.txt` subido al proyecto trata en realidad de la puesta en marcha del portátil y el entorno de desarrollo (pertenece al módulo *Infraestructura de Desarrollo*). Este documento sustituye ese hueco con la información real de proveedores, recuperada de un chat de ChatGPT que inicialmente también la omitió.

---

# 2. FILOSOFÍA COMÚN ACORDADA

Independientemente del fabricante:

- Priorizar sistemas abiertos.
- Compatibilidad nativa con Home Assistant.
- Evitar dependencias innecesarias de nubes propietarias.
- Diseñar instalaciones escalables.
- Mantener interoperabilidad entre fabricantes.

---

# 3. ESTADO POR FABRICANTE

| Fabricante | Estado | Detalle |
|---|---|---|
| **Shelly** | Contacto comercial establecido (17 jul 2026) | Miguel Pedro Moncho, comercial de Shelly Spain (info@shellyspain.com). Envió catálogo + tarifa de instalador, aplicable a futuros pedidos. Ofrece asesoramiento de producto y soporte técnico especializado (programación, instalación). |
| **Sonoff** | Estratégico, sin interlocutor comercial confirmado | Interés especial en ZBMINI y dispositivos Zigbee vía integración ZHA. |
| **Reolink** | Marca principal de videovigilancia | Estrategia ya operativa (ver doc. Documentación Comercial): grabación local (microSD/NVR), gestión por el cliente, integración con HA. No aparece contacto comercial directo en esta conversación. |
| **Nabu Casa** | Suscripción activa confirmada | En uso en el laboratorio BABEX para acceso remoto seguro e integración con Alexa / servicios Cloud de Home Assistant. |

## Pendientes de explorar

Mencionados sin decisión tomada: **Tuya, Imou, Hikvision**.

---

# 4. PUNTO ATASCADO — LECCIÓN IMPORTANTE

Al pedir un resumen de consolidación de este chat, ChatGPT omitió inicialmente todo el estado de proveedores (Shelly, Sonoff, Reolink, Nabu Casa) porque se centró solo en las últimas horas de conversación (portátil + Git), perdiendo acuerdos antiguos que seguían vigentes. Gorka tuvo que corregirlo explícitamente para recuperarlos.

Esto confirma el riesgo ya detectado en el resto del proyecto: los resúmenes "por chat" sin visión acumulada pierden decisiones válidas. La consolidación debe hacerse por módulo (histórico completo), no solo sobre la última sesión.

---

# 5. PRÓXIMOS PASOS

- Confirmar recepción y catalogar la tarifa de instalador de Shelly.
- Abrir contacto comercial formal con Sonoff (hoy solo hay decisión estratégica, no interlocutor).
- Verificar si existe contacto comercial directo con Reolink o si la relación es solo de compra estándar.
- Decidir si se explora Tuya, Imou, Hikvision o se descartan del ecosistema.
- Renombrar el archivo mal etiquetado "BABEX_Proveedores.txt" a **"BABEX_Infraestructura_Desarrollo.txt"**, y sustituirlo en el proyecto por este documento.
