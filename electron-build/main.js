const { app, BrowserWindow, Menu, dialog, net } = require('electron');
const path = require('path');
const fs   = require('fs');
const os   = require('os');

// ─── CONFIGURACIÓN CDR ────────────────────────────────────────────────────────
const APP_NAME   = 'CDR Studio';
const APP_VER    = '4.0.0';
const REPO_URL   = 'https://github.com/reyescdr2/CDR-STUDIO-APP';
const GITHUB_RAW = 'https://raw.githubusercontent.com/reyescdr2/CDR-STUDIO-APP/main';

// ─── ARCHIVOS DE LA APP (embebidos en el exe como semilla) ───────────────────
const APP_FILES = [
    'index.html', 'app.js', 'ai-engine.js', 'style.css',
    'config.js', 'gifuct.js', 'omggif.js', 'metadata.js',
    'blacklist.js', 'expirations.js', 'registered_keys.js'
];
const IA_MODEL_FILES = [
    'engine-birefnet.js', 'engine-mediapipe.js', 'engine-hf.js',
    'engine-photoroom.js', 'engine-removebg.js', 'engine-pixian.js', 'engine-clipdrop.js'
];
const SECURE_KEY_FILES = ['registered_keys.js', 'blacklist.js', 'expirations.js'];

// ─── DIRECTORIOS ─────────────────────────────────────────────────────────────
// Caché editable en AppData (se actualiza desde GitHub)
const CACHE_DIR    = path.join(os.homedir(), 'AppData', 'Local', 'CDR-Studio', 'app');
const IA_CACHE_DIR = path.join(CACHE_DIR, 'ia-models');

// Archivos semilla embebidos DENTRO del exe (asar)
// Se usan SIN necesidad de internet en el primer arranque
const SEED_DIR    = path.join(app.getAppPath(), 'app-src');
const IA_SEED_DIR = path.join(SEED_DIR, 'ia-models');

// ─── COPIAR SEMILLAS AL CACHÉ (primera ejecución sin internet) ───────────────
function seedCache() {
    // Solo copia si el index.html aún no existe en el caché
    if (fs.existsSync(path.join(CACHE_DIR, 'index.html'))) return;

    console.log('[CDR Desktop] Primera ejecución: instalando archivos base...');
    fs.mkdirSync(CACHE_DIR,    { recursive: true });
    fs.mkdirSync(IA_CACHE_DIR, { recursive: true });

    // Copiar archivos principales
    for (const file of APP_FILES) {
        const src  = path.join(SEED_DIR, file);
        const dest = path.join(CACHE_DIR, file);
        try {
            if (fs.existsSync(src)) { fs.copyFileSync(src, dest); console.log(`  [seed] ${file}`); }
        } catch (e) { console.warn(`  [!] No se pudo copiar semilla: ${file}`); }
    }
    // Copiar motores IA
    for (const file of IA_MODEL_FILES) {
        const src  = path.join(IA_SEED_DIR, file);
        const dest = path.join(IA_CACHE_DIR, file);
        try {
            if (fs.existsSync(src)) { fs.copyFileSync(src, dest); console.log(`  [seed] ia-models/${file}`); }
        } catch (e) { console.warn(`  [!] No se pudo copiar semilla IA: ${file}`); }
    }
    console.log('[CDR Desktop] Archivos base instalados.');
}

// ─── ACTUALIZAR DESDE GITHUB (en segundo plano, sin bloquear) ────────────────
async function syncFromGitHub() {
    console.log('[CDR Desktop] Sincronizando actualizaciones desde GitHub...');
    const tasks = [
        ...APP_FILES.map(f     => ({ url: `${GITHUB_RAW}/${f}`,            dest: path.join(CACHE_DIR, f) })),
        ...IA_MODEL_FILES.map(f => ({ url: `${GITHUB_RAW}/ia-models/${f}`, dest: path.join(IA_CACHE_DIR, f) }))
    ];
    await Promise.allSettled(tasks.map(async ({ url, dest }) => {
        try {
            const r = await net.fetch(url);
            if (!r.ok) throw new Error(`HTTP ${r.status}`);
            fs.writeFileSync(dest, await r.text(), 'utf8');
        } catch (e) { /* Sin internet → se usa el caché o semilla */ }
    }));
}

