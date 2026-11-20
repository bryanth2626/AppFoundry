/* 
El modelo utilizará funciones "locales" para poder responder
La comunicación se hará de manera bidireccional
*/
import OpenAI from "openai";
import readLine from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";


//.services.ai.azure.com/openai/v1/responses
//Accesos (.env)
const CONFIG = {
  endpoint: "https://senati1570547.services.ai.azure.com/openai/v1",
  apiKey: "process.env.OPENAI_API_KEY",
  deploymentName: "gpt-5.4-mini",
};

//Validación de CONFIG...
const openai = new OpenAI({
  baseURL: CONFIG.endpoint,
  apiKey: CONFIG.apiKey,
});

//USER > MODEL > APP >> MODEL >> USER
//Arreglo de objetos reemplazará a la BD o API REST para este ejemplo
const libros = [
  {
    titulo: "Javascript The Good Parts",
    autor: "Douglas Crockford",
    tema: "programación",
    copias: 2,
  },
  { 
    titulo: "Clean Code", 
    autor: "Robert Martin", 
    tema: "programación", 
    copias: 1 
  },
  {
    titulo: "Introducción a las bases de datos",
    autor: "C. Date",
    tema: "base de datos",
    copias: 0,
  },
  {
    titulo: "Redes de computadoras",
    autor: "Andrew Tanem",
    tema: "redes",
    copias: 3,
  },
  {
    titulo: "Inteligencia Artificial",
    autor: "Russel Norving",
    tema: "inteligencia artificial",
    copias: 1,
  },
];

//Convertir sin tildes a una con tildes
//Ejemplo: "necesito libros de <programacion>"
const normalizar = (texto) => texto.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase()

//Funciones que utilizará la IA (modelo) para responder al usuario
function buscarLibro({consulta}){
  const q = normalizar(consulta)
  const encontrados = libros.filter((libro) => 
    normalizar(`${libro.titulo} ${libro.autor} ${libro.tema}`).includes(q))

  return encontrados.length > 0 
    ? { encontrados }
    : { encontrados: [], mensaje: 'No encontramos el libro' }
}

function listarDisponibles(){
  return { disponibles: libros.filter((libro) => libro.copias > 0) }
}

function prestarLibro({titulo}){
  const q = normalizar(titulo)
  const coincidencias = libros.filter((libro) => normalizar(libro.titulo).includes(q))

  //No existe
  if (coincidencias.length === 0){
    return { exito: false, mensaje: 'No existe libro con ese título' }
  }

  //Más de un libro que coincida
  if (coincidencias.length > 1){
    return {
      exito: false,
      mensaje: 'Hay varios libros con ese nombre',
      opciones: coincidencias.map((libro) => libro.titulo)
    }
  }

  //Existe el libro pero no tenemos stock
  const libro = coincidencias[0]
  if (libro.copias === 0){
    return { 
      exito: false, 
      mensaje: `No quedas copias disponibles de: ${libro.titulo}`
    }
  }

  //En este apartado existe el libro y tenemos en stock
  libro.copias -= 1
  return {
    exito: true,
    titulo: libro.titulo,
    copiasRestantes: libro.copias
  }
}

//Colección de funciones
const funciones = { buscarLibro, listarDisponibles, prestarLibro }

//Descripción de cada función para el MODELO
//El MODELO no es capaz de visualizar las funciones (líneas arriba) tampoco sus descripciones
//consumirá la lógica de la APP desde "tools"
const tools = [
  {
    type: "function",
    name: "buscarLibro",
    description: "Busca libros por título, autor o tema y devuelve sus datos y copias disponibles",
    parameters: {
      type: "object",
      properties: {
        consulta: { type: "string", description: "Texto a buscar, por ejemplo 'javascript' o 'redes'" }
      },
      required: ["consulta"],
      additionalProperties: false
    },
    strict: true
  },
  {
    type: "function",
    name: "listarDisponibles",
    description: "Lista todos los libros que tienen al menos una copia disponible para préstamo",
    parameters: {
      type: "object",
      properties: {},
      required: [],
      additionalProperties: false
    },
    strict: true
  },
  {
    type: "function",
    name: "prestarLibro",
    description: "Registra el préstamo de un libro y descuenta una copia, Úsala solo cuando el usuario confirme que quiere llevarse el libro",
    parameters: {
      type: "object",
      properties: {
        titulo: { type: "string", description: "Título (o parte del título) del libro a prestar" }
      },
      required: ["titulo"],
      additionalProperties: false
    },
    strict: true
  }
]

//Parte del prompt
const INSTRUCCIONES = `Eres el asistente de la biblioteca de una institución educativa.
Responde siempre en español, de forma amable y breve.
Para consultar o modificar el catálogo usa SIEMPRE las funciones disponibles; no inventes libros ni cantidades
Si el usuario no ha confirmado un préstamo, pregunta antes de ejecutarlo.
`

//Ciclo de conversación
let ultimaRespuestaId = null //Permite continuar la conversación (evita reenviar el historial)

async function preguntar(textoUsuario){

  let inputActual = [{ role: "user", content: textoUsuario }]

  //Prevención: ciclo x5 (Evitar bucles infinitos)
  for (let vuelta = 0; vuelta < 5; vuelta++){
    const response = await openai.responses.create({
      model: CONFIG.deploymentName,
      instructions: INSTRUCCIONES,
      input: inputActual,
      tools,
      previous_response_id: ultimaRespuestaId ?? undefined,
      max_output_tokens: 2000,
      reasoning: { effort: "low" }
    })

    //Continuidad de la conversación
    ultimaRespuestaId = response.id

    //LLAMADAS A FUNCIÓN
    //¿El modelo solicitó ejecutar alguna función?
    const llamadas = response.output.filter((item) => item.type === 'function_call')

    //Si no solicitó ninguna, ya tiene una respuesta final
    if (llamadas.length === 0){
      return response.output_text
    }

    //Ejecutamos cada función solicitada y devolvemos el resultado al modelo
    //FUNCTION > USER > MODEL
    inputActual = llamadas.map((llamada) => {
      const args = JSON.parse(llamada.arguments)
      //Ejemplo: [Función] buscarLibro('Javascript')
      console.log(`[Función] ${llamada.name}(${JSON.stringify(args)})`)

      let resultado

      try{
        resultado = funciones[llamada.name](args)
      }catch(e){
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

//VERIFICAR LA FUNCIONALIDAD
//NodeJS permite utilizar la consola (IO)
const rl = readLine.createInterface({input, output})
console.log("Asistente de biblioteca. Escribe 'salir' para terminar")
console.log("Prueba con: ¿Qué libros tiene de programación?, 'Quiero llevarme Clean Code' ")

while(true){
  const texto = await rl.question('Tu: ') //Input de la consola

  if (texto.trim().toLowerCase() === 'salir') break;
  if (!texto.trim()) continue;

  //Interactuar con el modelo
  try{
    const respuesta = await preguntar(texto)
    console.log(`\nIA: ${respuesta}\n`)
  }catch(e){
    console.error(e.message)
  }
}

rl.close()