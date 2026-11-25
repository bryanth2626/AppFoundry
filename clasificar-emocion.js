import "dotenv/config";
import OpenAI from "openai";
import readLine from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";

const CONFIG = {
  endpoint: "https://senati1570547.services.ai.azure.com/openai/v1",
  apiKey: process.env.AZURE_OPENAI_API_KEY,
  deploymentName: "gpt-5.4-mini",
};

const openai = new OpenAI({
  baseURL: CONFIG.endpoint,
  apiKey: CONFIG.apiKey,
});

// Leer un mensaje de la terminal.
const rl = readLine.createInterface({ input, output });
console.log('Escribe "salir" para terminar.');

while (true) {
  const mensaje = (await rl.question("Escribe un mensaje o emojis: ")).trim();
  if (mensaje.toLowerCase() === "salir") break;
  if (!mensaje) continue;

  try {
    const respuesta = await openai.responses.create({
      model: CONFIG.deploymentName,
      instructions: "Clasifica la emocion que transmite el mensaje segun el texto y los emojis",
      input: mensaje,
    });

    console.log(respuesta.output_text || "No se recibio una clasificacion.");
  } catch (error) {
    console.error("No se pudo analizar el mensaje.", error.status ?? "Revisa la conexión a Foundry.");
    process.exitCode = 1;
  }
}

rl.close();
