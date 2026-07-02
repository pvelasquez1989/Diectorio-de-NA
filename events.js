const fs = require('fs').promises;
const path = require('path');

// El path al archivo JSON. `__dirname` es el directorio de la función,
// así que subimos dos niveles para llegar a la raíz del proyecto.
const EVENTS_DB_PATH = path.resolve(__dirname, '../../events.json');

exports.handler = async (event, context) => {
    // Esta función solo manejará peticiones GET para mostrar los eventos.
    // El panel de admin que usa POST/DELETE no funcionará en Netlify con este enfoque.
    if (event.httpMethod !== 'GET') {
        return {
            statusCode: 405,
            body: 'Method Not Allowed'
        };
    }

    try {
        const data = await fs.readFile(EVENTS_DB_PATH, 'utf8');
        return {
            statusCode: 200,
            headers: { 'Content-Type': 'application/json' },
            body: data
        };
    } catch (err) {
        // Si el archivo no existe (ENOENT), es la primera vez o no hay eventos.
        // Devolvemos un array vacío, que es un comportamiento esperado.
        if (err.code === 'ENOENT') {
            return {
                statusCode: 200,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify([])
            };
        }

        // Para otros errores, los registramos y devolvemos un error 500.
        console.error("Error leyendo events.json en la función de Netlify:", err);
        return {
            statusCode: 500,
            body: 'Error interno en el servidor.'
        };
    }
};