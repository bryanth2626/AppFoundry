import OpenAI from "openai"; //npm install openai

/* CHAT SIMPLE UTILIZANDO MODELO CHATGPT 5.4-MINI */

//Accesos (lectura .env)
//const endpoint = "https://fsenati713752.services.ai.azure.com/api/projects/senati-proj/openai/v1/responses"
const endpoint = "https://<TU_CUENTA>.services.ai.azure.com/openai/v1"
const deploymentName = "gpt-5.4-mini"
const apiKey = ""

//Construir objeto del SDK OPENAI
const openai = new OpenAI({
  baseURL: endpoint,
  apiKey: apiKey
})

async function main(){
  //La respuesta se sirve de manera fraccionada
  //instructions      : contexto
  //input             : pregunta
  //max_output_tokens : cantidad máxima de tokens
  //text              : extensión del texto
  //reasoning         : razonamiento (tiempo)
  const runner = openai.responses.stream({
    model: deploymentName,
    instructions: "Eres un asistente útil. Responde en español de forma clara y breve",
    input: "¿Qué es SENATI?",
    max_output_tokens: 1500,
    text: { verbosity: 'low' },
    reasoning: { effort: 'low' }
  }).on("response.output_text.delta", (diff) => process.stdout.write(diff.delta))

  const result = await runner.finalResponse()
  console.log(`\n\nToken utilizados: `, result.usage)
}

main()