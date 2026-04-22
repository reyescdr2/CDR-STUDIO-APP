const { FFmpeg } = window.FFmpegWasm || {};
const { fetchFile, toBlobURL } = window.FFmpegUtil || {};
const ffmpeg = FFmpeg ? new FFmpeg() : null;
let ffmpegReady = false;

// --- CONFIGURACIÓN DE SEGURIDAD CDR (GRADO MILITAR) ---
const SECURITY = {
    // Identificador oficial de Google para TOTEM GENERADOR
    GOOGLE_CLIENT_ID: "812322625140-v3qaulhnn0e89ge05ki5jof0qn8tetmc.apps.googleusercontent.com",
    // Esta sal DEBE ser idéntica a la del generador Python
    SALT: "CDR_FOUNDATION_ULTRA_SECURE_2026_BY_REYES_CDR",
    STORAGE_KEY: "CDR_AUTH_DATA"
};

let currentUser = null;

const ui = {
    visualInput: document.getElementById('visual-input'),
    audioInput: document.getElementById('audio-input'),
    iconInput: document.getElementById('icon-input'),
    visualDropzone: document.getElementById('visual-dropzone'),
    audioDropzone: document.getElementById('audio-dropzone'),
    iconDropzone: document.getElementById('icon-dropzone'),
    visualPreview: document.getElementById('visual-preview'),
    audioPreview: document.getElementById('audio-preview'),
    iconPreview: document.getElementById('icon-preview'),
    packName: document.getElementById('pack-name'),
    packDesc: document.getElementById('pack-description'),
    removeBg: document.getElementById('remove-bg'),
    animFPS: document.getElementById('animFPS'),
    generateBtn: document.getElementById('generate-btn'),
    loadingOverlay: document.getElementById('loading-overlay'),
    loadingText: document.getElementById('loading-text'),
    loadingSubtext: document.getElementById('loading-subtext'),
    progressBar: document.getElementById('progress-bar'),
    progressPercent: document.getElementById('progress-percent'),
    previewModal: document.getElementById('preview-modal'),
    galleryView: document.getElementById('gallery-view'),
    framesGridView: document.getElementById('frames-grid-view'),
    cancelBtn: document.getElementById('cancel-btn'),
    confirmBtn: document.getElementById('confirm-btn'),
    aiStatusIndicator: document.getElementById('ai-status-indicator'),
    resInfo: document.getElementById('resolution-info'),
    resText: document.getElementById('res-text'),
    packDescription: document.getElementById('pack-description'),
    modelStatusDot: document.getElementById('model-status-dot'),
    modelLoadingBox: document.getElementById('model-loading-box'),
    modelProgressText: document.getElementById('model-progress-text'),
    modelProgressBar: document.getElementById('model-progress-bar'),
    aiEngineMode: document.getElementById('ai-engine-mode'),
    photoroomKey: document.getElementById('photoroom-key'),
    photoroomApiGroup: document.getElementById('photoroom-api-group'),
    hfToken: document.getElementById('hf-token'),
    hfApiGroup: document.getElementById('hf-api-group'),
    removebgKey: document.getElementById('removebg-key'),
    removebgApiGroup: document.getElementById('removebg-api-group'),
    pixianUser: document.getElementById('pixian-user'),
    pixianKey: document.getElementById('pixian-key'),
    pixianApiGroup: document.getElementById('pixian-api-group'),
    strictMode: document.getElementById('strict-mode'),
    framesInput: document.getElementById('frames-input'),
    choiceModal: document.getElementById('choice-modal'),
    choiceGifBtn: document.getElementById('choice-gif-btn'),
    choiceFramesBtn: document.getElementById('choice-frames-btn'),
    choiceCancelBtn: document.getElementById('choice-cancel-btn'),
    exportRawBtn: document.getElementById('export-raw-btn'),
    photoroomGroup: document.getElementById('photoroom-api-group'),
    removebgGroup: document.getElementById('removebg-api-group'),
    hfGroup: document.getElementById('hf-api-group'),
    pixianGroup: document.getElementById('pixian-api-group'),
    keysInput: document.getElementById('keys-file-input'),
    importKeysBtn: document.getElementById('import-keys-btn'),
    fpsValue: document.getElementById('fps-val'),
    // Elementos del Gate
    loginGate: document.getElementById('login-gate'),
    gateStep1: document.getElementById('gate-step-1'),
    gateStep2: document.getElementById('gate-step-2'),
    userWelcome: document.getElementById('user-welcome'),
    usernameInput: document.getElementById('username-input'), // V340: Registro
    licenseInput: document.getElementById('license-key-input'),
    verifyLicenseBtn: document.getElementById('verify-license-btn'),
    licenseError: document.getElementById('license-error'),
    appContainer: document.querySelector('.app-container'),
    // Elementos del Modal de Audio (V329)
    audioChoiceModal: document.getElementById('audio-choice-modal'),
    audioChoiceReady: document.getElementById('audio-choice-ready-btn'),
    audioChoiceCancel: document.getElementById('audio-choice-cancel-btn')
};

// --- SISTEMA DE AYUDA CDR FUNDATION ---
function showHelp(content) {
    let popup = document.getElementById('cdr-help-popup');
    if (!popup) {
        popup = document.createElement('div');
        popup.id = 'cdr-help-popup';
        popup.className = 'help-popup';
        document.body.appendChild(popup);
    }
    popup.innerHTML = `
        <h3>CDR Foundation: Guía</h3>
        <p>${content}</p>
        <button class="close-help" onclick="this.parentElement.classList.remove('visible')">Entendido</button>
    `;
    requestAnimationFrame(() => popup.classList.add('visible'));
}

document.querySelectorAll('.help-icon').forEach(icon => {
    icon.onclick = (e) => {
        e.stopPropagation();
        
        // V338: Unificación RADICAL - Solo existe un panel de ayuda para audio
        if (icon.closest('#audio-dropzone')) {
            ui.audioChoiceModal.classList.remove('hidden');
            return;
        }

        const helpText = icon.getAttribute('data-help') || icon.getAttribute('title');
        if (helpText) showHelp(helpText);
    };
});

// Vínculo especial: Clic en 'Descargar Originales' dispara la ayuda sugerida
ui.exportRawBtn.addEventListener('mouseenter', () => {
    const helpIcon = ui.exportRawBtn.nextElementSibling;
    if (helpIcon && helpIcon.classList.contains('help-icon')) {
        const helpText = helpIcon.getAttribute('data-help');
        ui.exportRawBtn.title = "Haz clic para bajar los cuadros. Haz clic en el '?' para ver cómo quitarles el fondo.";
    }
});

let globalPackData = null;
let originalFrames = [];
let files = { visual: null, audio: null, icon: null };

// --- NÚCLEO DE SEGURIDAD CDR (Sincronizado con Python) ---
function signData(data) {
    return CryptoJS.SHA256(`${data}:${SECURITY.SALT}`).toString(CryptoJS.enc.Hex).toUpperCase();
}

function generateServerStyleKey(email) {
    const sig = signData(email.trim().toLowerCase());
    // Formato Antiguo (Compatibilidad)
    return `CDR-${sig.substring(0,4)}-${sig.substring(4,8)}-${sig.substring(8,12)}-${sig.substring(12,16)}`;
}

function signTimedData(key, seconds) {
    return CryptoJS.SHA256(`TIMED:${key}:${seconds}:${SECURITY.SALT}`).toString(CryptoJS.enc.Hex).toUpperCase();
}

