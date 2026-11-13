import "dotenv/config"
import express from "express"
import multer from "multer"
import path from "node:path"
import { fileURLToPath } from "node:url"
import { leerPDF, OcrError } from "./ocr.js"

//Directorio donde desplegamos frontend
//Carpeta absoluta independiente windows / linux / mac

const __dirname = path.dirname(fileURLToPath(import.meta.url))

//Puerto del servidor
const PORT = process.env.PORT || 3000

//Constante tamaño maximo de archivo PDF
const MAX_FILE_MB = Number (process.env.MAX_FILE_MB) || 4

//Validacion que garantice que tenemos las claves para AZURE

for (const nombre of ["DI_ENDPOINT", "DI_KEY"]){
  if(!process.env[nombre]){
    console.error(`Falta ${nombre}. Revisa tu archivo.env`)
    process.exit
  }
}

//Servidor
const app = express ()

//Configuracion multer (subir binarios)
const upload = multer ({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_MB * 1024 * 1024, files: 1},
  fileFilter(req, file, cb){
    if (file.mimetype === 'application/pdf'){
      return cb (null, true)
    }
    cb(new OcrError ("El archivo debe ser un PDF", 400))

  }
})
app.use(express.static(path.join(__dirname, "public")))

// Sugerencia: Colocar un "controlador", utilizar archivos "routes"
//Metodo post para recibir archivos
app.post('/api/ocr', upload.single("archivo"), async() => {
  try{
    if (!req.file) throw new OcrError("Seleccione un PDF para continuar", 400)
      res.json(await leerPDF(req.file.buffer))
  }catch(e){
    next(e)
  }
})

//Manejo de errores centralizado
app.use((error, req, res, next) =>{
  if (err instanceof multer.MulterError){
    const message =
      err.code === 'LIMIT_FILE_SIZE' 
      ?'EL PDF supera el limite permitido'
      :'No se pudo procesar el archivo'
    return res.status(400).json({ error: message})  

  }
  if(err instanceof OcrError){
    return res.status(err.status).json({ error: err.message})

  }
  console.error(err)
  res.status(500).json({
    error: 'Error interno del servidor'
  })

})
app.listen(PORT, () => {
  console.log (`Aplicacion ejecuntadose en http://localhost:${PORT}`)
})