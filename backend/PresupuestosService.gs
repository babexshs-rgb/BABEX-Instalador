/*
==================================================
BABEX
Archivo : PresupuestosService.gs
Versión : 0.1.0

PRESUPUESTOS
  ID, NUMERO, PERSONA_ID, INMUEBLE_ID, CASO_ID, FECHA, ESTADO,
  MANO_OBRA, DESCUENTO, IVA, OBSERVACIONES, BASE, TOTAL

PRESUPUESTO_LINEAS
  ID, PRESUPUESTO_ID, ESTANCIA, PRODUCTO_ID, DESCRIPCION,
  CANTIDAD, PRECIO, IMPORTE
==================================================
Genera un presupuesto a partir de lo que el instalador dejó marcado
como "Propuesto" en las estancias del inmueble.

DECISIÓN IMPORTANTE: los precios se COPIAN a las líneas al generar el
presupuesto, no se leen del catálogo al mostrarlo. Un presupuesto es
una oferta con una fecha: si el proveedor sube precios la semana que
viene, lo que ofreciste al cliente no puede cambiar solo.

Todos los importes van SIN IVA salvo TOTAL, que lo incluye.
==================================================
*/
const PresupuestosService = {};

PresupuestosService.IVA_POR_DEFECTO = 21;

// Ciclo de vida completo del presupuesto: primero se decide si el
// cliente lo acepta, y a partir de ahí se sigue la instalación hasta
// cobrarla. "Rechazado" corta el ciclo antes de empezar; "Cancelada"
// lo corta a mitad de camino (ya aceptado, pero no llega a cobrarse).
PresupuestosService.ESTADOS = [
  "Borrador", "Enviado", "Aceptado", "Rechazado", "Cancelada",
  "En ejecución", "Ejecutada", "Facturada", "Cobrada"
];

// Todo lo que el Dashboard pinta en el pipeline: desde que se manda al
// cliente hasta que se cobra, más los dos finales sin cobro (Rechazado
// y Cancelada), para tener visibilidad de lo que se pierde y no solo
// de lo que avanza. El orden importa: es el orden de las columnas: el
// front (Dashboard.html) agrupa "Rechazado" y "Cancelada" en una sola
// columna visual, pero aquí se listan como estados independientes.
PresupuestosService.ESTADOS_PIPELINE = [
  "Enviado", "Aceptado", "En ejecución", "Ejecutada", "Facturada", "Cobrada",
  "Rechazado", "Cancelada"
];

PresupuestosService.CABECERAS = [
  "ID", "NUMERO", "PERSONA_ID", "INMUEBLE_ID", "CASO_ID", "FECHA", "ESTADO",
  "MANO_OBRA", "DESCUENTO", "IVA", "OBSERVACIONES", "BASE", "TOTAL"
];

PresupuestosService.CABECERAS_LINEAS = [
  "ID", "PRESUPUESTO_ID", "ESTANCIA", "PRODUCTO_ID", "DESCRIPCION",
  "CANTIDAD", "PRECIO", "IMPORTE"
];

function _presupuestosNumero(valor) {

  if (valor === "" || valor === null || valor === undefined) return 0;
  if (typeof valor === "number") return valor;

  const n = parseFloat(String(valor).replace(/\s/g, "").replace(",", "."));

  return isNaN(n) ? 0 : n;

}

PresupuestosService._hoja = function () {

  const ss = SpreadsheetApp.openById(CONFIG.DATABASE.ID);
  let sheet = ss.getSheetByName(CONFIG.DATABASE.SHEETS.PRESUPUESTOS);

  if (!sheet) {
    sheet = ss.insertSheet(CONFIG.DATABASE.SHEETS.PRESUPUESTOS);
    sheet.appendRow(PresupuestosService.CABECERAS);
    sheet.setFrozenRows(1);
  }

  return sheet;

};

