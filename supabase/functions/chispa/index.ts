// Función "chispa" de Supabase: entiende frases con IA (Claude) cuando las palabras clave no bastan.
// La clave de Anthropic vive solo aquí, como secreto ANTHROPIC_API_KEY. Nunca va en la app.
// Se pega tal cual en Supabase → Edge Functions → Deploy a new function → Via Editor, con el nombre "chispa".
import Anthropic from 'npm:@anthropic-ai/sdk@0.137.0'
import { createClient } from 'npm:@supabase/supabase-js@2'

const MODELO = 'claude-opus-5-5'
const MAX_POR_HORA = 60 // por persona, para que un fallo no gaste dinero sin control

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const SECCIONES = ['compra', 'cosas', 'arreglos', 'recursos', 'ideas', 'gastos', 'agenda', 'menu', 'receta', 'notas', 'bandeja']
const CATEGORIAS = ['comida', 'hogar', 'coche', 'facturas', 'ocio', 'salud', 'ropa', 'otros']

const texto = { anyOf: [{ type: 'string' }, { type: 'null' }] }
const numero = { anyOf: [{ type: 'number' }, { type: 'null' }] }
const opciones = (lista: string[]) => ({ anyOf: [{ type: 'string', enum: lista }, { type: 'null' }] })

const ESQUEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['ordenes'],
  properties: {
    ordenes: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['seccion', 'texto', 'producto', 'cantidad', 'titulo', 'urgente', 'estancia', 'importe', 'categoria', 'concepto', 'enlace', 'precio_estimado', 'fecha', 'hora', 'tipo', 'comida', 'nota', 'seccion_sugerida'],
        properties: {
          seccion: { type: 'string', enum: SECCIONES },
          texto: { type: 'string' },
          producto: texto,
          cantidad: texto,
          titulo: texto,
          urgente: { type: 'boolean' },
          estancia: texto,
          importe: numero,
          categoria: opciones(CATEGORIAS),
          concepto: texto,
          enlace: texto,
          precio_estimado: numero,
          fecha: texto,
          hora: texto,
          tipo: opciones(['plan', 'cumpleanos', 'cita', 'otro']),
          comida: opciones(['comida', 'cena']),
          nota: texto,
          seccion_sugerida: opciones(['coche', 'otros']),
        },
      },
    },
  },
}

function instrucciones(hoy: string, diaSemana: string) {
  return `Eres Chispa, la ayudante de una pareja que comparte casa. Te escriben (o dictan) frases sueltas en español y tú las conviertes en órdenes para su app de organización. No respondes con charla: solo devuelves las órdenes.

Hoy es ${diaSemana} ${hoy}. Convierte cualquier fecha relativa ("mañana", "el viernes", "el 15") a YYYY-MM-DD, siempre hoy o en el futuro. Horas en HH:MM de 24 h ("a las 9 de la noche" = 21:00).

Secciones:
- compra: productos del supermercado (comida, limpieza, higiene). Una orden por producto. producto = nombre corto con mayúscula inicial ("Leche"), cantidad si la dicen ("2 litros", "una docena").
- cosas: compras que no son del súper (lámpara, cable HDMI, regalo, ropa). titulo, enlace si hay URL, precio_estimado si lo dicen.
- arreglos: algo de casa que hay que arreglar o hacer (grifo que gotea, colgar un cuadro). titulo claro en infinitivo o descriptivo, estancia si se nombra ("Baño", "Cocina"…), urgente si lo dicen o es una avería seria (fuga de agua, sin luz).
- recursos: datos de la casa para tener a mano: medidas de muebles o huecos, contraseña del wifi, modelos y referencias. titulo = el dato completo y claro ("Sofá: 210 × 90 cm").
- ideas: reformas o mejoras de la casa para el futuro ("algún día cambiar el suelo"). titulo = la idea en infinitivo, estancia si se nombra.
- gastos: dinero ya gastado. importe en euros (número), categoria, concepto corto.
- agenda: planes, citas, cumpleaños, eventos con fecha. titulo corto sin la fecha, fecha, hora si la hay, tipo (cumpleanos para cumpleaños, cita para médico/peluquería/gestiones, plan para planes con gente, otro).
- menu: lo que van a comer o cenar un día concreto. fecha, comida ("comida" o "cena"; si no lo dicen, "cena" por la noche y "comida" en otro caso), nota = el plato.
- receta: guardar una receta para hacer. titulo = nombre del plato.
- notas: mensajes o recordatorios para la pareja ("dile que…", "no te olvides de…") sin fecha concreta. nota = el mensaje limpio, sin "dile que".
- bandeja: lo que no encaje en nada de lo anterior. nota = la frase, seccion_sugerida "coche" si va del coche, si no "otros".

Reglas:
- Una frase puede tener varias órdenes ("compra leche y apunta que el lunes cenamos pasta" = compra + menu).
- texto = el trozo de la frase original que corresponde a esa orden.
- Los campos que no apliquen a la sección van a null (urgente a false).
- No inventes datos: si no dicen importe o fecha, déjalo en null.`
}

