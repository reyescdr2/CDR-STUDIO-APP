/**
 * --- SOBERANO MODULAR HUB V500: ARQUITECTURA PURA ---
 * Orquestador central para motores aislados.
 */

const AIEngine = (() => {

    /**
     * PROCESAMIENTO MODULAR V500 (AISLAMIENTO TOTAL)
     */
    const process = async (blob, options = {}) => {
        const { onProgress, mode = 'local', apiKey, hfToken, removebgKey, pixianUser, pixianKey, strict } = options;
        const originalSize = blob.size;
        
        console.log(`[Soberano Hub] Iniciando Escaneo en Cascada: ${mode} | Strict: ${strict}`);
        
        const engines = [];
        
        // Determinar orden de prioridad según el modo seleccionado
        if (mode === 'cloud') {
            engines.push({ name: 'EnginePhotoroom', exec: () => EnginePhotoroom.process(blob, apiKey) });
        } else if (mode === 'pixian') {
            engines.push({ name: 'PixianEngine', exec: () => PixianEngine.process(blob, { user: pixianUser, key: pixianKey }) });
        } else if (mode === 'removebg') {
            engines.push({ name: 'RemoveBgEngine', exec: () => RemoveBgEngine.process(blob, removebgKey) });
        } else if (mode === 'hf-cloud') {
            engines.push({ name: 'EngineHF', exec: () => EngineHF.process(blob, hfToken) });
        }

        // Motores Locales SIEMPRE al final como rescate o por defecto
        engines.push({ name: 'EngineMediaPipe', exec: () => EngineMediaPipe.process(blob) });
        engines.push({ name: 'EngineBiRefNet', exec: () => EngineBiRefNet.process(blob, onProgress, strict) });

        for (const engine of engines) {
            try {
                console.log(`[Soberano Hub] Probando: ${engine.name}...`);
                const result = await engine.exec();
                
                // Si el tamaño cambió significativamente, asumimos éxito (recorte hecho)
                if (result.size !== originalSize) {
                    console.log(`[Soberano Hub] ¡Éxito con ${engine.name}!`);
                    return result;
                } else {
                    console.warn(`[Soberano Hub] ${engine.name} devolvió original. Saltando...`);
                }
            } catch (e) {
                console.warn(`[Soberano Hub] ${engine.name} falló:`, e.message);
            }
        }

        console.error("[Soberano Hub] Fallo total: No hay motores disponibles para este frame.");
        return blob;
    };

    /**
     * Inicialización del motor local
     */
    const init = async (onProgress, hfToken) => {
        return await EngineBiRefNet.init(onProgress, hfToken);
    };

    return { process, init };
})();

// --- CDR FOUNDATION SYNC V60 ---





