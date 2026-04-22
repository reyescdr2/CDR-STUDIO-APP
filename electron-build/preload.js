// preload.js - Puente seguro entre Electron y la web app
// No expone nodeIntegration completo, solo lo mínimo necesario

const { contextBridge } = require('electron');

contextBridge.exposeInMainWorld('CDR_DESKTOP', {
    version: '4.0.0',
    platform: process.platform,
    isElectron: true
});