function verifyLicenseKey(inputKey, userEmail) {
    const key = inputKey.trim().toUpperCase();
    const keyHash = signData(key);
    console.log("[CDR Debug] Validando llave:", key, "Hash:", keyHash);
    
    // 0. COMPROBAR REGISTRO OFICIAL (NUEVO V4 - HASH SYNC)
    if (!window.CDR_REGISTERED_KEYS || !window.CDR_REGISTERED_KEYS.includes(keyHash)) {
        console.error("[CDR Admin] Hash NO encontrado en el registro oficial:", keyHash);
        if (!window.CDR_REGISTERED_KEYS) console.error("[CDR Admin] ERROR: window.CDR_REGISTERED_KEYS no está definido. ¿Carga fallida?");
        return "NOT_FOUND"; 
    }

    // 1. COMPROBAR BLACKLIST (HASH SYNC)
    if (window.CDR_BLACKLIST && window.CDR_BLACKLIST.includes(keyHash)) {
        console.warn("[CDR Admin] Acceso bloqueado (Blacklist):", keyHash);
        return "BLACKLISTED";
    }

    // 1. COMPATIBILIDAD RETROACTIVA (Llaves antiguas sin prefijo extra)
    if (key.length === 23 && key.split('-').length === 5 && !key.startsWith('CDR-E-') && !key.startsWith('CDR-S-') && !key.startsWith('CDR-P-')) {
        const expected = generateServerStyleKey(userEmail);
        const match = (key === expected);
        if (!match) console.error("[CDR Debug] Signature fail (Legacy). Expected:", expected);
        return match;
    }

    // 2. NUEVA LLAVE VINCULADA A EMAIL (CDR-E-...)
    if (key.startsWith('CDR-E-')) {
        const sig = signData(userEmail.trim().toLowerCase());
        const expected = `CDR-E-${sig.substring(0,4)}-${sig.substring(4,8)}-${sig.substring(8,12)}-${sig.substring(12,16)}`;
        const match = (key === expected);
        if (!match) console.error("[CDR Debug] Signature fail (Email). Expected:", expected, "for", userEmail);
        return match;
    }

    // 3. LLAVE PREMIUM (CDR-P-...) - Ignora el correo
    if (key.startsWith('CDR-P-')) {
        const parts = key.split('-');
        if (parts.length < 4) return false;
        const randomId = parts[2];
        const sig = signData(`PREMIUM:${randomId}`);
        const expected = `CDR-P-${randomId}-${sig.substring(0,4)}-${sig.substring(4,8)}-${sig.substring(8,12)}`;
        const match = (key === expected);
        if (!match) console.error("[CDR Debug] Signature fail (Premium). Expected:", expected);
        return match;
    }

    // 4. LLAVE SINGLE-USE (CDR-S-...) - Vinculada a este dispositivo
    if (key.startsWith('CDR-S-')) {
        const parts = key.split('-');
        if (parts.length < 4) {
            console.error("[CDR Debug] Formato inválido para SINGLE-USE (pocos segmentos)");
            return false;
        }
        const randomId = parts[2];
        const sig = signData(`SINGLE:${randomId}`);
        const expected = `CDR-S-${randomId}-${sig.substring(0,4)}-${sig.substring(4,8)}-${sig.substring(8,12)}`;
        const match = (key === expected);
        if (!match) console.error("[CDR Debug] Signature fail (Single-Use). Expected:", expected);
        return match;
    }

    // 5. LLAVE TEMPORAL (CDR-T-...) - V3 (Checking expirations.js)
    if (key.startsWith('CDR-T-')) {
        const parts = key.split('-');
        if (parts.length < 4) return false;
        const randomId = parts[2];
        const sig = signData(`TIMED:${randomId}`);
        const expected = `CDR-T-${randomId}-${sig.substring(0,4)}-${sig.substring(4,8)}-${sig.substring(8,12)}`;
        
        if (key !== expected) {
             console.error("[CDR Debug] Signature fail (Temporal). Expected:", expected);
             return false;
        }
        
        // --- LÓGICA DE TIEMPO PAUSABLE V3 ---
        const totalProjected = window.CDR_EXPIRATIONS ? window.CDR_EXPIRATIONS[key] : null;
        if (!totalProjected) {
             console.error("[CDR Debug] Saldo no encontrado para key temporal en expirations.js");
             return "EXPIRED";
        }

        const savedTime = localStorage.getItem(`CDR_T_REM_${key}`);
        const savedSig = localStorage.getItem(`CDR_T_SIG_${key}`);
        
        if (!savedTime) {
            console.log("[CDR Security] Primera activación de llave temporal.");
            const initialSeconds = parseInt(totalProjected);
            localStorage.setItem(`CDR_T_REM_${key}`, initialSeconds);
            localStorage.setItem(`CDR_T_SIG_${key}`, signTimedData(key, initialSeconds));
            return true;
        }

        if (savedSig !== signTimedData(key, savedTime)) {
            console.error("[CDR Security] Intento de manipulación de tiempo detectado.");
            return "BLACKLISTED";
        }

        if (parseInt(savedTime) <= 0) return "EXPIRED";
        
        return true;
    }

    console.warn("[CDR Debug] Tipo de llave no reconocido.");
    return false;
}

function revokeSession(reason = "REVOCADA") {
    console.error("[CDR Security] SESIÓN INVALIDADA:", reason);
    
    // Reportar a Discord antes de limpiar
    const saved = localStorage.getItem(SECURITY.STORAGE_KEY);
    if (saved) {
        try {
            const data = JSON.parse(saved);
            sendToDiscord(data.username || "Usuario", data.email || "Local", data.key, reason);
        } catch(e) {}
    }

    localStorage.removeItem(SECURITY.STORAGE_KEY);
    ui.appContainer.classList.add('blur-content');
    ui.loginGate.classList.remove('hidden');
    
    if (ui.licenseError) {
        ui.licenseError.innerText = (reason === "EXPIRED") ? "TU LLAVE HA EXPIRADO" : "LLAVE BLOQUEADA POR EL ADMINISTRADOR";
        ui.licenseError.classList.remove('hidden');
    }
}

function checkAuth() {
    const saved = localStorage.getItem(SECURITY.STORAGE_KEY);
    if (saved) {
        try {
            const data = JSON.parse(saved);
            // Re-validamos usando la nueva lógica centralizada
            const validation = verifyLicenseKey(data.key, data.email || "");
            
            if (validation === true) {
                console.log("[CDR Security] Sesión recordada para:", data.email || "Usuario Local");
                
                currentUser = { email: data.email, name: data.name || "USUARIO CDR" };
                unlockApp();

                // --- MOTOR DE CRONÓMETRO PAUSABLE ---
                if (data.key.startsWith('CDR-T-')) {
                    startTemporalCountdown(data.key);
                }

                // REPORTE DE REGRESO...
                if (window.CDR_CONFIG && window.CDR_CONFIG.ALWAYS_REPORT) {
                    const sessionKey = `CDR_SESS_${data.key}`;
                    if (!sessionStorage.getItem(sessionKey)) {
                        sendToDiscord(currentUser.name, currentUser.email, data.key);
                        sessionStorage.setItem(sessionKey, "true");
                    }
                }

                return;
            } else if (validation === "BLACKLISTED" || validation === "EXPIRED") {
                revokeSession(validation);
                return;
            }
        } catch (e) { 
            console.error("[CDR Security] Error en persistencia:", e);
            localStorage.removeItem(SECURITY.STORAGE_KEY); 
        }
    }
    showLoginGate();
}

function showLoginGate() {
    ui.loginGate.classList.remove('hidden');
    ui.appContainer.classList.add('blur-content');
    initGoogleLogin();
}

function unlockApp() {
    ui.loginGate.classList.add('hidden');
    ui.appContainer.classList.remove('blur-content');
}

function initGoogleLogin() {
    // El renderizado ahora es por HTML en index.html, más robusto.
    // Solo inicializamos si es necesario manual.
}

// --- MANEJADOR GLOBAL DE GOOGLE (NO TOCAR) ---
function handleGoogleResponse(response) {
    console.log("[CDR Admin] Recibida respuesta de Google...");
    try {
        const payload = JSON.parse(atob(response.credential.split('.')[1]));
        currentUser = payload;
        
        console.log("[CDR Admin] Usuario identificado:", payload.email);
        
        // Cambio de pantalla: De Login a Llave de Licencia
        document.getElementById('gate-step-1').classList.add('hidden');
        document.getElementById('gate-step-2').classList.remove('hidden');
        document.getElementById('user-welcome').innerText = `BIENVENIDO, ${payload.name.toUpperCase()}`;
        // Pre-llenar nombre de usuario con el nombre de Google si está vacío
        if (ui.usernameInput) ui.usernameInput.value = payload.name;
    } catch (e) {
        console.error("[CDR Admin] Error procesando Google Login:", e);
        alert("Fallo en la respuesta de Google: " + e.message);
    }
}

// Vinculamos a window por seguridad
window.handleGoogleResponse = handleGoogleResponse;

