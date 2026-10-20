// Clasificador por palabras clave del personaje.
// Recibe la frase tal cual y devuelve una lista de órdenes, cada una con su sección y sus campos.

const sinAcentos = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '')
const normalizar = (s) => sinAcentos(s.toLowerCase()).replace(/\s+/g, ' ').trim()

import { extraerFecha } from './fechas.js'

// Secciones que ya existen en la app. El resto va a la bandeja con su sección sugerida.
export const SECCIONES_ACTIVAS = ['compra', 'cosas', 'arreglos', 'gastos', 'agenda', 'menu', 'receta', 'notas']

export const NOMBRES_SECCION = {
  compra: 'Súper',
  cosas: 'Cosas por comprar',
  arreglos: 'Arreglos',
  gastos: 'Gastos',
  agenda: 'Agenda',
  menu: 'Menú de la semana',
  receta: 'Recetas',
  notas: 'Tablero',
  coche: 'Coche',
  ideas: 'Baúl de ideas',
  bandeja: 'Bandeja',
}

// Productos habituales por pasillo. También sirven para reconocer "leche" sin verbo.
const PASILLOS = {
  fruta: ['manzana', 'platano', 'naranja', 'pera', 'uva', 'fresa', 'limon', 'melon', 'sandia', 'kiwi', 'aguacate', 'fruta', 'mandarina', 'melocoton'],
  verdura: ['tomate', 'lechuga', 'cebolla', 'ajo', 'patata', 'zanahoria', 'pimiento', 'calabacin', 'berenjena', 'pepino', 'espinaca', 'brocoli', 'verdura', 'champinon', 'puerro'],
  lacteos: ['leche', 'yogur', 'queso', 'mantequilla', 'nata', 'huevo', 'kefir'],
  carne: ['pollo', 'carne', 'ternera', 'cerdo', 'jamon', 'chorizo', 'pavo', 'hamburguesa', 'salchicha', 'lomo', 'bacon', 'embutido'],
  pescado: ['pescado', 'merluza', 'salmon', 'atun', 'gamba', 'langostino', 'bacalao', 'sardina', 'calamar', 'mejillon'],
  panaderia: ['pan', 'barra', 'tostada', 'galleta', 'magdalena', 'bolleria', 'cereales'],
  despensa: ['arroz', 'pasta', 'macarron', 'espagueti', 'harina', 'azucar', 'sal', 'aceite', 'vinagre', 'legumbre', 'lenteja', 'garbanzo', 'tomate frito', 'cafe', 'cacao', 'te', 'especias', 'conserva', 'mayonesa', 'ketchup'],
  bebidas: ['agua', 'cerveza', 'vino', 'refresco', 'coca cola', 'zumo', 'leche de avena'],
  congelados: ['helado', 'pizza', 'congelado', 'hielo'],
  limpieza: ['detergente', 'suavizante', 'lejia', 'friegasuelos', 'lavavajillas', 'fregona', 'bayeta', 'estropajo', 'bolsas de basura', 'papel de cocina', 'limpiacristales'],
  higiene: ['champu', 'gel', 'papel higienico', 'pasta de dientes', 'cepillo de dientes', 'desodorante', 'compresas', 'tampones', 'colonia', 'crema', 'cuchillas', 'algodon', 'pañuelos', 'panuelos'],
}

