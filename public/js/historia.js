const formulario = document.querySelector("#chat")
const campoPregunta = document.querySelector("#pregunta")
const mensajes = document.querySelector("#mensajes")
const boton = formulario.querySelector("button")
const estado = document.querySelector("#estado")
const plantilla = document.querySelector("#plantilla-mensaje")
let respuestaAnterior

function mostrarMensaje(autor, texto, estilo) {
  const mensaje = plantilla.content.firstElementChild.cloneNode(true)
  if (estilo) mensaje.classList.add(estilo)
  mensaje.querySelector("strong").textContent = autor
  mensaje.querySelector("p").textContent = texto
  mensajes.append(mensaje)
  mensajes.scrollTop = mensajes.scrollHeight
}

async function enviarPregunta(evento) {
  evento.preventDefault()
  const pregunta = campoPregunta.value.trim()
  if (!pregunta || boton.disabled) return

  mostrarMensaje("Tú", pregunta, "mensaje-propio")
  campoPregunta.value = ""
  boton.disabled = true
  estado.textContent = "Preparando la respuesta…"

  try {
    const respuesta = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pregunta, respuestaAnterior })
    })

    const datos = await respuesta.json()
    if (!respuesta.ok) throw new Error(datos.error)

    // Solo las preguntas de historia avanzan la conversación.
    if (datos.enTema === true) respuestaAnterior = datos.id
    mostrarMensaje("Asistente", datos.texto)
  } catch (error) {
    mostrarMensaje("Error", error.message, "mensaje-error")
  } finally {
    estado.textContent = ""
    boton.disabled = false
    campoPregunta.focus()
  }
}

formulario.addEventListener("submit", enviarPregunta)