async function sendToDiscord(username, email, key, status = "REGISTRO") {
    const url = window.CDR_CONFIG ? window.CDR_CONFIG.DISCORD_WEBHOOK_URL : "";
    if (!url || url === "") return;

    let title = "🚀 NUEVO REGISTRO: CDR FOUNDATION";
    let color = 0x920000;

    if (status === "EXPIRED") {
        title = "⏳ SESIÓN EXPIRADA: CDR SECURITY";
        color = 0xFFFF00; // Amarillo
    } else if (status === "BLACKLISTED" || status === "REVOCADA") {
        title = "🚫 ACCESO BLOQUEADO: CDR SEGURIDAD";
        color = 0xFF0000; // Rojo
    }

    // DETECCIÓN DE TIPO DE LLAVE (V342)
    let typeLabel = "DESCONOCIDO ❓";
    if (key.startsWith("CDR-P-")) {
        typeLabel = "⭐ PREMIUM ELITE (ACCESO TOTAL)";
    } else if (key.startsWith("CDR-S-")) {
        typeLabel = "📱 UN SOLO USO (LINK DISPOSITIVO)";
    } else if (key.startsWith("CDR-E-")) {
        typeLabel = "📧 VINCULADA A CORREO";
    } else if (key.startsWith("CDR-T-")) {
        typeLabel = "⏳ TEMPORAL (CONTADOR PAUSABLE)";
    } else if (key.startsWith("CDR-")) {
        typeLabel = "📜 LEGACY (ANTIGUA / RETRO)";
    } else if (key.includes("LOGIN")) {
        typeLabel = "👣 INGRESO A PORTAL (SIN LLAVE)";
        color = 0xFFFFFF;
    }

    const payload = {
        embeds: [{
            title: title,
            color: color,
            fields: [
                { name: "👤 Usuario", value: username, inline: true },
                { name: "📧 Correo", value: email, inline: true },
                { name: "🏷️ Tipo de Key", value: `**${typeLabel}**` },
                { name: "🔑 Key Usada", value: `\`${key}\`` },
                { name: "🌐 Origen", value: window.location.hostname || "Local/Exe" },
                { name: "⏰ Fecha", value: new Date().toLocaleString() }
            ],
            footer: { text: "CDR Security Framework v343 (V3-Pausable)" }
        }]
    };

    try {
        await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        console.log("[CDR Cloud] Registro enviado a Discord con éxito.");
    } catch (e) {
        console.error("[CDR Cloud] Error enviando a Discord:", e);
    }
}

ui.verifyLicenseBtn.onclick = () => {
    const key = ui.licenseInput.value.trim().toUpperCase();
    const username = ui.usernameInput ? ui.usernameInput.value.trim() : "Usuario Desconocido";
    
    // Feedback visual de procesamiento
    ui.verifyLicenseBtn.innerText = "VALIDANDO LLAVE...";
    ui.verifyLicenseBtn.disabled = true;

    setTimeout(async () => {
        const validationResult = verifyLicenseKey(key, currentUser ? currentUser.email : "");
        
        if (validationResult === true) {
            console.log("[CDR Security] Acceso concedido con llave:", key);
            
            // Lógica de Registro Único
            const isFirstTime = !localStorage.getItem(`CDR_LOGGED_${key}`);
            const shouldReport = (window.CDR_CONFIG && window.CDR_CONFIG.ALWAYS_REPORT) || isFirstTime;

            if (shouldReport) {
                await sendToDiscord(username, currentUser ? currentUser.email : "Local", key);
                localStorage.setItem(`CDR_LOGGED_${key}`, "true");
            }

            const authData = { 
                email: currentUser ? currentUser.email : "LOCAL_USER", 
                username: username,
                key: key, 
                name: currentUser ? currentUser.name : username,
                timestamp: Date.now() 
            };
            localStorage.setItem(SECURITY.STORAGE_KEY, JSON.stringify(authData));
            unlockApp();
        } else {
            console.warn("[CDR Security] Intento de acceso fallido.");
            ui.licenseError.innerText = (validationResult === "BLACKLISTED") ? "LLAVE BLOQUEADA POR ADMINISTRADOR" : (validationResult === "EXPIRED" ? "TU LLAVE HA EXPIRADO" : "LLAVE INVÁLIDA O NO VINCULADA");
            ui.licenseError.classList.remove('hidden');
            ui.licenseInput.classList.add('error-shake');
            ui.verifyLicenseBtn.innerText = "ACTIVAR GENERADOR";
            ui.verifyLicenseBtn.disabled = false;
            setTimeout(() => ui.licenseInput.classList.remove('error-shake'), 500);
        }
    }, 800);
};

// Arrancar verificación (única fuente de verdad - llamada al final del script)
window.addEventListener('load', checkAuth);

// --- HELPERS DE UI ---
function showLoading(title, text, progress = 0) {
    ui.loadingOverlay.classList.remove('hidden');
    ui.loadingText.innerText = title;
    ui.loadingSubtext.innerText = text;
    
    const bar = document.getElementById('progress-bar');
    const percent = document.getElementById('progress-percent');
    
    if (bar) bar.style.width = `${progress}%`;
    if (percent) percent.innerText = `${progress}%`;
}

function hideLoading() {
    ui.loadingOverlay.classList.add('hidden');
}

// --- NÚCLEO DE IA SOBERANA V300 (UNLIMITED PRO) ---
async function processAI(blob) {
    if (!ui.removeBg || !ui.removeBg.checked) return blob; // Blindaje contra Null

    const mode = ui.aiEngineMode.value; 
    const apiKey = ui.photoroomKey.value;
    const hfToken = ui.hfToken.value;
    const removebgKey = ui.removebgKey.value;
    const pixianUser = ui.pixianUser.value;
    const pixianKey = ui.pixianKey.value;

    try {
        return await AIEngine.process(blob, {
            mode: mode,
            apiKey: apiKey,
            hfToken: hfToken,
            removebgKey: removebgKey,
            pixianUser: pixianUser,
            pixianKey: pixianKey,
            strict: (ui.strictMode ? ui.strictMode.checked : true),
            onProgress: (res) => {
                if (res.status === 'progress' && mode === 'local') {
                    const p = Math.round(res.progress);
                    ui.modelProgressBar.style.width = `${p}%`;
                    ui.modelProgressText.innerText = `${p}%`;
                    ui.modelLoadingBox.classList.remove('hidden');
                }
            }
        });
    } catch (error) {
        console.error("Fallo motor híbrido:", error);
        return blob; // Fallback al original
    }
}

// --- CORE: EXTRACCIÓN GIF ---
async function extractGifFrames(blob) {
    try {
        const reader = new GifReader(new Uint8Array(await blob.arrayBuffer()));
        const width = reader.width, height = reader.height;
        const totalF = reader.numFrames();
        // V100.0: Selector Inteligente CDR (IA Dinámica)
        // La IA decide: si el GIF es corto, no quitamos nada. 
        // Si es largo, optimizamos proporcionalmente para no perder la esencia.
        let skip = 1;
        if (totalF > 32) {
            // Si tiene más de 32 cuadros, empezamos a optimizar suavemente
            skip = Math.ceil(totalF / 32); 
        } else if (totalF > 16) {
            // Entre 16 y 32 cuadros, evaluamos si vale la pena saltar 1 de cada 2
            // para una fluidez óptima en dispositivos gama baja.
            skip = (totalF > 24) ? 2 : 1;
        }
        const tempCanvas = document.createElement('canvas');
        const tempCtx = tempCanvas.getContext('2d', { willReadFrequently: true });
        tempCanvas.width = width; tempCanvas.height = height;
        let frameBlobs = [], totalDelay = 0;
        let prevImageData = null, prevFrameInfo = null;
        let imageData = tempCtx.createImageData(width, height);
        
        for (let i = 0; i < totalF; i++) {
            const frameInfo = reader.frameInfo(i);
            totalDelay += frameInfo.delay || 10; // 10 = 10 FPS por defecto si no hay delay

            if (i > 0 && prevFrameInfo) {
                if (prevFrameInfo.disposal === 2) tempCtx.clearRect(prevFrameInfo.x, prevFrameInfo.y, prevFrameInfo.width, prevFrameInfo.height);
                else if (prevFrameInfo.disposal === 3 && prevImageData) tempCtx.putImageData(prevImageData, 0, 0);
                imageData = tempCtx.getImageData(0, 0, width, height);
            }
            if (frameInfo.disposal === 3) prevImageData = tempCtx.getImageData(0, 0, width, height);
            reader.decodeAndBlitFrameRGBA(i, imageData.data);
            tempCtx.putImageData(imageData, 0, 0);
            
            // Smart Sampling: Extraemos según el salto o si es el ÚLTIMO cuadro (V60)
            if (i % skip === 0 || i === totalF - 1) {
                frameBlobs.push(await new Promise(res => tempCanvas.toBlob(res, 'image/png')));
            }
            prevFrameInfo = frameInfo;
        }

        let finalFPS = 10;
        if (totalDelay > 0) {
            // Formula Maestra CDR (V328): 
            // (Cuadros_Extraídos / Total_GIF) * (100 / Delay_Promedio) * 10
            // Esta fórmula compensa los cuadros eliminados bajando la velocidad
            const totalDurationSec = totalDelay / 100;
            finalFPS = frameBlobs.length / totalDurationSec;
        } else {
            finalFPS = Math.max(1, Math.min(24, frameBlobs.length));
        }

        // Calibración de Precisión CDR: No redondear agresivamente para evitar desincronización
        ui.animFPS.value = Math.max(1, Math.min(24, finalFPS)).toFixed(2);
        return { width, height, frames: frameBlobs, skipRatio: skip, detectedFPS: finalFPS };
    } catch (e) {
        throw new Error("Error leyendo GIF: " + e.message);
    }
}


