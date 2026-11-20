import OpenAI from "openai";
import fs from "node:fs" //File System

/* ANÁLISIS DE ARCHIVO UTILIZANDO MODELO CHATGPT 5.4-MINI */

const endpoint = "https://<TU_CUENTA>.services.ai.azure.com/openai/v1"
const deploymentName = "gpt-5.4-mini"
const apiKey = ""

const openai = new OpenAI({
  baseURL: endpoint,
  apiKey: apiKey
})

//Acceder al archivo que analizaremos
//const imagenBase64 = fs.readFileSync("factura.png").toString("base64")
const imagenBase64 = fs.readFileSync("jugando.png").toString("base64")

//const pregunta = "¿Qué dice este documento?, retorna los datos del cliente y total de la factura"
const pregunta = "¿Qué vez en la imagen? indícame cuántas personas y sus características encuentras"

//Se utiliza input:[] cuando se desea enviar además de una pregunta, un archivo
const res = await openai.responses.create({
  model: deploymentName,
  instructions: "Responde siempre en español",
  input: [
    {
      role: "user",
      content: [
        { type: "input_text", text: pregunta },
        { type: "input_image", image_url: `data:image/png;base64,${imagenBase64}` }
      ]
    }
  ]
})

console.log(res.output_text)