PresupuestosService._hojaLineas = function () {

  const ss = SpreadsheetApp.openById(CONFIG.DATABASE.ID);
  let sheet = ss.getSheetByName(CONFIG.DATABASE.SHEETS.PRESUPUESTO_LINEAS);

  if (!sheet) {
    sheet = ss.insertSheet(CONFIG.DATABASE.SHEETS.PRESUPUESTO_LINEAS);
    sheet.appendRow(PresupuestosService.CABECERAS_LINEAS);
    sheet.setFrozenRows(1);
  }

  return sheet;

};

PresupuestosService.getAll = function () {

  const sheet = PresupuestosService._hoja();
  const values = sheet.getDataRange().getValues();

  values.shift();

  return values
    .filter(function (row) { return row[0] !== "" && row[0] !== null; })
    .map(function (row) {
      return {
        id: Number(row[0]),
        numero: String(row[1] || ""),
        personaId: row[2] !== "" ? Number(row[2]) : null,
        inmuebleId: row[3] !== "" ? Number(row[3]) : null,
        casoId: row[4] !== "" ? Number(row[4]) : null,
        fecha: row[5] ? new Date(row[5]).toISOString() : "",
        estado: String(row[6] || "Borrador"),
        manoObra: _presupuestosNumero(row[7]),
        descuento: _presupuestosNumero(row[8]),
        iva: _presupuestosNumero(row[9]),
        observaciones: String(row[10] || ""),
        base: _presupuestosNumero(row[11]),
        total: _presupuestosNumero(row[12])
      };
    });

};

PresupuestosService.getLineas = function (presupuestoId) {

  const sheet = PresupuestosService._hojaLineas();
  const values = sheet.getDataRange().getValues();

  values.shift();

  return values
    .filter(function (row) {
      return row[0] !== "" && row[0] !== null && Number(row[1]) === Number(presupuestoId);
    })
    .map(function (row) {
      return {
        id: Number(row[0]),
        presupuestoId: Number(row[1]),
        estancia: String(row[2] || ""),
        productoId: row[3] !== "" ? Number(row[3]) : null,
        descripcion: String(row[4] || ""),
        cantidad: _presupuestosNumero(row[5]),
        precio: _presupuestosNumero(row[6]),
        importe: _presupuestosNumero(row[7])
      };
    });

};

/**
 * Presupuestos en curso de instalación (Aceptado en adelante), con el
 * nombre del cliente y la dirección ya resueltos, listos para pintar
 * en el pipeline del Dashboard.
 */
PresupuestosService.getPipeline = function () {

  const personas = PersonasService.getAll();
  const inmuebles = InmueblesService.getAll();

  return PresupuestosService.getAll()
    .filter(function (p) {
      return PresupuestosService.ESTADOS_PIPELINE.indexOf(p.estado) !== -1;
    })
    .map(function (p) {

      const persona = personas.find(function (x) { return Number(x.id) === Number(p.personaId); });
      const inmueble = inmuebles.find(function (x) { return Number(x.id) === Number(p.inmuebleId); });

      return {
        id: p.id,
        numero: p.numero,
        estado: p.estado,
        fecha: p.fecha,
        total: p.total,
        cliente: persona ? (persona.nombre + " " + (persona.apellidos || "")).trim() : "Sin cliente",
        direccion: inmueble ? [inmueble.direccion, inmueble.ciudad].filter(Boolean).join(", ") : "",
        inmuebleId: p.inmuebleId
      };

    })
    .sort(function (a, b) { return (b.fecha || "").localeCompare(a.fecha || ""); });

};

PresupuestosService.getPorInmueble = function (inmuebleId) {

  return PresupuestosService.getAll().filter(function (p) {
    return Number(p.inmuebleId) === Number(inmuebleId);
  });

};

/**
 * Siguiente número: P-2026-0001. Se reinicia cada año, que es lo que
 * espera cualquier gestoría.
 */
PresupuestosService._siguienteNumero = function () {

  const anio = new Date().getFullYear();
  const prefijo = "P-" + anio + "-";

  const delAnio = PresupuestosService.getAll().filter(function (p) {
    return String(p.numero).indexOf(prefijo) === 0;
  });

  let mayor = 0;

  delAnio.forEach(function (p) {

    const n = Number(String(p.numero).replace(prefijo, ""));

    if (!isNaN(n) && n > mayor) mayor = n;

  });

  return prefijo + String(mayor + 1).padStart(4, "0");

};