// --- DETECTOR DE TRANSPARENCIA EXISTENTE ---
// --- DETECTOR DE TRANSPARENCIA INTELIGENTE (V400) ---
async function isAlreadyTransparent(blob) {
    return new Promise(resolve => {
        const img = new Image();
        img.src = URL.createObjectURL(blob);
        img.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = img.width;
            canvas.height = img.height;
            const ctx = canvas.getContext('2d', { willReadFrequently: true });
            ctx.drawImage(img, 0, 0);
            const data = ctx.getImageData(0, 0, img.width, img.height).data;
            URL.revokeObjectURL(img.src);
            
            // Contamos cuántos píxeles son transparentes
            let transparentCount = 0;
            for (let i = 3; i < data.length; i += 4) {
                if (data[i] < 128) transparentCount++; // Umbral de transparencia
            }
            
            // Solo consideramos que ya es transparente si más del 5% lo es
            // Esto evita que motas de polvo o metadatos de GIFs "sucios" salten la IA
            const ratio = transparentCount / (img.width * img.height);
            resolve(ratio > 0.05);
        };
        img.onerror = () => resolve(false);
    });
}

// --- PROCESAMIENTO AUTOMÁTICO ---
async function startAIProcessing(baseFrames, skipRatio = 1) {
    try {
        const packName = ui.packName.value.trim() || 'Totem Pack';
        const isGif = files.visual.type === 'image/gif';
        
        const tempImg = new Image();
        tempImg.src = URL.createObjectURL(baseFrames[0]);
        await new Promise(r => tempImg.onload = r);
        const finalWidth = tempImg.width, finalHeight = tempImg.height;

        ui.resInfo.classList.remove('hidden');
        ui.resText.innerText = `CDR FOUNDATION`;

        globalPackData = { frames: [...baseFrames], finalWidth, finalHeight, isGif, packName, skipRatio };
        
        ui.framesGridView.innerHTML = '';
        baseFrames.forEach((_, idx) => {
            const card = document.createElement('div');
            card.className = 'frame-card';
            card.id = `card-frame-${idx}`;
            const frameUrl = URL.createObjectURL(baseFrames[idx]);
            card.innerHTML = `
                <div class="frame-label">FRAME ${idx + 1}</div>
                <div class="frame-orig-view">
                    <span style="font-size: 0.5rem; position: absolute; top: 2px; left: 2px; background: rgba(0,0,0,0.7); padding: 1px 3px; border-radius: 3px; z-index: 10;">ORIGINAL</span>
                    <img src="${frameUrl}" alt="Original ${idx}">
                </div>
                <div class="frame-proc-view text-center">
                    <span style="font-size: 0.5rem; position: absolute; top: 2px; left: 2px; background: rgba(146,0,0,0.7); padding: 1px 3px; border-radius: 3px; z-index: 10;">CDR LOGIC</span>
                    <img id="proc-frame-${idx}" src="${frameUrl}" alt="Processed ${idx}">
                </div>
            `;
            ui.framesGridView.appendChild(card);
        });

        ui.previewModal.classList.remove('hidden');
        ui.galleryView.classList.remove('hidden');
        
        // V700: Mostrar botón de Sync Manual sobre la IA defectuosa
        const syncBtnRef = document.getElementById('sync-frames-btn');
        if(syncBtnRef) syncBtnRef.style.display = 'block';

        ui.confirmBtn.disabled = true;
        ui.confirmBtn.innerText = 'ESPERANDO LIMPIEZA TOTAL...';
        ui.aiStatusIndicator.innerText = 'Iniciando Escaneo...';
        ui.aiStatusIndicator.className = 'status-badge processing';

        // Bucle secuencial con feedback visual
        for (let i = 0; i < baseFrames.length; i++) {
            const progress = Math.round(((i + 1) / baseFrames.length) * 100);
            const engineLabel = ui.aiEngineMode.options[ui.aiEngineMode.selectedIndex].text;
            const skipAI = (ui.removeBg ? !ui.removeBg.checked : false);
            
            showLoading(
                skipAI ? `Saltando IA...` : `Inyectando ADN CDR...`, 
                skipAI ? `Manteniendo Cuadro ${i + 1} Original` : `Esculpiendo Anime: Cuadro ${i + 1} / ${baseFrames.length} [V230]`, 
                progress
            );
            
            ui.aiStatusIndicator.innerText = skipAI ? `Modo Rápido` : `Escaneo Diamante (${progress}%)`;
            
            const card = document.getElementById(`card-frame-${i}`);
            if (card) card.classList.add('processing');

            // Ejecución de la IA SOBERANA (V800)
            let cleanedBlob;
            const alreadyTransparent = await isAlreadyTransparent(baseFrames[i]);
            
            if (alreadyTransparent) {
                cleanedBlob = baseFrames[i];
            } else if (skipAI) {
                cleanedBlob = baseFrames[i];
            } else {
                cleanedBlob = await processAI(baseFrames[i]);
            }
            
            globalPackData.frames[i] = cleanedBlob;
            
            const isOriginal = (cleanedBlob.size === baseFrames[i].size);
            
            // Actualizar vista previa en tiempo real
            const thumb = document.getElementById(`proc-frame-${i}`);
            if (thumb && card) {
                const newUrl = URL.createObjectURL(cleanedBlob);
                thumb.src = newUrl;
                
                if (isOriginal && !skipAI && !alreadyTransparent) {
                    thumb.style.boxShadow = '0 0 20px #ffcc00'; 
                    card.classList.add('error-frame');
                } else if (!isOriginal) {
                    thumb.style.boxShadow = '0 0 20px #00ff88'; 
                }
                
                card.onclick = () => openZoomModal(newUrl);
                card.classList.remove('processing');
                card.classList.add('ready');
            }
        }
        
        ui.aiStatusIndicator.innerText = (ui.removeBg && ui.removeBg.checked) ? 'Todo Limpio (100%)' : 'Frames Listos (Originales)';
        ui.aiStatusIndicator.className = 'status-badge ready';
        ui.confirmBtn.disabled = false;
        ui.confirmBtn.innerText = 'GENERAR PACK AHORA';
        hideLoading();
    } catch (error) {
        hideLoading();
        alert('Fallo en el motor IA: ' + error.message);
    }
}

// --- EVENTOS DE ARCHIVOS ---
function setupDropzone(dropzone, input, type) {
    dropzone.addEventListener('click', (e) => {
        // V331: Interceptamos clic en audio para mostrar la Guía
        if (type === 'audio') {
            e.preventDefault();
            e.stopPropagation();
            ui.audioChoiceModal.classList.remove('hidden');
        } else if (type === 'visual') {
            ui.choiceModal.classList.remove('hidden');
        } else {
            input.click();
        }
    });

    dropzone.addEventListener('dragover', (e) => { e.preventDefault(); dropzone.classList.add('dragover'); });
    dropzone.addEventListener('dragleave', () => dropzone.classList.remove('dragover'));
    dropzone.addEventListener('drop', (e) => { 
        e.preventDefault(); 
        if (e.dataTransfer.files.length) {
            if (type === 'visual' && e.dataTransfer.files.length > 1) {
                handleMultipleFiles(e.dataTransfer.files);
            } else {
                handleFile(e.dataTransfer.files[0], type);
            }
        }
    });
    input.addEventListener('change', (e) => { if (e.target.files.length) handleFile(e.target.files[0], type); });
}

// Botones de Elección (V323 - Forensic Choice Fix)
function closeChoiceModal() {
    ui.choiceModal.classList.add('hidden');
}

// Detener propagación en inputs ocultos para evitar bucles con dropzones (V323.4 Fix)
ui.visualInput.addEventListener('click', (e) => e.stopPropagation());
ui.framesInput.addEventListener('click', (e) => e.stopPropagation());
ui.audioInput.addEventListener('click', (e) => e.stopPropagation());
ui.iconInput.addEventListener('click', (e) => e.stopPropagation());

