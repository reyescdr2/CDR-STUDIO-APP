/**
 * MOTOR CLOUD: Hugging Face Inference API
 * Procesamiento gratuito de alta capacidad.
 */

const EngineHF = (() => {
    const process = async (blob, token) => {
        const model = "briaai/RMBG-1.4"; 
        const url = `https://api-inference.huggingface.co/models/${model}`;
        
        let attempts = 0;
        const maxAttempts = 3;

        while (attempts < maxAttempts) {
            const response = await fetch(`${url}?wait_for_model=true&use_cache=false`, {
                method: 'POST',
                headers: { 
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/octet-stream'
                },
                body: blob
            });

            if (response.status === 503 || response.status === 429) {
                // El modelo se está cargando o hay demasiadas peticiones, esperamos 2 segundos
                console.warn(`[HF Cloud] Modelo cargándose (503), reintentando... ${attempts + 1}/${maxAttempts}`);
                await new Promise(r => setTimeout(r, 2500));
                attempts++;
                continue;
            }

            if (!response.ok) {
                const err = await response.json().catch(() => ({ error: "HF Cloud Offline" }));
                throw new Error(`HF Error: ${err.error || response.status}`);
            }

            return await response.blob();
        }

        throw new Error("El modelo de Hugging Face tardó demasiado en cargar.");
    };

    return { process };
})();

