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
    'index.html', 'app.js', 'ai-engine.js', 'style.css',
    'config.js', 'gifuct.js', 'omggif.js', 'metadata.js',
    'blacklist.js', 'expirations.js', 'registered_keys.js'
];

// ─── ARCHIVOS DE SEGURIDAD: SIEMPRE DESDE GITHUB, NUNCA LOCAL ────────────────
const SECURE_KEY_FILES = ['registered_keys.js', 'blacklist.js', 'expirations.js'];

// ─── IA MODELS ───────────────────────────────────────────────────────────────
const IA_MODEL_FILES = [
    'engine-birefnet.js', 'engine-mediapipe.js', 'engine-hf.js',
    'engine-photoroom.js', 'engine-removebg.js', 'engine-pixian.js', 'engine-clipdrop.js'
];

// ─── DIRECTORIO DE CACHÉ LOCAL ───────────────────────────────────────────────
const CACHE_DIR    = path.join(os.homedir(), 'AppData', 'Local', 'CDR-Studio', 'app');
const IA_CACHE_DIR = path.join(CACHE_DIR, 'ia-models');

// ─── NAVEGADOR INTEGRADO CDR (Sin depender de Edge ni ningún otro) ───────────
// Abre URLs externas en una ventana Electron propia (Chromium embebido)
function openInCDRBrowser(url) {
    const browserWin = new BrowserWindow({
        width: 1150,
        height: 780,
        title: `CDR Navigator — ${url}`,
        backgroundColor: '#0a0a0a',
        autoHideMenuBar: true,
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            webSecurity: true
        }
    });

    // Barra de navegación mínima
    Menu.setApplicationMenu(null);
    browserWin.setMenu(Menu.buildFromTemplate([
        {
            label: '🌐 Navegador CDR',
            submenu: [
                { label: '← Atrás',    click: () => browserWin.webContents.goBack()    },
                { label: '→ Adelante', click: () => browserWin.webContents.goForward() },
                { label: '🔄 Recargar', click: () => browserWin.reload()               },
                { type: 'separator' },
                { label: '❌ Cerrar',  click: () => browserWin.close()                 }
            ]
        }
    ]));

    browserWin.loadURL(url);

    // Links dentro del navegador CDR también se abren dentro, no en Edge
    browserWin.webContents.setWindowOpenHandler(({ url: newUrl }) => {
        openInCDRBrowser(newUrl);
        return { action: 'deny' };
    });
}

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
async function syncAppFiles() {
    console.log('[CDR Desktop] Sincronizando archivos desde GitHub...');
    const all = [
        ...APP_FILES.map(f => ({ url: `${GITHUB_RAW}/${f}`, dest: path.join(CACHE_DIR, f) })),
        ...IA_MODEL_FILES.map(f => ({ url: `${GITHUB_RAW}/ia-models/${f}`, dest: path.join(IA_CACHE_DIR, f) }))
    ];
    await Promise.allSettled(all.map(async ({ url, dest }) => {
        try {
            await downloadFile(url, dest);
            console.log(`  [✓] ${path.basename(dest)}`);
        } catch (e) {
            console.warn(`  [!] ${path.basename(dest)} — sin conexión, usando caché`);
        }
    }));
    console.log('[CDR Desktop] Sincronización completada.');
}

// ─── INYECCIÓN DE KEYS SEGURAS DESDE GITHUB ──────────────────────────────────
async function injectFreshKeys(webContents) {
    console.log('[CDR Security] Obteniendo keys desde GitHub...');
    for (const file of SECURE_KEY_FILES) {
        try {
            const script = await fetchText(`${GITHUB_RAW}/${file}`);
            await webContents.executeJavaScript(script);
            console.log(`  [✓] ${file} inyectado desde GitHub`);
        } catch (e) {
            console.warn(`  [!] ${file} — fallo de red, usando caché local`);
        }
    }
}

// ─── VENTANA PRINCIPAL ────────────────────────────────────────────────────────
let mainWindow;

async function createWindow() {
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
                { label: '🔄 Recargar',           accelerator: 'F5',  click: () => mainWindow.reload() },
                { label: '🐛 DevTools',            accelerator: 'F12', click: () => mainWindow.webContents.toggleDevTools() },
                { type: 'separator' },
                // Repositorio abre en el navegador CDR integrado (sin Edge)
                { label: '📂 Repositorio GitHub',  click: () => openInCDRBrowser(REPO_URL) },
                { type: 'separator' },
                { label: '❌ Salir',               accelerator: 'Alt+F4', click: () => app.quit() }
            ]
        }
    ]));

    // ── TODOS los links externos abren en el navegador CDR integrado ──────────
    // Sin Edge, sin Chrome externo, sin nada. Usa el Chromium de Electron.
    mainWindow.webContents.setWindowOpenHandler(({ url }) => {
        openInCDRBrowser(url);
        return { action: 'deny' };
    });

    // Interceptar también clics en <a> con target="_blank" dentro de la app
    mainWindow.webContents.on('will-navigate', (event, url) => {
        const isLocal = url.startsWith('file://');
        if (!isLocal) {
            event.preventDefault();
            openInCDRBrowser(url);
        }
    });

    // ── FASE 1: Sincronizar archivos desde GitHub ─────────────────────────────
    await syncAppFiles();

    // ── FASE 2: Cargar index.html desde caché local ───────────────────────────
    const indexPath = path.join(CACHE_DIR, 'index.html');

    if (fs.existsSync(indexPath)) {
        await mainWindow.loadFile(indexPath);
    } else {
        dialog.showErrorBox(
            'Sin conexión a internet',
            'CDR Studio necesita internet la primera vez para descargar la app.\nConéctate y vuelve a abrir el programa.'
        );
        app.quit();
        return;
    }

    // ── FASE 3: Inyectar keys frescas desde GitHub ────────────────────────────
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