ui.choiceGifBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    closeChoiceModal();
    // Brute Force Closure: esperar a que el navegador refresque la UI antes de abrir el picker
    // Aumentado a 100ms para Windows para asegurar que el explorador no bloquee el renderizado
    setTimeout(() => {
        ui.visualInput.click();
    }, 100);
});

// ui.choiceFramesBtn.addEventListener('click', (e) => {
//    e.stopPropagation();
//    closeChoiceModal();
//    setTimeout(() => {
//        ui.framesInput.click();
//    }, 100);
// });

ui.choiceCancelBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    closeChoiceModal();
});

ui.choiceModal.addEventListener('click', (e) => {
    if (e.target === ui.choiceModal) closeChoiceModal();
});

// --- LÓGICA DE MODAL DE AUDIO (V329) ---
ui.audioChoiceReady.addEventListener('click', (e) => {
    e.stopPropagation();
    ui.audioChoiceModal.classList.add('hidden');
    setTimeout(() => {
        ui.audioInput.click();
    }, 100);
});

ui.audioChoiceCancel.addEventListener('click', (e) => {
    e.stopPropagation();
    ui.audioChoiceModal.classList.add('hidden');
});

ui.audioChoiceModal.addEventListener('click', (e) => {
    if (e.target === ui.audioChoiceModal) ui.audioChoiceModal.classList.add('hidden');
});

ui.framesInput.onchange = (e) => {
    // Deprecated for direct upload. Handled via sync now.
    if (e.target.files.length) handleMultipleFiles(e.target.files);
}

// --- FASE 2: TOMA DE CONTROL DE FOTOGRAMAS (SYNC) ---
const syncFramesInput = document.getElementById('sync-frames-input');
const syncFramesBtn = document.getElementById('sync-frames-btn');

syncFramesBtn.addEventListener('click', () => {
    syncFramesInput.click();
});

syncFramesInput.onchange = async (e) => {
    if (e.target.files.length) {
        showLoading('Sincronizando Cuadros...', 'Alineando manual a los tiempos del GIF Master...');
        await overwriteFramesWithManual(e.target.files);
        hideLoading();
    }
};

async function overwriteFramesWithManual(fileList) {
    let sortedFiles = [];
    let rawFiles = Array.from(fileList).sort((a, b) => a.name.localeCompare(b.name, undefined, {numeric: true}));
    
    // Solo tomamos tantos fotogramas como haya extraído el GIF base (globalPackData.frames.length)
    // para mantener el empalme 1:1.
    const maxFrames = globalPackData ? globalPackData.frames.length : rawFiles.length;
    
    for (let i = 0; i < Math.min(rawFiles.length, maxFrames); i++) {
        sortedFiles.push(await cloneToMemory(rawFiles[i]));
    }
    
    // Rellenamos globalPackData con las nuevas imágenes en memoria pura
    globalPackData.frames = sortedFiles;
    
    // Volvemos a dibujar las tarjetas en la Supervisión pero marcando "SYNC FRAME"
    ui.framesGridView.innerHTML = '';
    sortedFiles.forEach((_, idx) => {
        const card = document.createElement('div');
        card.className = 'frame-card';
        card.id = `card-frame-${idx}`;
        const frameUrl = URL.createObjectURL(sortedFiles[idx]);
        card.innerHTML = `
            <div class="frame-label" style="color: #ffcc00; border-bottom: 2px solid #ffcc00;">FRAME ${idx + 1} (SYNC)</div>
            <div class="frame-orig-view" style="display:none;"></div>
            <div class="frame-proc-view text-center" style="grid-column: span 2;">
                <span style="font-size: 0.5rem; position: absolute; top: 2px; left: 2px; background: rgba(255,204,0,0.7); color: black; font-weight: bold; padding: 1px 3px; border-radius: 3px; z-index: 10;">MANUAL OVERRIDE</span>
                <img id="proc-frame-${idx}" src="${frameUrl}" alt="Synced ${idx}" style="filter: none; opacity: 1;">
            </div>
        `;
        ui.framesGridView.appendChild(card);
    });

    ui.confirmBtn.disabled = false;
    ui.confirmBtn.innerText = 'EMPACAR SINCRONIZACIÓN AHORA';
}

// --- PROTECCIÓN FORENSE (ANTI-PERMISSION-DENIED) ---
async function cloneToMemory(fileOrBlob) {
    if (!fileOrBlob) return null;
    try {
        const buf = await fileOrBlob.arrayBuffer();
        const clone = new Blob([buf], { type: fileOrBlob.type });
        clone.name = fileOrBlob.name;
        return clone;
    } catch(e) {
        console.warn("[CDR Auto-Fix] No se pudo clonar a RAM:", e);
        return fileOrBlob;
    }
}

async function handleMultipleFiles(fileList) {
    let sortedFiles = [];
    const firstFile = fileList[0];

    // --- CDR ZIP EXTRACTOR (V324.5) ---
    if (fileList.length === 1 && firstFile.name.toLowerCase().endsWith('.zip')) {
        showLoading('Descomprimiendo...', 'Abriendo archivo CDR ZIP...');
        try {
            const zip = await JSZip.loadAsync(firstFile);
            const imageEntries = [];
            
            zip.forEach((path, file) => {
                if (!file.dir && (path.toLowerCase().endsWith('.png') || path.toLowerCase().endsWith('.jpg') || path.toLowerCase().endsWith('.jpeg'))) {
                    imageEntries.push(file);
                }
            });

            if (imageEntries.length === 0) {
                throw new Error("No se encontraron imágenes en el ZIP.");
            }

            // Ordenar por nombre para mantener secuencia
            imageEntries.sort((a, b) => a.name.localeCompare(b.name, undefined, {numeric: true}));

            for (const entry of imageEntries) {
                const blob = await entry.async("blob");
                // Crear un objeto similar a File para compatibilidad
                const f = new Blob([blob], { type: "image/png" });
                f.name = entry.name;
                sortedFiles.push(f);
            }
            hideLoading();
        } catch (err) {
            hideLoading();
            alert("Error al abrir el ZIP: " + err.message);
            return;
        }
    } else {
        // Modo normal: Múltiples archivos seleccionados
        showLoading('Protegiendo Memoria...', 'Asegurando Archivos contra Borrado Móvil...');
        let rawFiles = Array.from(fileList).sort((a, b) => a.name.localeCompare(b.name, undefined, {numeric: true}));
        for (const raw of rawFiles) {
            sortedFiles.push(await cloneToMemory(raw));
        }
        hideLoading();
    }

    // --- V325 FORENSIC SAMPLING: Límite de 24 cuadros para subida manual ---
    const targetSet = 24;
    if (sortedFiles.length > targetSet) {
        const skipFrames = Math.max(1, Math.floor(sortedFiles.length / targetSet));
        const optimizedFiles = [];
        for (let i = 0; i < sortedFiles.length; i += skipFrames) {
            optimizedFiles.push(sortedFiles[i]);
            if (optimizedFiles.length >= targetSet) break;
        }
        sortedFiles = optimizedFiles;
    }

    if (sortedFiles.length === 0) return;

    files.visual = sortedFiles[0]; 
    originalFrames = sortedFiles;
    
    // --- AUTO-AJUSTE DINÁMICO DE FPS MÚLTIPLES ---
    // Si subes 3 frames, se pondrá a 3 FPS (1 loop por segundo). Evita que 3 frames vayan a 10 FPS (flasheo).
    let autoFps = Math.max(1, Math.min(24, sortedFiles.length));
    ui.animFPS.value = autoFps;
    
    ui.visualPreview.innerHTML = `<div class="audio-info">🖼️ ${sortedFiles.length} Cuadros Cargados</div>`;
    ui.visualPreview.style.display = 'block';
    ui.visualDropzone.classList.add('selected-glow');
    setTimeout(() => ui.visualDropzone.classList.remove('selected-glow'), 2000);
    ui.generateBtn.disabled = false;
}