const PALABRAS = {
  compra: ['comprar', 'compra', 'compramos', 'falta', 'faltan', 'se ha acabado', 'se han acabado', 'se acabo', 'se acabaron', 'no queda', 'no quedan', 'necesitamos', 'hay que pillar', 'pillar'],
  arreglos: ['arreglar', 'arreglo', 'reparar', 'roto', 'rota', 'rotos', 'rotas', 'gotea', 'no funciona', 'no va', 'estropeado', 'estropeada', 'bombilla', 'fontanero', 'electricista', 'radiador', 'enchufe', 'grifo', 'persiana', 'cisterna', 'caldera', 'humedad', 'pintar', 'atasco', 'atascado', 'atascada', 'cambiar la', 'cambiar el', 'montar', 'colgar', 'tornillo', 'puerta', 'ventana', 'calentador', 'lavadora', 'nevera', 'horno'],
  gastos: ['he pagado', 'hemos pagado', 'pagado', 'he gastado', 'hemos gastado', 'gastado', 'gasto', 'me ha costado', 'nos ha costado', 'ha costado', 'factura', 'recibo', 'cobrado'],
  agenda: ['cumpleanos', 'cumple', 'cena con', 'comida con', 'cenar con', 'comer con', 'quedada', 'quedar con', 'quedamos', 'boda', 'bautizo', 'comunion', 'reunion', 'fiesta', 'barbacoa', 'amigos', 'cita', 'aniversario', 'escapada', 'romantic', 'san valentin', 'nosotros dos', 'plan juntos', 'cine', 'concierto', 'medico', 'dentista', 'viaje', 'evento', 'plan'],
  cosas: ['lampara', 'hdmi', 'cable', 'cargador', 'auriculares', 'altavoz', 'raton', 'teclado', 'monitor', 'pantalla', 'tele', 'television', 'portatil', 'funda', 'pilas', 'regleta', 'alargador', 'router', 'impresora', 'tinta', 'bombillas', 'sofa', 'estanteria', 'mueble', 'cortina', 'alfombra', 'cuadro', 'espejo', 'mesa', 'silla', 'cama', 'colchon', 'armario', 'sabanas', 'toalla', 'almohada', 'nordico', 'cojin', 'sarten', 'olla', 'cazo', 'cuchillo', 'vasos', 'platos', 'tupper', 'taza', 'planta', 'maceta', 'regalo', 'mochila', 'maleta', 'taladro', 'destornillador', 'herramienta', 'nevera', 'lavadora', 'horno', 'microondas', 'aspiradora', 'freidora', 'cafetera', 'tostadora', 'perchas', 'zapatero', 'decoracion', 'tiktok', 'youtube', 'amazon', 'ikea'],
  coche: ['gasolina', 'repostar', 'gasoil', 'itv', 'revision del coche', 'cambio de aceite', 'ruedas', 'neumaticos', 'lavar el coche', 'seguro del coche', 'taller'],
  menu: ['cenamos', 'comemos', 'para cenar', 'para comer', 'de cena', 'de comida', 'menu', 'cocinamos', 'hacemos de cena', 'hacemos de comer'],
  receta: ['receta', 'recetas'],
  ideas: ['algun dia', 'idea', 'seria guay', 'estaria bien', 'me gustaria', 'nos gustaria'],
  notas: ['te quiero', 'dile a', 'dile que', 'nota para', 'mensaje para', 'besos', 'te echo de menos', 'te amo', 'buenos dias', 'buenas noches', 'mi amor', 'carino'],
}

const URGENTE = ['urgente', 'urgencia', 'cuanto antes', 'ya mismo', 'hoy mismo', 'inunda', 'inundando', 'sin luz', 'sin agua', 'olor a gas', 'huele a gas', 'peligro', 'asap']

const SOLO_URGENCIA = /^(y )?(es |esto es |que es |eso es )?(muy )?(urgente|urgencia|cuanto antes|ya mismo|hoy mismo|asap)$/

const PALABRAS_CITA = ['cita', 'aniversario', 'escapada', 'romantic', 'san valentin', 'nosotros dos', 'plan juntos']
const UNA_SOLA_FRASE = ['agenda', 'menu', 'notas', 'gastos']

const ESTANCIAS = ['salon', 'cocina', 'bano', 'dormitorio', 'habitacion', 'terraza', 'garaje', 'entrada', 'pasillo', 'balcon', 'trastero', 'jardin', 'despacho']
const ESTANCIA_BONITA = { salon: 'Salón', cocina: 'Cocina', bano: 'Baño', dormitorio: 'Dormitorio', habitacion: 'Habitación', terraza: 'Terraza', garaje: 'Garaje', entrada: 'Entrada', pasillo: 'Pasillo', balcon: 'Balcón', trastero: 'Trastero', jardin: 'Jardín', despacho: 'Despacho' }

