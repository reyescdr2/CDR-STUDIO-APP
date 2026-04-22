const { app, BrowserWindow, shell, Menu, dialog, net } = require('electron');
const path = require('path');
const fs   = require('fs');
const os   = require('os');

// ─── CONFIGURACIÓN CDR ────────────────────────────────────────────────────────
const APP_NAME   = 'CDR Studio';
const APP_VER    = '4.0.0';
const REPO_URL   = 'https://github.com/reyescdr2/CDR-STUDIO-APP';
const GITHUB_RAW = 'https://raw.githubusercontent.com/reyescdr2/CDR-STUDIO-APP/main';

// ─── ARCHIVOS QUE SE DESCARGAN LOCALMENTE (app completa) ────────────────────
const APP_FILES = [
    'index.html',
    'app.js',
    'ai-engine.js',
    'style.css',
    'config.js',
    'gifuct.js',
    'omggif.js',
    'metadata.js',
    'blacklist.js',
    'expirations.js',
    'registered_keys.js'
];

// ─── ARCHIVOS DE SEGURIDAD: SIEMPRE DESDE GITHUB, NUNCA LOCAL ────────────────
// Estos se inyectan ENCIMA de los archivos locales después de que la app carga
const SECURE_KEY_FILES = [
    'registered_keys.js',
    'blacklist.js',
    'expirations.js'
];

// ─── IA MODELS ───────────────────────────────────────────────────────────────
const IA_MODEL_FILES = [
    'engine-birefnet.js',
    'engine-mediapipe.js',
    'engine-hf.js',
    'engine-photoroom.js',
    'engine-removebg.js',
    'engine-pixian.js',
    'engine-clipdrop.js'
];

// ─── DIRECTORIO DE CACHÉ LOCAL ───────────────────────────────────────────────
const CACHE_DIR     = path.join(os.homedir(), 'AppData', 'Local', 'CDR-Studio', 'app');
const IA_CACHE_DIR  = path.join(CACHE_DIR, 'ia-models');

// ─── HELPERS DE RED ───────────────────────────────────────────────────────────
function fetchText(url) {
    return new Promise((resolve, reject) => {
        const response = net.fetch(url);
        response.then(r => {
            if (!r.ok) return reject(new Error(`HTTP ${r.status} → ${url}`));
            return r.text();
        }).then(resolve).catch(reject);
    });
}

async function downloadFile(url, dest) {
    const text = await fetchText(url);
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.writeFileSync(dest, text, 'utf8');
}

// ─── SINCRONIZACIÓN INICIAL (APP FILES) ──────────────────────────────────────
async function syncAppFiles(win) {
    console.log('[CDR Desktop] Sincronizando archivos de la app desde GitHub...');

    const tasks = APP_FILES.map(async file => {
        const dest = path.join(CACHE_DIR, file);
        try {
            await downloadFile(`${GITHUB_RAW}/${file}`, dest);
            console.log(`  [✓] ${file}`);
        } catch (e) {
            console.warn(`  [!] ${file} — sin conexión, usando caché`);
        }
    });

    const iaTasks = IA_MODEL_FILES.map(async file => {
        const dest = path.join(IA_CACHE_DIR, file);
        try {
            await downloadFile(`${GITHUB_RAW}/ia-models/${file}`, dest);
            console.log(`  [✓] ia-models/${file}`);
        } catch (e) {
            console.warn(`  [!] ia-models/${file} — sin conexión, usando caché`);
        }
    });

    await Promise.allSettled([...tasks, ...iaTasks]);
    console.log('[CDR Desktop] Sincronización completada.');
}

// ─── INYECCIÓN DE KEYS SEGURAS DESDE GITHUB ──────────────────────────────────
// Después de que la app carga, sobreescribimos las variables de keys
// con los valores FRESCOS de GitHub. Así nadie puede manipular los archivos locales.
async function injectFreshKeys(webContents) {
    console.log('[CDR Security] Obteniendo keys de seguridad desde GitHub...');
    let allOk = true;

    for (const file of SECURE_KEY_FILES) {
        try {
            const script = await fetchText(`${GITHUB_RAW}/${file}`);
            await webContents.executeJavaScript(script);
            console.log(`  [✓] ${file} inyectado desde GitHub`);
        } catch (e) {
            console.warn(`  [!] ${file} — fallo de red, usando caché local`);
            allOk = false;
        }
    }

    // Notificar al usuario si hay problemas de conexión con las keys
    if (!allOk) {
        await webContents.executeJavaScript(`
            console.warn("[CDR Security] Algunas keys se cargaron desde caché local (sin conexión). Las keys de GitHub tienen prioridad al reconectar.");
        `);
    }
}

// ─── VENTANA PRINCIPAL ────────────────────────────────────────────────────────
let mainWindow;

async function createWindow() {
    // Asegurar que el directorio de caché existe
    fs.mkdirSync(CACHE_DIR,    { recursive: true });
    fs.mkdirSync(IA_CACHE_DIR, { recursive: true });

    mainWindow = new BrowserWindow({
        width: 1280,
        height: 850,
        minWidth: 960,
        minHeight: 700,
        title: APP_NAME,
        backgroundColor: '#0a0a0a',
        autoHideMenuBar: true,
        show: false,
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            webSecurity: false,
            preload: path.join(__dirname, 'preload.js')
        }
    });

    // Menú CDR
    Menu.setApplicationMenu(Menu.buildFromTemplate([
        {
            label: '📦 CDR Studio',
            submenu: [
                { label: `Versión ${APP_VER}`, enabled: false },
                { type: 'separator' },
                { label: '🔄 Recargar',         accelerator: 'F5',  click: () => mainWindow.reload() },
                { label: '🐛 DevTools',          accelerator: 'F12', click: () => mainWindow.webContents.toggleDevTools() },
                { type: 'separator' },
                { label: '📂 Repositorio GitHub', click: () => shell.openExternal(REPO_URL) },
                { type: 'separator' },
                { label: '❌ Salir',             accelerator: 'Alt+F4', click: () => app.quit() }
            ]
        }
    ]));

    // Links externos → navegador del sistema
    mainWindow.webContents.setWindowOpenHandler(({ url }) => {
        shell.openExternal(url);
        return { action: 'deny' };
    });

    // ── FASE 1: Sincronizar archivos desde GitHub al caché local ──────────────
    await syncAppFiles(mainWindow);

    // ── FASE 2: Cargar index.html desde caché local ───────────────────────────
    const indexPath = path.join(CACHE_DIR, 'index.html');
    const indexExists = fs.existsSync(indexPath);

    if (indexExists) {
        await mainWindow.loadFile(indexPath);
    } else {
        // Si nunca se descargó (primer run sin internet)
        dialog.showErrorBox(
            'Sin conexión a internet',
            'CDR Studio necesita internet la primera vez para descargar la app.\nConéctate y vuelve a abrir el programa.'
        );
        app.quit();
        return;
    }

    // ── FASE 3: Inyectar keys FRESCAS desde GitHub (sobreescribe caché local) ─
    mainWindow.webContents.on('did-finish-load', () => {
        injectFreshKeys(mainWindow.webContents);
    });

    mainWindow.show();
    mainWindow.on('closed', () => { mainWindow = null; });
}

// ─── CICLO DE VIDA ────────────────────────────────────────────────────────────
app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
});