async function handleFile(rawFile, type) {
    // Clonar a memoria permanentemente para prevenir cambios de permiso del dispositivo móvil
    const file = await cloneToMemory(rawFile);
    if (!file) return;

    const url = URL.createObjectURL(file);
    let dz;
    if (type === 'visual') {
        files.visual = file;
        originalFrames = []; // V323 Fix: Limpiar cuadros previos al cambiar de media
        ui.visualPreview.innerHTML = `<img src="${url}" />`;
        ui.visualPreview.style.display = 'block';
        dz = ui.visualDropzone;
    } else if (type === 'audio') {
        files.audio = file;
        ui.audioPreview.innerHTML = `
            <div class="audio-info">🎵 ${file.name}</div>
            <audio controls src="${url}"></audio>
        `;
        ui.audioPreview.style.display = 'block';
        dz = ui.audioDropzone;
    } else if (type === 'icon') {
        files.icon = file;
        ui.iconPreview.innerHTML = `<img src="${url}" />`;
        ui.iconPreview.style.display = 'block';
        dz = ui.iconDropzone;
    }
    
    // V315: Animación de éxito (Soberano Glow)
    if (dz) {
        dz.classList.add('selected-glow');
        setTimeout(() => dz.classList.remove('selected-glow'), 2000);
    }
    
    ui.generateBtn.disabled = !files.visual;
}

// --- MOTOR DE ESCALADO (PIXEL PERFECT) ---
async function resizeImage(blob, targetRes) {
    if (targetRes === 'orig') return blob;
    const res = parseInt(targetRes);
    const img = new Image();
    img.src = URL.createObjectURL(blob);
    await new Promise(r => img.onload = r);
    
    // --- ASPECT RATIO COMPENSATOR (V180) ---
    let w = img.width, h = img.height;
    let newW, newH;
    
    if (w > h) {
        newW = res;
        newH = Math.round(res * h / w);
    } else {
        newH = res;
        newW = Math.round(res * w / h);
    }

    const canvas = document.createElement('canvas');
    canvas.width = newW; canvas.height = newH;
    const ctx = canvas.getContext('2d');
    
    // --- LIMPIEZA DE CANVA (V306 - ANTI-BORRÓN) ---
    ctx.clearRect(0, 0, newW, newH);
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(img, 0, 0, newW, newH);
    
    URL.revokeObjectURL(img.src);
    return new Promise(r => canvas.toBlob(r, 'image/png'));
}
// --- INICIALIZACIÓN DE COMPONENTES ---

setupDropzone(ui.visualDropzone, ui.visualInput, 'visual');
setupDropzone(ui.audioDropzone, ui.audioInput, 'audio');
setupDropzone(ui.iconDropzone, ui.iconInput, 'icon');

ui.generateBtn.onclick = async () => {
    try {
        showLoading('Preparando Animación...', 'Procesando Secuencia CDR...');
        const isGif = files.visual.type === 'image/gif';
        let sRatio = 1;
        
        // Si ya tenemos originalFrames (por carga múltiple), no extraemos del GIF
        if (originalFrames.length <= 1 && isGif) {
            const data = await extractGifFrames(files.visual);
            originalFrames = data.frames;
            sRatio = data.skipRatio;
        } else if (originalFrames.length === 0) {
            originalFrames = [files.visual];
        }
        
        hideLoading();
        startAIProcessing(originalFrames, sRatio);
    } catch (err) {
        hideLoading();
        alert('Error: ' + err.message);
    }
};

ui.exportRawBtn.onclick = async () => {
    if (!originalFrames || originalFrames.length === 0) return;
    try {
        const zip = new JSZip();
        const folder = zip.folder("frames_originales");
        for (let i = 0; i < originalFrames.length; i++) {
            folder.file(`frame_${i + 1}.png`, originalFrames[i]);
        }
        const content = await zip.generateAsync({type: "blob"});
        saveAs(content, "cuadros_totem_raw.zip");

        // --- AUTO-GUÍA CDR (V324.1) ---
        const helpIcon = document.querySelector('#gallery-actions .help-icon');
        if (helpIcon) {
            showHelp(helpIcon.getAttribute('data-help'));
        }
    } catch (e) {
        alert("Error exportando: " + e.message);
    }
};

ui.cancelBtn.onclick = () => ui.previewModal.classList.add('hidden');

