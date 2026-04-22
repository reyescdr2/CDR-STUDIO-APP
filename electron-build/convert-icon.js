// convert-icon.js - Convierte icon.png a icon.ico para el exe
const pngToIcoModule = require('png-to-ico');
const pngToIco = pngToIcoModule.default || pngToIcoModule;
const fs = require('fs');
const path = require('path');

const input  = path.join(__dirname, 'icon.png');
const output = path.join(__dirname, 'icon.ico');

pngToIco(input)
    .then(buf => {
        fs.writeFileSync(output, buf);
        console.log('[CDR Build] icon.ico generado con éxito →', output);
    })
    .catch(err => {
        console.error('[CDR Build] Error al generar icon.ico:', err.message);
        process.exit(1);
    });