export const CATEGORIAS_GASTO = ['comida', 'hogar', 'coche', 'facturas', 'ocio', 'salud', 'ropa', 'otros']
const PALABRAS_CATEGORIA = {
  comida: ['super', 'supermercado', 'mercadona', 'lidl', 'carrefour', 'dia', 'aldi', 'alcampo', 'comida', 'compra', 'fruteria', 'carniceria', 'panaderia'],
  coche: ['gasolina', 'gasoil', 'diesel', 'repostar', 'coche', 'itv', 'taller', 'parking', 'peaje', 'neumatico'],
  facturas: ['luz', 'agua', 'gas', 'internet', 'fibra', 'movil', 'alquiler', 'hipoteca', 'comunidad', 'seguro', 'factura', 'recibo'],
  hogar: ['mueble', 'ikea', 'leroy', 'ferreteria', 'fontanero', 'electricista', 'arreglo', 'decoracion', 'sofa', 'lampara'],
  ocio: ['cine', 'restaurante', 'cena', 'bar', 'copas', 'concierto', 'viaje', 'hotel', 'netflix', 'spotify', 'regalo', 'entradas'],
  salud: ['farmacia', 'medico', 'dentista', 'fisio', 'gimnasio', 'optica'],
  ropa: ['ropa', 'zapatos', 'zapatillas', 'camiseta', 'pantalon', 'zara', 'primark'],
}

// Busca palabras enteras (o frases) dentro de un texto ya normalizado
const contiene = (texto, palabra) => new RegExp(`(^|[^a-z0-9ñ])${palabra}(s|es)?($|[^a-z0-9ñ])`).test(texto)
const cuenta = (texto, lista) => lista.filter((p) => contiene(texto, p)).length

const RE_IMPORTE = /(\d+(?:[.,]\d{1,2})?)\s*(€|euros?|eur|pavos|napos|pelas)(?![a-z])|€\s*(\d+(?:[.,]\d{1,2})?)/i

export function extraerImporte(texto) {
  const m = texto.match(RE_IMPORTE)
  if (!m) return null
  return Number((m[1] || m[3]).replace(',', '.'))
}

// El producto más largo gana: "pasta de dientes" es higiene, no despensa
function pasilloDe(n) {
  let mejor = null
  let largo = 0
  for (const [pasillo, productos] of Object.entries(PASILLOS)) {
    for (const p of productos) {
      if (p.length > largo && contiene(n, p)) { mejor = pasillo; largo = p.length }
    }
  }
  return mejor
}

const VERBOS_COMPRA = /^(oye |pues |vale |porfa |por favor )*(hay que |tenemos que |tengo que |acuerdate de |recuerda |apunta( que)? |anade |pon )?(comprar|compra|compramos|pillar|traer|coger)?\s*/i
const FINAL_COMPRA = /\s*(que (se ha|se han|no queda|no quedan)[^,]*|que falta[n]?|se ha acabado|se han acabado|se acabo|se acabaron|no queda|no quedan)$/i
const INICIO_FALTA = /^(falta[n]?|se ha acabado|se han acabado|se acabo|se acabaron|no queda[n]?|necesitamos)\s+(el |la |los |las )?/i
const ARTICULOS = /^(el |la |los |las |un |una |unos |unas |de |del )+/i
const RE_CANTIDAD = /^(\d+(?:[.,]\d+)?\s*(kg|kilos?|g|gramos|l|litros?|paquetes?|botes?|latas?|botellas?|docenas?|bolsas?|cajas?|unidades?)?(\s+de)?)\s+/i

function limpiarProducto(seg) {
  let t = seg.trim().replace(VERBOS_COMPRA, '').replace(FINAL_COMPRA, '').replace(INICIO_FALTA, '').replace(ARTICULOS, '').trim()
  let cantidad = null
  const m = t.match(RE_CANTIDAD)
  if (m) {
    cantidad = m[1].replace(/\s+de$/i, '').trim()
    t = t.slice(m[0].length).replace(ARTICULOS, '').trim()
  }
  return { producto: mayuscula(t), cantidad }
}

const QUITAR_URGENCIA = /\s*[,.]?\s*\b(es |esto es |que es )?(muy )?(urgente|urgencia|cuanto antes|ya mismo|hoy mismo|asap)\b[!.]*/gi

function limpiarTitulo(seg) {
  return mayuscula(seg.replace(QUITAR_URGENCIA, '').replace(/^(oye |pues |hay que |tenemos que |tengo que |apunta( que)? )+/i, '').trim())
}