ui.confirmBtn.onclick = async () => {
    if (!globalPackData) return;
    try {
        // --- RESOLUCIÓN Y ESCALA (V120 / V110) ---
        const resBtnActive = document.querySelector('.res-btn.active');
        const resValue = resBtnActive ? resBtnActive.dataset.res : 'orig';
        
        showLoading('Inyectando ADN CDR (V230)...', `Escalando a ${resValue === 'orig' ? 'ORIGINAL' : resValue + 'x'}...`);
        
        const { frames: rawFrames, packName, isGif } = globalPackData;
        
        let fW = globalPackData.finalWidth;
        let fH = globalPackData.finalHeight;

        if (resValue !== 'orig') {
            const res = parseInt(resValue);
            if (fW > fH) {
                fH = Math.round(res * fH / fW);
                fW = res;
            } else {
                fW = Math.round(res * fW / fH);
                fH = res;
            }
        }

        // --- NORMALIZACIÓN DE UNIDADES (V190 - ANTI-GIGANTE) ---
        const gScale = 14 / Math.max(fW, fH);
        const gW = fW * gScale;
        const gH = fH * gScale;
        console.log(`[V230] Dimens. Textura: ${fW}x${fH} | Dimens. Geometría: ${gW.toFixed(2)}x${gH.toFixed(2)}`);

        // --- ESCALADO DE TODAS LAS TEXTURAS ---
        const frames = [];
        for (let i = 0; i < rawFrames.length; i++) {
            if (resValue === 'orig') {
                frames[i] = rawFrames[i];
            } else {
                frames[i] = await resizeImage(rawFrames[i], parseInt(resValue));
            }
        }

        const zip = new JSZip();
        // Generar UUIDs frescos (Anti-Cache V321)
        const uuid1 = self.crypto.randomUUID(), uuid2 = self.crypto.randomUUID();
        const pName = ui.packName.value.trim() || `${packName} HD`;
        const pDesc = ui.packDesc.value.trim() || "Generador de Totem - CDR Foundation (Forensic Sync)";

        // 1. MANIFEST (ESPEJO CDR 1.21.30)
        zip.file('manifest.json', JSON.stringify({
            format_version: 2,
            header: { 
                name: `§4${pName} §c(CDR Foundation)`, 
                description: pDesc, 
                uuid: uuid1, 
                version: [1,0,0], 
                min_engine_version: [1,21,30] 
            },
            modules: [{ type: "resources", uuid: uuid2, version: [1,0,0] }]
        }, null, 2));

        // 2. GEOMETRÍA (RECONSTRUCCIÓN FORENSE UV)
        const cubes = [];
        for (let i = 0; i <= 10; i++) {
            cubes.push({
                origin: [2.0 + (i * 0.005), 0, 0],
                size: [0, 2, 2],
                uv: {
                    north: { uv: [0, 0], uv_size: [fW, fH] }, 
                    south: { uv: [0, 0], uv_size: [fW, fH] },
                    west:  { uv: [0, 0], uv_size: [fW, fH] }, // Fix Invisibilidad por ángulo
                    east:  { uv: [0, 0], uv_size: [0, 0] },
                    up:    { uv: [0, 0], uv_size: [0, 0] },
                    down:  { uv: [0, 0], uv_size: [0, 0] }
                }
            });
        }

        zip.folder('models').folder('entity').file('vm.geo.json', JSON.stringify({
            format_version: "1.16.0",
            "minecraft:geometry": [{
                description: { 
                    identifier: "geometry.vm", 
                    texture_width: fW, 
                    texture_height: fH,
                    visible_bounds_width: 15,
                    visible_bounds_height: 5,
                    visible_bounds_offset: [0, 0.5, 0]
                },
                bones: [{ name: "leftitem", pivot: [0, 0, 0], cubes }]
            }]
        }, null, 2));

        // 3. ATTACHABLE (ELIMINADO 'DEFAULT' POR CONFLICTO)
        const attachableTextureMap = {};
        frames.forEach((_, idx) => {
            attachableTextureMap[`item_frame_${idx + 1}`] = `textures/item/item${idx + 1}`;
        });

        zip.folder('attachables').file('totem.json', JSON.stringify({
            format_version: "1.10.0",
            "minecraft:attachable": {
                description: {
                    identifier: "minecraft:totem_of_undying",
                    materials: { default: "entity_alphatest", enchanted: "entity_alphatest_glint" },
                    textures: { 
                        // Sincronización Estricta CDR: NO usar 'default'
                        ...attachableTextureMap, 
                        enchanted: "textures/misc/enchanted_item_glint" 
                    },
                    geometry: { default: "geometry.vm" },
                    animations: { wield: "animation.leftblock.first_person_wield" },
                    scripts: { animate: ["wield"] },
                    render_controllers: ["controller.render.item_animation_totem"]
                }
            }
        }, null, 2));

        // 4. ANIMACIÓN (IDENTIDAD CDR FOUNDATION)
        const handAnim = { 
            rotation: ["c.is_first_person ? -15.0 : 100.0", "c.is_first_person ? 30.0 : 20.0", "c.is_first_person ? 4.0 : 80.0"],
            position: ["c.is_first_person ? -23.0 : -6.2", "c.is_first_person ? 7.0 : 7.0", "c.is_first_person ? 11.0 : 4.0"],
            scale: ["c.is_first_person ? 3.3 : 5.0", "c.is_first_person ? 3.3 : 5.0", "c.is_first_person ? 3.3 : 5.0"]
        };

        zip.folder('animations').file('vleftblock.animation.json', JSON.stringify({
            format_version: "1.8.0",
            animations: {
                "animation.leftblock.first_person_wield": {
                    loop: true,
                    bones: { "leftitem": handAnim }
                }
            }
        }, null, 2));

        // 5. RENDER CONTROLLER (MOLANG RAW SYNC)
        const textureArray = frames.map((_, idx) => `texture.item_frame_${idx + 1}`);
        zip.folder('render_controllers').file('item_animation.render_controllers.json', JSON.stringify({
            format_version: "1.10",
            render_controllers: {
                "controller.render.item_animation_totem": {
                    arrays: { textures: { "array.item_frames": textureArray } },
                    geometry: "Geometry.default", 
                    materials: [{ "*": "variable.is_enchanted ? material.enchanted : material.default" }],
                    textures: [
                        // Sincronización Maestra (Basada en Copia Funcional CDR):
                        // La multiplicación directa permite que Minecraft gestione internamente el bucle.
                        `array.item_frames[query.life_time * ${parseFloat(ui.animFPS.value || 10).toFixed(1)}]`,
                        "texture.enchanted"
                    ]
                }
            }
        }, null, 2));

        // 6. TEXTURAS (CONSOLIDACIÓN /item/)
        const itemFolder = zip.folder('textures').folder('item');
        for (let i = 0; i < frames.length; i++) {
            itemFolder.file(`item${i + 1}.png`, await frames[i].arrayBuffer());
        }

        // 7. ITEM TEXTURE (INVENTARIO 2D)
        let itemTexRef = "textures/item/item1";
        
        if (files.icon) {
            // Si el usuario subió un ícono (ej. un totem default), lo usamos para el inventario/item frame para evitar deformaciones
            itemFolder.file(`custom_icon.png`, files.icon);
            itemTexRef = "textures/item/custom_icon";
        } else {
            // Emparejar la proporción a 1:1 (cuadrado) para evitar que Minecraft lo aplaste en el marco y hotbar
            const size = Math.max(fW, fH);
            const canvas = document.createElement('canvas');
            canvas.width = size; canvas.height = size;
            const ctx = canvas.getContext('2d');
            const img = new Image();
            img.src = URL.createObjectURL(frames[0]);
            await new Promise(r => img.onload = r);
            const x = (size - fW) / 2;
            const y = (size - fH) / 2;
            ctx.drawImage(img, x, y, fW, fH);
            const squareBlob = await new Promise(r => canvas.toBlob(r, 'image/png'));
            itemFolder.file('_icon_2d.png', await squareBlob.arrayBuffer());
            itemTexRef = "textures/item/_icon_2d";
        }

        zip.folder('textures').file('item_texture.json', JSON.stringify({
            resource_pack_name: pName,
            texture_name: "atlas.items",
            texture_data: { "totem": { textures: itemTexRef } }
        }, null, 2));

        // 8. AUDIO (RECONSTRUCCIÓN FORENSE V324.2)
        if (files.audio) {
            showLoading('Inyectando Frecuencias...', 'Procesando Motor de Audio CDR (V324.2)...');
            const oggBlob = await convertAudioToOgg(files.audio);
            const soundDefs = {
                "format_version": "1.20.0",
                "sound_definitions": {
                    "random.totem": {
                        "category": "player",
                        "sounds": [
                            {
                                "name": "sounds/random/totem",
                                "volume": 2.0,
                                "pitch": 1.0,
                                "load_on_low_memory": true
                            }
                        ]
                    },
                    "item.totem.use": {
                        "category": "player",
                        "sounds": ["sounds/random/totem"]
                    }
                }
            };
            const soundDefsStr = JSON.stringify(soundDefs, null, 4);
            zip.file("sound_definitions.json", soundDefsStr); // Prioridad 1 (Raíz)
            zip.folder("sounds").file("sound_definitions.json", soundDefsStr); // Prioridad 2 (Carpeta)

            const oggBuffer = await oggBlob.arrayBuffer();
            zip.folder("sounds").folder("random").file("totem.ogg", oggBuffer);
        }

        // --- ICONO PREDETERMINADO ---
        if (files.icon) {
            zip.file('pack_icon.png', files.icon);
        } else {
            zip.file('pack_icon.png', frames[0]);
        }

        saveAs(await zip.generateAsync({ type: 'blob' }), `${packName}.mcpack`);
        hideLoading();
        ui.previewModal.classList.add('hidden');
        alert('¡Pack CDR Generado con Éxito!');
    } catch (e) {
        hideLoading();
        alert('Fallo en Generación CDR: ' + e.message);
    }
};

function openZoomModal(src) {
    const overlay = document.createElement('div');
    // MODO BLINDAJE: CSS INLINE con Z-Index Absoluto Máximo (Ignora cachés rotas)
    overlay.style.cssText = 'position:fixed;top:0;left:0;width:100vw;height:100vh;background:rgba(0,0,0,0.95);backdrop-filter:blur(20px);-webkit-backdrop-filter:blur(20px);display:flex;align-items:center;justify-content:center;z-index:2147483647;cursor:zoom-out;animation:zoom-fade-in 0.3s ease;';
    
    // Inyectamos también los keyframes necesarios si no existen
    if (!document.getElementById('zoom-anim-styles')) {
        const style = document.createElement('style');
        style.id = 'zoom-anim-styles';
        style.textContent = `
            @keyframes zoom-fade-in { from { opacity: 0; } to { opacity: 1; } }
            @keyframes zoom-pop-in { from { transform: scale(0.6); opacity: 0; } to { transform: scale(1); opacity: 1; } }
        `;
        document.head.appendChild(style);
    }

    overlay.innerHTML = `
        <div style="text-align:center; max-height:95vh; max-width:95vw; animation:zoom-pop-in 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);">
            <img src="${src}" alt="Zoom" style="max-height:80vh; max-width:100%; border:3px solid #ff0000; border-radius:18px; box-shadow:0 0 60px rgba(255,0,0,0.7); object-fit:contain;">
            <p style="margin-top:15px; font-weight:900; color:#ff0000; font-size:1.1rem; letter-spacing:2px; text-shadow:0 0 15px rgba(255,0,0,1);">👆 HAZ CLIC PARA CERRAR 👆</p>
        </div>
    `;
    overlay.onclick = () => document.body.removeChild(overlay);
    document.body.appendChild(overlay);
}

