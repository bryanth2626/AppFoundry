import "dotenv/config"
import OpenAI from "openai"
import readLine from "node:readline/promises"
import { stdin as input, stdout as output } from "node:process"

const clientes = [
  { dni: "01234567", nombre: "Bryan", deuda: 120.50 },
  { dni: "23456789", nombre: "Ana", deuda: 0 },
  { dni: "34567890", nombre: "Luis", deuda: 75 }
]

function buscarCliente(dni) {
  return clientes.find((cliente) => cliente.dni === dni)
}

function consultarDeuda() {
  return { deuda: clienteActual.deuda }
}

async function pagarDeuda(terminal) {
  if (!clienteActual) return "Cliente no identificado."
  if (clienteActual.deuda <= 0) return "No tienes deuda pendiente."

  const textoMonto = (await terminal.question("Monto a pagar en soles: ")).trim()
  const monto = Number(textoMonto.replace(",", "."))
  if (!/^[0-9]+([.,][0-9]{1,2})?$/.test(textoMonto) || !Number.isFinite(monto) || monto <= 0) {
    return "Ingresa un monto positivo con hasta dos decimales."
  }
  if (monto > clienteActual.deuda) return "El monto supera la deuda."

  const confirmacion = (await terminal.question(
    `¿Confirmas el pago de S/ ${monto.toFixed(2)}? (sí/no): `
  )).trim().toLowerCase()

  if (confirmacion !== "sí" && confirmacion !== "si") return "Pago cancelado."

  clienteActual.deuda = Number((clienteActual.deuda - monto).toFixed(2))
  return `Pago registrado. Tu saldo es S/ ${clienteActual.deuda.toFixed(2)}.`
}

let openai
let ultimaRespuestaId = null

const funciones = { consultarDeuda }

const tools = [
  {
    type: "function",
    name: "consultarDeuda",
    description: "Devuelve la deuda actual del cliente identificado.",
    parameters: { type: "object", properties: {}, additionalProperties: false }
  }
]

const INSTRUCCIONES = `Eres el asistente de deudas de una tienda. Responde en español.
Si el usuario pregunta por su saldo, usa consultarDeuda.
Si el usuario quiere pagar, indícale que elija la opción 2 del menú.
Usa el resultado de las funciones para informar la deuda o el saldo en soles.`

async function preguntar(textoUsuario) {
  openai ??= new OpenAI({ timeout: 15000, maxRetries: 0 })

  let inputActual = [{ role: "user", content: textoUsuario }]

  // Limita a cinco los intercambios con el modelo por pregunta.
  for (let vuelta = 0; vuelta < 5; vuelta++) {
    const response = await openai.responses.create({
      model: process.env.FOUNDRY_DEPLOYMENT,
      instructions: INSTRUCCIONES,
      input: inputActual,
      tools,
      previous_response_id: ultimaRespuestaId ?? undefined,
      max_output_tokens: 2000,
      reasoning: { effort: "low" }
    })

    ultimaRespuestaId = response.id

    const llamadas = response.output.filter((item) => item.type === 'function_call')

    if (llamadas.length === 0) {
      return response.output_text
    }

    // Ejecuta las funciones solicitadas y devuelve sus resultados al modelo.
    inputActual = llamadas.map((llamada) => {
      const args = JSON.parse(llamada.arguments)
      console.log(`[Función] ${llamada.name}(${JSON.stringify(args)})`)

      let resultado

      try {
        resultado = funciones[llamada.name](args)
      } catch (e) {
        resultado = { error: e.message }
      }
      console.log(`[resultado] ${JSON.stringify(resultado)}`)

      return {
        type: "function_call_output",
        call_id: llamada.call_id,
        output: JSON.stringify(resultado)
      }
    })
  }

  return "No puedo completar la solicitud, intenta reformularla"
}

// 6. Identificación por DNI
const rl = readLine.createInterface({ input, output })
const dni = (await rl.question("DNI: ")).trim()

if (!/^[0-9]{8}$/.test(dni)) {
  console.log("El DNI debe tener exactamente 8 dígitos.")
  rl.close()
  process.exit(0)
}

const clienteActual = buscarCliente(dni)

if (!clienteActual) {
  console.log("Cliente no encontrado.")
  rl.close()
  process.exit(0)
}

// 7. Menú de la terminal
console.log(`Hola, ${clienteActual.nombre}.`)
console.log("1. Consultar deuda")
console.log("2. Pagar deuda")
console.log("Escribe 'salir' para terminar.")

while (true) {
  const texto = (await rl.question('Tu: ')).trim()

  if (texto.toLowerCase() === 'salir') break
  if (!texto) continue

  if (texto === "1") {
    const { deuda } = consultarDeuda()
    console.log(`Tu deuda actual es S/ ${deuda.toFixed(2)}.`)
    continue
  }

  if (texto === "2") {
    console.log(await pagarDeuda(rl))
    continue
  }

  try {
    console.log("Consultando a Foundry...")
    const respuesta = await preguntar(texto)
    console.log(`\nIA: ${respuesta}\n`)
  } catch (e) {
    console.error(e.message)
  }
}

rl.close()