function limpiarConcepto(seg) {
  return mayuscula(
    seg
      .replace(RE_IMPORTE, '')
      .replace(/^(he|hemos|me he|nos hemos)\s+(pagado|gastado|echado|puesto)\s*/i, '')
      .replace(/^(pagado|gastado|gasto)\s*/i, '')
      .replace(/^(en|de|del|por)\s+/i, '')
      .replace(/\s+/g, ' ')
      .trim(),
  )
}

function categoriaDe(n) {
  let mejor = 'otros'
  let max = 0
  for (const [cat, lista] of Object.entries(PALABRAS_CATEGORIA)) {
    const c = cuenta(n, lista)
    if (c > max) { max = c; mejor = cat }
  }
  return mejor
}

const mayuscula = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s)

// Parte "compra leche y huevos, y llama al fontanero" en trozos independientes
export function dividir(frase) {
  return frase
    .split(/\s*(?:(?<!\d),|,(?!\d)|[;\n]|\.\s|\by además\b|\by también\b|\btambién\b|\bademás\b|\be\b|\by\b)\s*/i)
    .map((s) => s.replace(/[.!]+$/, '').trim())
    .filter((s) => s.length > 1)
}

function puntuar(n) {
  const puntos = {}
  for (const [sec, lista] of Object.entries(PALABRAS)) puntos[sec] = cuenta(n, lista)
  // Un producto conocido cuenta como compra
  if (pasilloDe(n)) puntos.compra += 1
  // "Comprar una lámpara" es una cosa, no súper: el verbo comprar suma a cosas
  if (puntos.cosas > 0) {
    puntos.cosas += puntos.compra
    puntos.compra = pasilloDe(n) ? 1 : 0
  }
  // En un menú o una receta los alimentos son parte del plato, no de la lista
  if (puntos.menu > 0 || puntos.receta > 0) puntos.compra = 0
  // Un día con "cenamos" es menú; "cena con" ya lo cuenta la agenda
  if (puntos.menu > 0 && puntos.agenda > 0 && !/\b(con|de) [a-z]/.test(n.replace(/\b(de cena|de comida|para cenar|para comer)\b/g, ''))) puntos.agenda = 0
  // Un importe empuja con fuerza a gastos
  if (RE_IMPORTE.test(n)) puntos.gastos += 2
  return puntos
}

function ganadora(puntos) {
  const orden = Object.entries(puntos).sort((a, b) => b[1] - a[1])
  const [primera, segunda] = orden
  if (!primera || primera[1] === 0) return { seccion: null, clara: false }
  return { seccion: primera[0], clara: !segunda || primera[1] > segunda[1] }
}

function construir(seccion, seg, n) {
  const urgente = URGENTE.some((p) => contiene(n, p))
  const importe = extraerImporte(seg)
  switch (seccion) {
    case 'compra': {
      const { producto, cantidad } = limpiarProducto(seg)
      return { seccion, campos: { producto, cantidad, pasillo: pasilloDe(normalizar(producto || '')) || 'otros' } }
    }
    case 'arreglos': {
      const estancia = ESTANCIAS.find((e) => contiene(n, e))
      return { seccion, urgente, campos: { titulo: limpiarTitulo(seg), prioridad: urgente ? 'urgente' : 'normal', estancia: estancia ? ESTANCIA_BONITA[estancia] : null } }
    }
    case 'gastos':
      return { seccion, importe, campos: { importe, categoria: categoriaDe(n), concepto: limpiarConcepto(seg) || null } }
    case 'cosas': {
      const { producto } = limpiarProducto(seg)
      const enlace = (seg.match(/https?:\/\/\S+/) || [])[0] || null
      return { seccion, campos: { titulo: producto.replace(/https?:\/\/\S+/, '').trim(), enlace, precio_estimado: importe } }
    }
    case 'agenda': {
      const f = extraerFecha(seg)
      const tipo = /\bcumple/.test(n) ? 'cumpleanos' : PALABRAS_CITA.some((p) => contiene(n, p)) ? 'cita' : 'plan'
      const titulo = mayuscula((f ? f.resto : seg).replace(/^(apunta( que)?|recuerda( que)?|tenemos|hay)\s+/i, '').replace(/^((es|el|la|los|las)\s+)+/i, '').trim())
      return { seccion, conFecha: Boolean(f?.conFecha), campos: { titulo: titulo || mayuscula(seg), fecha: f?.fecha || null, hora: f?.hora || null, tipo, anual: tipo === 'cumpleanos' } }
    }
    case 'menu': {
      const f = extraerFecha(seg)
      const comida = /\b(cen|noche)/.test(n) ? 'cena' : 'comida'
      const texto = mayuscula(
        (f ? f.resto : seg)
          .replace(/\b(cenamos|comemos|cocinamos|para cenar|para comer|de cena|de comida|hacemos de cena|hacemos de comer|menu)\b/gi, '')
          .replace(/^\s*(el|la|de|y)\s+/i, '')
          .replace(/\s+/g, ' ')
          .trim(),
      )
      return { seccion, conFecha: Boolean(f?.conFecha), campos: { fecha: f?.fecha || null, comida, texto } }
    }
    case 'receta':
      return { seccion, campos: { titulo: mayuscula(seg.replace(/^(apunta |guarda |nueva )?(la )?recetas? (de |del |para )?/i, '').trim()) } }
    case 'notas':
      return { seccion, campos: { texto: mayuscula(seg.replace(/^(dile a \S+ que|dile que|nota para \S+:?|mensaje para \S+:?)\s*/i, '').trim()) } }
    default:
      return { seccion: 'bandeja', sugerida: seccion, campos: { texto: mayuscula(seg.trim()), seccion_sugerida: seccion } }
  }
}