/**
 * Calcula los totales de un presupuesto.
 *
 * El descuento se aplica solo al material, no a la mano de obra: es
 * lo habitual en el sector y, si no, un descuento del 20% se estaría
 * comiendo el margen del trabajo, que es donde de verdad está.
 */
PresupuestosService.calcular = function (lineas, manoObra, descuentoPorcentaje, ivaPorcentaje) {

  let material = 0;

  lineas.forEach(function (l) { material += _presupuestosNumero(l.importe); });

  const descuento = material * (_presupuestosNumero(descuentoPorcentaje) / 100);
  const base = material - descuento + _presupuestosNumero(manoObra);
  const iva = base * (_presupuestosNumero(ivaPorcentaje) / 100);

  return {
    material: Math.round(material * 100) / 100,
    descuento: Math.round(descuento * 100) / 100,
    base: Math.round(base * 100) / 100,
    iva: Math.round(iva * 100) / 100,
    total: Math.round((base + iva) * 100) / 100
  };

};

/**
 * Genera un presupuesto con todo lo que hay "Propuesto" en las
 * estancias del inmueble.
 */
PresupuestosService.generarDesdeInmueble = function (inmuebleId, opciones) {

  const config = opciones || {};

  const inmueble = InmueblesService.getAll().find(function (i) {
    return Number(i.id) === Number(inmuebleId);
  });

  if (!inmueble) return { ok: false, error: "Inmueble no encontrado." };

  const propuestos = EstanciaProductosService.getPorInmueble(inmuebleId)
    .filter(function (l) { return l.estado === "Propuesto"; });

  if (!propuestos.length) {
    return { ok: false, error: "No hay productos propuestos en este inmueble. Márcalos en las estancias antes de presupuestar." };
  }

  const catalogo = CatalogoService.getAll();

  // Se copian los precios de hoy: el presupuesto es una foto fija.
  const lineas = propuestos.map(function (l) {

    const producto = catalogo.find(function (p) { return Number(p.id) === Number(l.productoId); });
    const precio = producto ? producto.pvp : 0;
    const cantidad = _presupuestosNumero(l.cantidad);

    return {
      estancia: l.estanciaNombre || "",
      productoId: l.productoId,
      descripcion: producto ? producto.nombre : (l.productoNombre || "Producto"),
      cantidad: cantidad,
      precio: precio,
      importe: Math.round(cantidad * precio * 100) / 100
    };

  });

  const manoObra = _presupuestosNumero(config.manoObra);
  const descuento = _presupuestosNumero(config.descuento);
  const iva = config.iva !== undefined ? _presupuestosNumero(config.iva) : PresupuestosService.IVA_POR_DEFECTO;

  const totales = PresupuestosService.calcular(lineas, manoObra, descuento, iva);

  const sheet = PresupuestosService._hoja();
  const lastRow = sheet.getLastRow();
  let nuevoId = 1;

  if (lastRow > 1) {
    nuevoId = Number(sheet.getRange(lastRow, 1).getValue()) + 1;
  }

  const numero = PresupuestosService._siguienteNumero();

  sheet.appendRow([
    nuevoId,
    numero,
    inmueble.personaId || "",
    inmuebleId,
    config.casoId || "",
    new Date(),
    "Borrador",
    manoObra,
    descuento,
    iva,
    config.observaciones || "",
    totales.base,
    totales.total
  ]);

  // Líneas
  const hojaLineas = PresupuestosService._hojaLineas();
  const ultimaLinea = hojaLineas.getLastRow();
  let idLinea = 1;

  if (ultimaLinea > 1) {
    idLinea = Number(hojaLineas.getRange(ultimaLinea, 1).getValue()) + 1;
  }

  const filas = lineas.map(function (l, indice) {
    return [
      idLinea + indice,
      nuevoId,
      l.estancia,
      l.productoId || "",
      l.descripcion,
      l.cantidad,
      l.precio,
      l.importe
    ];
  });

  hojaLineas.getRange(hojaLineas.getLastRow() + 1, 1, filas.length, filas[0].length).setValues(filas);

  return { ok: true, id: nuevoId, numero: numero, totales: totales, lineas: lineas.length };

};