// ─── INYECTAR KEYS FRESCAS (siempre desde GitHub, sobreescribe el caché) ─────
async function injectFreshKeys(webContents) {
    for (const file of SECURE_KEY_FILES) {
        try {
            const r = await net.fetch(`${GITHUB_RAW}/${file}`);
            if (r.ok) {
                const script = await r.text();
                await webContents.executeJavaScript(script);
                console.log(`  [✓] ${file} inyectado desde GitHub`);
            }
        } catch (e) { console.warn(`  [!] ${file} usando caché local`); }
    }
}

// ─── NAVEGADOR INTEGRADO CDR ──────────────────────────────────────────────────
let mainWindow;
function openInCDRBrowser(url) {
    const browserWin = new BrowserWindow({
        width: 1150, height: 800,
        title: 'CDR Navigator',
        backgroundColor: '#0a0a0a',
        autoHideMenuBar: true,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false,
            webviewTag: true,
            webSecurity: true
        }
    });
    browserWin.setMenu(null);
    browserWin.loadFile(path.join(__dirname, 'browser.html'), { query: { url } });
    browserWin.on('closed', () => {
        if (mainWindow && !mainWindow.isDestroyed()) mainWindow.focus();
    });
}

// ─── VENTANA PRINCIPAL ────────────────────────────────────────────────────────
async function createWindow() {
    fs.mkdirSync(CACHE_DIR,    { recursive: true });
    fs.mkdirSync(IA_CACHE_DIR, { recursive: true });

    mainWindow = new BrowserWindow({
        width: 1280, height: 850,
        minWidth: 960, minHeight: 700,
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

    Menu.setApplicationMenu(Menu.buildFromTemplate([{
        label: '📦 CDR Studio',
        submenu: [
            { label: `Versión ${APP_VER}`, enabled: false },
            { type: 'separator' },
            { label: '🔄 Recargar',          accelerator: 'F5',     click: () => mainWindow.reload() },
            { label: '🐛 DevTools',           accelerator: 'F12',    click: () => mainWindow.webContents.toggleDevTools() },
            { type: 'separator' },
            { label: '📂 Repositorio GitHub', click: () => openInCDRBrowser(REPO_URL) },
            { type: 'separator' },
            { label: '❌ Salir',              accelerator: 'Alt+F4', click: () => app.quit() }
        ]
    }]));

    // Links externos → navegador CDR integrado
    mainWindow.webContents.setWindowOpenHandler(({ url }) => {
        openInCDRBrowser(url);
        return { action: 'deny' };
    });
    mainWindow.webContents.on('will-navigate', (event, url) => {
        if (!url.startsWith('file://')) { event.preventDefault(); openInCDRBrowser(url); }
    });

    // ── PASO 1: Instalar semillas si es el primer arranque ─────────────────
    seedCache(); // Instantáneo — usa archivos embebidos en el exe

    // ── PASO 2: Cargar la app desde el caché (ya disponible) ───────────────
    await mainWindow.loadFile(path.join(CACHE_DIR, 'index.html'));
    mainWindow.show();
    mainWindow.on('closed', () => { mainWindow = null; });

    // ── PASO 3: Actualizar desde GitHub en SEGUNDO PLANO (no bloquea) ──────
    syncFromGitHub().then(() => {
        console.log('[CDR Desktop] Actualización en segundo plano completada.');
    });

    // ── PASO 4: Inyectar keys frescas desde GitHub ──────────────────────────
    mainWindow.webContents.on('did-finish-load', () => {
        injectFreshKeys(mainWindow.webContents);
    });
}

// ─── CICLO DE VIDA ────────────────────────────────────────────────────────────
app.whenReady().then(createWindow);
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