// Decide si se puede guardar sin preguntar
function esSegura(orden, clara) {
  if (!clara) return false
  if (orden.urgente) return false
  if (orden.seccion === 'gastos') return false
  if (orden.seccion === 'compra') return Boolean(orden.campos.producto)
  if (orden.seccion === 'arreglos') return Boolean(orden.campos.titulo)
  if (orden.seccion === 'cosas') return Boolean(orden.campos.titulo)
  if (orden.seccion === 'notas') return Boolean(orden.campos.texto)
  if (orden.seccion === 'menu') return Boolean(orden.conFecha && orden.campos.texto)
  return false
}

export function clasificar(frase) {
  const trozos = dividir(frase)
  const ordenes = []
  let anterior = null
  for (const seg of trozos) {
    const n = normalizar(seg)
    // ", es urgente" suelto marca la orden anterior
    const previa = ordenes.at(-1)
    if (previa && SOLO_URGENCIA.test(n)) {
      previa.urgente = true
      previa.segura = false
      if (previa.seccion === 'arreglos') previa.campos.prioridad = 'urgente'
      continue
    }
    let { seccion, clara } = ganadora(puntuar(n))
    // Un trozo sin pistas hereda la sección del anterior ("leche y huevos")…
    if (!seccion && anterior) {
      // …salvo en agenda, menú y notas, donde es parte de la misma frase ("cena con Marta y Luis")
      if (UNA_SOLA_FRASE.includes(anterior)) {
        const unida = reconstruir(`${previa.texto} y ${seg}`, anterior)
        unida.segura = previa.segura && esSegura(unida, true)
        ordenes[ordenes.length - 1] = unida
        continue
      }
      seccion = anterior
      clara = true
    }
    if (!seccion) {
      ordenes.push({ seccion: null, segura: false, texto: seg, campos: { texto: mayuscula(seg) } })
      continue
    }
    const orden = construir(seccion, seg, n)
    orden.texto = seg
    orden.segura = esSegura(orden, clara)
    ordenes.push(orden)
    anterior = seccion
  }
  return ordenes
}

// Rellena los campos de una orden cuando el usuario la cambia de sección a mano
export function reconstruir(texto, seccion) {
  const orden = construir(seccion, texto, normalizar(texto))
  orden.texto = texto
  orden.segura = false
  return orden
}

// Para recetas: "300 g de arroz" → { producto: 'Arroz', cantidad: '300 g' }
export function parsearIngrediente(linea) {
  const { producto, cantidad } = limpiarProducto(linea.replace(/^[-•*]\s*/, ''))
  return { producto, cantidad }
}

export const pasilloPara = (producto) => pasilloDe(normalizar(producto || '')) || 'otros'
export const mismoProducto = (a, b) => normalizar(a).replace(/s$/, '') === normalizar(b).replace(/s$/, '')
