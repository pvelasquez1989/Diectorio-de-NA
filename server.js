const express = require('express');
const path = require('path');
const fs = require('fs');
const multer = require('multer');

const app = express();
const PORT = 3000;
const EVENTS_DB_PATH = path.join(__dirname, 'events.json');
const UPLOADS_DIR = path.join(__dirname, 'Eventos');

// Asegurarse de que el directorio de subidas exista
if (!fs.existsSync(UPLOADS_DIR)) {
    fs.mkdirSync(UPLOADS_DIR);
}

// Configuración de Multer para la subida de archivos
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, UPLOADS_DIR);
    },
    filename: function (req, file, cb) {
        // Usar el nombre original del archivo para evitar duplicados si se sube la misma imagen
        cb(null, file.originalname);
    }
});
const upload = multer({ storage: storage });

// Middleware para servir archivos estáticos (HTML, CSS, JS, imágenes)
app.use(express.static(__dirname));
app.use('/Eventos', express.static(UPLOADS_DIR));

// Middleware para parsear JSON
app.use(express.json());

// --- Ruta Principal ---
// Sirve el archivo HTML principal cuando se accede a la raíz del sitio.
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'Ultimav2.html'));
});

// --- API Endpoints ---

// GET /api/events: Obtener todos los eventos
app.get('/api/events', (req, res) => {
    fs.readFile(EVENTS_DB_PATH, 'utf8', (err, data) => {
        if (err) {
            // Si el archivo no existe, devolver un array vacío
            if (err.code === 'ENOENT') {
                return res.json([]);
            }
            console.error("Error leyendo events.json:", err);
            return res.status(500).send('Error en el servidor');
        }
        res.json(JSON.parse(data));
    });
});

// POST /api/events: Añadir un nuevo evento
app.post('/api/events', upload.single('eventImage'), (req, res) => {
    const { startDate, endDate } = req.body;
    const imageSrc = `Eventos/${req.file.filename}`;

    const newEvent = {
        src: imageSrc,
        startDate: startDate || null,
        endDate: endDate || null
    };

    fs.readFile(EVENTS_DB_PATH, 'utf8', (err, data) => {
        let events = [];
        if (!err && data) {
            events = JSON.parse(data);
        }
        
        events.push(newEvent);

        fs.writeFile(EVENTS_DB_PATH, JSON.stringify(events, null, 2), (writeErr) => {
            if (writeErr) {
                console.error("Error escribiendo en events.json:", writeErr);
                return res.status(500).send('Error al guardar el evento.');
            }
            res.status(201).json(newEvent);
        });
    });
});

// DELETE /api/events: Eliminar un evento
app.delete('/api/events', (req, res) => {
    const { src } = req.body;
    if (!src) {
        return res.status(400).send('Falta la propiedad "src" para eliminar.');
    }

    fs.readFile(EVENTS_DB_PATH, 'utf8', (err, data) => {
        if (err) return res.status(500).send('Error en el servidor');
        
        let events = JSON.parse(data);
        const updatedEvents = events.filter(event => event.src !== src);

        fs.writeFile(EVENTS_DB_PATH, JSON.stringify(updatedEvents, null, 2), (writeErr) => {
            if (writeErr) return res.status(500).send('Error al actualizar la base de datos.');

            // Eliminar el archivo de imagen del servidor
            const imagePath = path.join(__dirname, src);
            fs.unlink(imagePath, (unlinkErr) => {
                if (unlinkErr) console.warn(`No se pudo eliminar el archivo ${imagePath}:`, unlinkErr);
                res.status(200).send('Evento eliminado correctamente.');
            });
        });
    });
});

app.listen(PORT, () => {
    console.log(`Servidor corriendo en http://localhost:${PORT}`);
    console.log(`Para administrar, visita http://localhost:${PORT}?admin=true`);
});