/**
 * Cambia el estado del presupuesto y recalcula si se han tocado la
 * mano de obra, el descuento o el IVA.
 */
PresupuestosService.actualizar = function (presupuesto) {

  const sheet = PresupuestosService._hoja();
  const values = sheet.getDataRange().getValues();

  for (let i = 1; i < values.length; i++) {

    if (Number(values[i][0]) === Number(presupuesto.id)) {

      const fila = values[i];

      function valor(campo, indice) {
        return presupuesto[campo] !== undefined ? presupuesto[campo] : fila[indice];
      }

      const manoObra = _presupuestosNumero(valor("manoObra", 7));
      const descuento = _presupuestosNumero(valor("descuento", 8));
      const iva = _presupuestosNumero(valor("iva", 9));

      const totales = PresupuestosService.calcular(
        PresupuestosService.getLineas(presupuesto.id),
        manoObra, descuento, iva
      );

      sheet.getRange(i + 1, 7, 1, 7).setValues([[
        valor("estado", 6),
        manoObra,
        descuento,
        iva,
        valor("observaciones", 10),
        totales.base,
        totales.total
      ]]);

      return { ok: true, totales: totales };

    }

  }

  return { ok: false, error: "Presupuesto no encontrado." };

};

/**
 * Genera el PDF del presupuesto y lo deja en Drive, en la carpeta del
 * cliente. Se registra además como documento, para que aparezca en su
 * ficha junto al resto.
 *
 * El PDF NO muestra el coste ni el margen: solo PVP por línea, base,
 * IVA y total.
 */