// --- INICIALIZACIÓN DE MOTOR HÍBRIDO ---
async function initHybridAI() {
    if (!ui.aiEngineMode) return;
    
    const defaultKey = ''; // Las llaves se cargan desde el archivo JSON del usuario o localStorage
    const savedKey = localStorage.getItem('photoroom_api_key_v2');
    
    if (!savedKey && defaultKey) {
        ui.photoroomKey.value = defaultKey;
        localStorage.setItem('photoroom_api_key_v2', defaultKey);
    } else if (savedKey) {
        ui.photoroomKey.value = savedKey;
    }
    ui.photoroomKey.addEventListener('input', () => {
        localStorage.setItem('photoroom_api_key_v2', ui.photoroomKey.value);
    });

    if (ui.aiEngineMode.value === 'local') {
        initMasterAI();
    }

    const savedHF = localStorage.getItem('hf_client_token_v3');
    if (savedHF) ui.hfToken.value = savedHF;
    ui.hfToken.addEventListener('input', () => {
        localStorage.setItem('hf_client_token_v3', ui.hfToken.value);
    });

    const savedRB = localStorage.getItem('removebg_api_key_v1');
    if (savedRB) ui.removebgKey.value = savedRB;
    ui.removebgKey.addEventListener('input', () => {
        localStorage.setItem('removebg_api_key_v1', ui.removebgKey.value);
    });

    const sRB = 'NS4QaxbFXfWCfqm3WADQtbcJ';
    const sPXU = 'pxnrrdhkfrgz24a';
    const sPXK = 'rkias8171f3o7ip8aqk0fgfe3nviqk2o2098rr797sc5k0rv9atc';

    if (!localStorage.getItem('removebg_api_key_v1')) {
        localStorage.setItem('removebg_api_key_v1', sRB);
        ui.removebgKey.value = sRB;
    }
    if (!localStorage.getItem('pixian_user_v1')) {
        localStorage.setItem('pixian_user_v1', sPXU);
        ui.pixianUser.value = sPXU;
    }
    if (!localStorage.getItem('pixian_key_v1')) {
        localStorage.setItem('pixian_key_v1', sPXK);
        ui.pixianKey.value = sPXK;
    }

    const savedPXU = localStorage.getItem('pixian_user_v1');
    const savedPXK = localStorage.getItem('pixian_key_v1');
    if (savedPXU) ui.pixianUser.value = savedPXU;
    if (savedPXK) ui.pixianKey.value = savedPXK;

    ui.pixianUser.addEventListener('input', () => localStorage.setItem('pixian_user_v1', ui.pixianUser.value));
    ui.pixianKey.addEventListener('input', () => localStorage.setItem('pixian_key_v1', ui.pixianKey.value));

    ui.aiEngineMode.addEventListener('change', () => {
        const mode = ui.aiEngineMode.value;
        ui.photoroomApiGroup.classList.toggle('hidden', mode !== 'cloud');
        ui.hfApiGroup.classList.toggle('hidden', mode !== 'hf-cloud');
        ui.removebgApiGroup.classList.toggle('hidden', mode !== 'removebg');
        ui.pixianApiGroup.classList.toggle('hidden', mode !== 'pixian');
        if (mode === 'local' || mode === 'local-server') initMasterAI();
    });

    async function loadRemoteConfig() {
        try {
            const resp = await fetch('.env');
            if (!resp.ok) return;
            const text = await resp.text();
            const lines = text.split('\n');
            lines.forEach(line => {
                const [key, val] = line.split('=');
                if (key && val) {
                    const cleanVal = val.trim();
                    if (key.includes('PHOTOROOM')) {
                        ui.photoroomKey.value = cleanVal;
                        localStorage.setItem('photoroom_api_key_v2', cleanVal);
                    }
                    if (key.includes('HF_TOKEN')) {
                        ui.hfToken.value = cleanVal;
                        localStorage.setItem('hf_client_token_v3', cleanVal);
                    }
                    if (key.includes('REMOVEBG_KEY')) {
                        ui.removebgKey.value = cleanVal;
                        localStorage.setItem('removebg_api_key_v1', cleanVal);
                    }
                    if (key.includes('PIXIAN_USER')) {
                        ui.pixianUser.value = cleanVal;
                        localStorage.setItem('pixian_user_v1', cleanVal);
                    }
                    if (key.includes('PIXIAN_KEY')) {
                        ui.pixianKey.value = cleanVal;
                        localStorage.setItem('pixian_key_v1', cleanVal);
                    }
                }
            });
            console.log("Config [.env] Inyectada con Éxito");
        } catch (e) {
            console.warn("No se encontró [.env] o error de lectura.");
        }
    }
    loadRemoteConfig();
}

async function initMasterAI() {
    try {
        const token = ui.hfToken.value;
        await AIEngine.init((res) => {
            if (res.status === 'progress') {
                ui.modelLoadingBox.classList.remove('hidden');
                const p = Math.round(res.progress);
                ui.modelProgressBar.style.width = `${p}%`;
                ui.modelProgressText.innerText = `Descargando Cerebro RMBG: ${p}%`;
            }
            if (res.status === 'ready' || res.status === 'done') {
                ui.modelStatusDot.classList.replace('red', 'green');
                ui.modelLoadingBox.classList.add('hidden');
                console.log("[App] IA Local Master Lista.");
            }
        }, token);
    } catch (e) {
        console.error("Error cargando cerebro local:", e);
    }
}

// --- MOTOR DE AUDIO ELITE (FFMPEG SYNC V328 - BYPASS MODE) ---
async function convertAudioToOgg(blob) {
    // Si ya es OGG, lo pasamos directo al pack
    if (blob.name && blob.name.toLowerCase().endsWith('.ogg')) {
        console.log("[Audio CDR] Formato OGG verificado. Integrando directamente.");
        return blob;
    }
    
    // Si no es OGG, avisamos al usuario (Blindaje Pro)
    alert("⚠️ AUDIO INVÁLIDO: El archivo no es .ogg. Para que Minecraft lo reconozca, debes subir un archivo .ogg nativo.");
    return blob;
}

document.querySelectorAll('.res-btn').forEach(btn => {
    btn.onclick = () => {
        document.querySelectorAll('.res-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        console.log(`[UI] Resolución Seleccionada: ${btn.dataset.res}x`);
    };
});

// --- CONTROL DE FPS DINÁMICO (V324.2) ---
ui.animFPS.oninput = () => {
    ui.fpsValue.innerText = ui.animFPS.value;
};

// --- CONTROL DINÁMICO DE API KEYS (V323.9) ---
function updateAIFields() {
    const mode = ui.aiEngineMode.value;
    
    // Ocultar todo primero
    ui.photoroomGroup.classList.add('hidden');
    ui.removebgGroup.classList.add('hidden');
    ui.hfGroup.classList.add('hidden');
    ui.pixianGroup.classList.add('hidden');
    
    // Mostrar solo lo relevante
    if (mode === 'photoroom') ui.photoroomGroup.classList.remove('hidden');
    if (mode === 'removebg') ui.removebgGroup.classList.remove('hidden');
    if (mode === 'hf-cloud') ui.hfGroup.classList.remove('hidden');
    if (mode === 'pixian') ui.pixianGroup.classList.remove('hidden');
}

ui.aiEngineMode.onchange = updateAIFields;
updateAIFields(); // Inicialización

// --- SISTEMA DE IMPORTACIÓN DE KEYS CDR ---
ui.importKeysBtn.onclick = () => ui.keysInput.click();

ui.keysInput.onchange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    try {
        const text = await file.text();
        const data = JSON.parse(text);

        if (data.photoroom) ui.photoroomKey.value = data.photoroom;
        if (data.removebg) ui.removebgKey.value = data.removebg;
        if (data.huggingface) ui.hfToken.value = data.huggingface;
        if (data.pixian_user) ui.pixianUser.value = data.pixian_user;
        if (data.pixian_key) ui.pixianKey.value = data.pixian_key;

        showHelp("🚀 Keys importadas con éxito. Ahora puedes seleccionar cualquier motor IA y tus credenciales estarán listas.");
        updateAIFields();
    } catch (err) {
        alert("Fallo al leer el archivo de llaves. Asegúrate de que sea un JSON válido.");
    }
};

// --- TOGGLE VISIBILIDAD DE KEYS (V324.0) ---
document.querySelectorAll('.key-toggle').forEach(toggle => {
    toggle.onclick = () => {
        const targetId = toggle.getAttribute('data-target');
        const input = document.getElementById(targetId);
        if (input.type === 'password') {
            input.type = 'text';
            toggle.innerText = '🔒';
        } else {
            input.type = 'password';
            toggle.innerText = '👁️';
        }
    };
});

initHybridAI(); // initMasterAI() es llamado internamente por initHybridAI si el modo es 'local'

// --- NÚCLEO DEL RELOJ CDR (V3 PAUSABLE) ---
let timerInterval = null;
function startTemporalCountdown(key) {
    if (timerInterval) clearInterval(timerInterval);
    
    timerInterval = setInterval(() => {
        let remaining = parseInt(localStorage.getItem(`CDR_T_REM_${key}`) || 0);
        
        if (remaining <= 0) {
            clearInterval(timerInterval);
            revokeSession("EXPIRED");
            return;
        }

        remaining--;
        
        // Guardar con firma para evitar hacks
        localStorage.setItem(`CDR_T_REM_${key}`, remaining);
        localStorage.setItem(`CDR_T_SIG_${key}`, signTimedData(key, remaining));

        // Feedback opcional en consola (Modo Admin)
        if (remaining % 60 === 0) {
             console.log(`[CDR Master] Tiempo restante: ${Math.round(remaining/60)} minutos.`);
        }
    }, 1000);
}

// --- SECURITY: Ya inicializado por window.addEventListener('load', checkAuth) arriba ---
// No llamar checkAuth() aquí para evitar doble ejecución.