const usos = new Map<string, number[]>()
function demasiados(usuario: string) {
  const ahora = Date.now()
  const recientes = (usos.get(usuario) || []).filter((t) => ahora - t < 3600_000)
  recientes.push(ahora)
  usos.set(usuario, recientes)
  return recientes.length > MAX_POR_HORA
}

const responder = (cuerpo: unknown, estado = 200) =>
  new Response(JSON.stringify(cuerpo), { status: estado, headers: { ...CORS, 'Content-Type': 'application/json' } })

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })
  if (req.method !== 'POST') return responder({ error: 'Solo POST' }, 405)

  const clave = Deno.env.get('ANTHROPIC_API_KEY')
  if (!clave) return responder({ error: 'Falta el secreto ANTHROPIC_API_KEY' }, 500)

  // Solo gente con sesión iniciada en La Hoguera
  const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!)
  const token = (req.headers.get('Authorization') ?? '').replace(/^Bearer /, '')
  const { data: { user } } = await supabase.auth.getUser(token)
  if (!user) return responder({ error: 'Sin sesión' }, 401)
  if (demasiados(user.id)) return responder({ error: 'Demasiadas frases seguidas, espera un rato' }, 429)

  let entrada: { frase?: string; hoy?: string; dia_semana?: string }
  try { entrada = await req.json() } catch { return responder({ error: 'JSON no válido' }, 400) }
  const frase = String(entrada.frase || '').trim().slice(0, 600)
  if (!frase) return responder({ error: 'Frase vacía' }, 400)
  const hoy = /^\d{4}-\d{2}-\d{2}$/.test(entrada.hoy || '') ? entrada.hoy! : new Date().toISOString().slice(0, 10)
  const diaSemana = String(entrada.dia_semana || '').slice(0, 12)

  const anthropic = new Anthropic({ apiKey: clave })
  try {
    const respuesta = await anthropic.beta.messages.create({
      model: MODELO,
      max_tokens: 4000,
      betas: ['server-side-fallback-2026-07-01'],
      fallbacks: 'default',
      output_config: { effort: 'low', format: { type: 'json_schema', schema: ESQUEMA } },
      system: instrucciones(hoy, diaSemana),
      messages: [{ role: 'user', content: frase }],
    } as any)

    if (respuesta.stop_reason === 'refusal') return responder({ error: 'Chispa no ha querido procesar esa frase' }, 422)
    if (respuesta.stop_reason === 'max_tokens') return responder({ error: 'Frase demasiado larga' }, 422)
    const bloque = respuesta.content.find((b: { type: string }) => b.type === 'text') as { text: string } | undefined
    if (!bloque) return responder({ error: 'Respuesta vacía' }, 502)
    return responder(JSON.parse(bloque.text))
  } catch (err) {
    if (err instanceof Anthropic.AuthenticationError) return responder({ error: 'La clave de Anthropic no es válida' }, 500)
    if (err instanceof Anthropic.RateLimitError) return responder({ error: 'Anthropic va saturado, prueba en un momento' }, 429)
    if (err instanceof Anthropic.APIError) {
      const sinSaldo = /credit balance/i.test(err.message)
      return responder({ error: sinSaldo ? 'No queda saldo en la cuenta de Anthropic' : `Error de Anthropic (${err.status})` }, 502)
    }
    return responder({ error: 'Error inesperado' }, 500)
  }
})