PresupuestosService.generarPdf = function (presupuestoId) {

  const p = PresupuestosService.getAll().find(function (x) {
    return Number(x.id) === Number(presupuestoId);
  });

  if (!p) return { ok: false, error: "Presupuesto no encontrado." };

  const lineas = PresupuestosService.getLineas(presupuestoId);
  const totales = PresupuestosService.calcular(lineas, p.manoObra, p.descuento, p.iva);

  const persona = PersonasService.getAll().find(function (x) {
    return Number(x.id) === Number(p.personaId);
  });

  const inmueble = InmueblesService.getAll().find(function (x) {
    return Number(x.id) === Number(p.inmuebleId);
  });

  const zona = CONFIG.ZONA_HORARIA || "Europe/Madrid";
  const fecha = Utilities.formatDate(new Date(p.fecha || new Date()), zona, "dd/MM/yyyy");

  function euros(n) {
    return Number(n).toLocaleString("es-ES", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " €";
  }

  function escapar(t) {
    return String(t == null ? "" : t).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }

  // Las líneas se agrupan por estancia: es como el cliente entiende
  // el presupuesto, recorriendo su casa.
  const porEstancia = {};

  lineas.forEach(function (l) {

    const clave = l.estancia || "Sin estancia";

    if (!porEstancia[clave]) porEstancia[clave] = [];

    porEstancia[clave].push(l);

  });

  // Las columnas llevan anchos fijos: sin ellos, una descripción larga
  // empuja las cifras y los números acaban pegados al texto.
  let html = '<html><head><meta charset="UTF-8"><style>' +
    'body{font-family:Arial,Helvetica,sans-serif;color:#243447;font-size:11px;margin:0;}' +
    '.cab{width:100%;border-bottom:3px solid #16294A;padding-bottom:14px;margin-bottom:20px;}' +
    '.cab td{vertical-align:middle;border:none;padding:0;}' +
    '.logo{width:56px;}' +
    '.marca{font-size:26px;font-weight:bold;color:#16294A;letter-spacing:.5px;padding-left:12px;}' +
    '.marca span{display:block;font-size:9px;color:#2F7BF6;font-weight:normal;letter-spacing:2.4px;padding-top:3px;}' +
    '.meta{text-align:right;font-size:11px;color:#5a6a85;}' +
    '.meta strong{display:block;font-size:17px;color:#16294A;letter-spacing:.5px;}' +
    '.datos{background:#f4f7fc;padding:14px 16px;border-left:4px solid #2F7BF6;margin-bottom:22px;}' +
    '.datos .nombre{font-size:14px;font-weight:bold;color:#16294A;padding-bottom:3px;}' +
    '.datos .dir{font-size:11px;color:#5a6a85;}' +
    'h3{font-size:11px;background:#16294A;color:#fff;padding:7px 11px;margin:18px 0 0;letter-spacing:.4px;}' +
    'table{width:100%;border-collapse:collapse;table-layout:fixed;}' +
    'th{background:#eef2f8;text-align:left;padding:6px 10px;font-size:9.5px;color:#5a6a85;' +
      'text-transform:uppercase;letter-spacing:.5px;}' +
    'td{padding:7px 10px;border-bottom:1px solid #e5eaf2;word-wrap:break-word;}' +
    '.c-desc{width:52%;}' +
    '.c-cant{width:12%;}' +
    '.c-prec{width:18%;}' +
    '.c-imp{width:18%;}' +
    '.num{text-align:right;white-space:nowrap;}' +
    '.tot{margin-top:24px;margin-left:auto;width:300px;table-layout:auto;}' +
    '.tot td{padding:7px 10px;border-bottom:1px solid #e5eaf2;}' +
    '.tot .base td{background:#f4f7fc;font-weight:bold;color:#16294A;}' +
    '.tot .final td{font-size:16px;font-weight:bold;color:#16294A;' +
      'border-top:2px solid #16294A;border-bottom:none;padding-top:10px;}' +
    '.obs{margin-top:24px;padding:13px 15px;background:#f4f7fc;border-left:4px solid #2F7BF6;font-size:11px;}' +
    '.pie{margin-top:30px;font-size:9px;color:#8b97a8;border-top:1px solid #e5eaf2;padding-top:12px;line-height:1.6;}' +
    '</style></head><body>';

  html += '<table class="cab"><tr>' +
          '<td class="logo"><img src="' + babexLogoDataUri() + '" width="54" height="54"></td>' +
          '<td class="marca">Babex<span>SMART HOME SOLUTIONS</span></td>' +
          '<td class="meta"><strong>' + escapar(p.numero) + '</strong>' + fecha + '</td>' +
          '</tr></table>';

  html += '<div class="datos">' +
          '<div class="nombre">' +
          escapar(persona ? (persona.nombre + " " + (persona.apellidos || "")).trim() : "Cliente") +
          '</div>';

  if (inmueble) {

    let dir = [inmueble.direccion, inmueble.ciudad].filter(Boolean).join(", ");

    if (inmueble.tipo) {
      dir += (dir ? " · " : "") + inmueble.tipo + (inmueble.subtipo ? " " + inmueble.subtipo : "");
    }

    html += '<div class="dir">' + escapar(dir) + '</div>';

  }

  html += '</div>';

  Object.keys(porEstancia).forEach(function (estancia) {

    html += '<h3>' + escapar(estancia) + '</h3>';
    html += '<table>' +
            '<tr>' +
            '<th class="c-desc">Descripción</th>' +
            '<th class="c-cant num">Cant.</th>' +
            '<th class="c-prec num">Precio</th>' +
            '<th class="c-imp num">Importe</th>' +
            '</tr>';

    porEstancia[estancia].forEach(function (l) {

      html += '<tr>' +
              '<td class="c-desc">' + escapar(l.descripcion) + '</td>' +
              '<td class="c-cant num">' + l.cantidad + '</td>' +
              '<td class="c-prec num">' + euros(l.precio) + '</td>' +
              '<td class="c-imp num">' + euros(l.importe) + '</td>' +
              '</tr>';

    });

    html += '</table>';

  });

  html += '<table class="tot">';
  html += '<tr><td>Material</td><td class="num">' + euros(totales.material) + '</td></tr>';

  if (totales.descuento > 0) {
    html += '<tr><td>Descuento (' + p.descuento + '%)</td><td class="num">− ' + euros(totales.descuento) + '</td></tr>';
  }

  if (p.manoObra > 0) {
    html += '<tr><td>Mano de obra e instalación</td><td class="num">' + euros(p.manoObra) + '</td></tr>';
  }

  html += '<tr class="base"><td>Base imponible</td><td class="num">' + euros(totales.base) + '</td></tr>';
  html += '<tr><td>IVA (' + p.iva + '%)</td><td class="num">' + euros(totales.iva) + '</td></tr>';
  html += '<tr class="final"><td>TOTAL</td><td class="num">' + euros(totales.total) + '</td></tr>';
  html += '</table>';

  if (p.observaciones) {
    html += '<div class="obs"><strong>Observaciones</strong><br>' + escapar(p.observaciones) + '</div>';
  }

  html += '<div class="pie">Presupuesto válido durante 30 días desde la fecha de emisión. ' +
          'Los precios no incluyen obra civil ni trabajos de albañilería salvo indicación expresa.<br>' +
          'Babex · Smart Home Solutions</div>';

  html += '</body></html>';

  const nombre = "Presupuesto_" + p.numero;

  const pdf = Utilities.newBlob(html, "text/html", nombre + ".html")
    .getAs("application/pdf")
    .setName(nombre + ".pdf");

  const nombreCliente = persona
    ? (persona.nombre + " " + (persona.apellidos || "")).trim()
    : "Sin cliente";

  const carpeta = DriveService.getCarpetaPorRuta([nombreCliente, "Presupuesto"]);
  const archivo = carpeta.createFile(pdf);

  return { ok: true, nombre: archivo.getName(), url: archivo.getUrl() };

};

/**
 * Exporta el presupuesto a hoja de cálculo.
 *
 * Se crea una hoja de Google de verdad (no un CSV) porque así se abre
 * de un clic desde Drive, mantiene el formato de moneda y se puede
 * retocar para negociar con el cliente sin romper el original.
 *
 * La hoja SÍ lleva el coste y el margen: es un documento interno, no
 * se le manda al cliente. El que se le manda es el PDF.
 */
PresupuestosService.generarHojaCalculo = function (presupuestoId) {

  const p = PresupuestosService.getAll().find(function (x) {
    return Number(x.id) === Number(presupuestoId);
  });

  if (!p) return { ok: false, error: "Presupuesto no encontrado." };

  const lineas = PresupuestosService.getLineas(presupuestoId);
  const totales = PresupuestosService.calcular(lineas, p.manoObra, p.descuento, p.iva);

  const persona = PersonasService.getAll().find(function (x) {
    return Number(x.id) === Number(p.personaId);
  });

  const inmueble = InmueblesService.getAll().find(function (x) {
    return Number(x.id) === Number(p.inmuebleId);
  });

  const catalogo = CatalogoService.getAll();

  const nombreCliente = persona
    ? (persona.nombre + " " + (persona.apellidos || "")).trim()
    : "Sin cliente";

  const nombreArchivo = "Presupuesto_" + p.numero + "_" + nombreCliente.replace(/\s+/g, "_");

  const ss = SpreadsheetApp.create(nombreArchivo);
  const hoja = ss.getActiveSheet();

  hoja.setName("Presupuesto");

  const filas = [];

  filas.push(["BABEX · Smart Home Solutions", "", "", "", "", "", ""]);
  filas.push([p.numero, "", "", "", "", "", ""]);
  filas.push(["Cliente", nombreCliente, "", "", "", "", ""]);
  filas.push(["Inmueble", inmueble ? [inmueble.direccion, inmueble.ciudad].filter(Boolean).join(", ") : "", "", "", "", "", ""]);
  filas.push(["Estado", p.estado, "", "", "", "", ""]);
  filas.push(["", "", "", "", "", "", ""]);

  filas.push(["Estancia", "Descripción", "Cantidad", "Coste ud.", "PVP ud.", "Importe", "Margen"]);

  const primeraLinea = filas.length + 1;

  lineas.forEach(function (l) {

    const producto = catalogo.find(function (x) { return Number(x.id) === Number(l.productoId); });
    const coste = producto ? producto.coste : 0;
    const margen = (l.precio - coste) * l.cantidad;

    filas.push([
      l.estancia,
      l.descripcion,
      l.cantidad,
      coste,
      l.precio,
      l.importe,
      Math.round(margen * 100) / 100
    ]);

  });

  const ultimaLinea = filas.length;

  filas.push(["", "", "", "", "", "", ""]);
  filas.push(["", "", "", "", "Material", totales.material, ""]);

  if (totales.descuento > 0) {
    filas.push(["", "", "", "", "Descuento (" + p.descuento + "%)", -totales.descuento, ""]);
  }

  if (p.manoObra > 0) {
    filas.push(["", "", "", "", "Mano de obra", p.manoObra, ""]);
  }

  filas.push(["", "", "", "", "Base imponible", totales.base, ""]);
  filas.push(["", "", "", "", "IVA (" + p.iva + "%)", totales.iva, ""]);
  filas.push(["", "", "", "", "TOTAL", totales.total, ""]);

  hoja.getRange(1, 1, filas.length, 7).setValues(filas);

  // --- Formato ---

  hoja.getRange("A1").setFontSize(15).setFontWeight("bold").setFontColor("#16294A");
  hoja.getRange("A2").setFontSize(12).setFontWeight("bold").setFontColor("#2F7BF6");
  hoja.getRange("A3:A5").setFontWeight("bold").setFontColor("#5a6a85");

  const cabecera = hoja.getRange(primeraLinea - 1, 1, 1, 7);
  cabecera.setBackground("#16294A").setFontColor("#ffffff").setFontWeight("bold");

  if (ultimaLinea >= primeraLinea) {

    hoja.getRange(primeraLinea, 4, ultimaLinea - primeraLinea + 1, 4)
        .setNumberFormat('#,##0.00 "€"');

    hoja.getRange(primeraLinea, 1, ultimaLinea - primeraLinea + 1, 7)
        .setBorder(true, true, true, true, true, true, "#e5eaf2", SpreadsheetApp.BorderStyle.SOLID);

  }

  const filaTotales = ultimaLinea + 2;
  const cuantosTotales = filas.length - filaTotales + 1;

  hoja.getRange(filaTotales, 5, cuantosTotales, 1).setFontWeight("bold");
  hoja.getRange(filaTotales, 6, cuantosTotales, 1).setNumberFormat('#,##0.00 "€"');

  hoja.getRange(filas.length, 5, 1, 2)
      .setFontSize(13).setFontWeight("bold").setFontColor("#16294A").setBackground("#f4f7fc");

  hoja.setColumnWidth(1, 150);
  hoja.setColumnWidth(2, 280);
  hoja.setColumnWidth(3, 80);
  hoja.setColumnWidth(4, 100);
  hoja.setColumnWidth(5, 110);
  hoja.setColumnWidth(6, 110);
  hoja.setColumnWidth(7, 100);

  hoja.setFrozenRows(primeraLinea - 1);

  // Se mueve a la carpeta del cliente, junto al resto de su documentación.
  const archivo = DriveApp.getFileById(ss.getId());
  const carpeta = DriveService.getCarpetaPorRuta([nombreCliente, "Presupuesto"]);

  carpeta.addFile(archivo);
  DriveApp.getRootFolder().removeFile(archivo);

  return { ok: true, nombre: nombreArchivo, url: ss.getUrl() };

};

PresupuestosService.remove = function (id) {

  const sheet = PresupuestosService._hoja();
  const values = sheet.getDataRange().getValues();

  for (let i = 1; i < values.length; i++) {

    if (Number(values[i][0]) === Number(id)) {

      sheet.deleteRow(i + 1);

      // Se borran también sus líneas: de atrás hacia delante, porque
      // al eliminar una fila las de abajo cambian de posición.
      const hojaLineas = PresupuestosService._hojaLineas();
      const filas = hojaLineas.getDataRange().getValues();

      for (let j = filas.length - 1; j >= 1; j--) {
        if (Number(filas[j][1]) === Number(id)) {
          hojaLineas.deleteRow(j + 1);
        }
      }

      return { ok: true };

    }

  }

  return { ok: false, error: "Presupuesto no encontrado." };

};
