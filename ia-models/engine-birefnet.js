/**
 * MOTOR SOBERANO: BiRefNet (Local Master)
 * IA Ilimitada ejecutada en el navegador.
 */

const EngineBiRefNet = (() => {
    let segmenter = null;
    let isLoading = false;

    const init = async (onProgress, token) => {
        if (segmenter) return segmenter;
        if (isLoading) {
            return new Promise(resolve => {
                const check = setInterval(() => {
                    if (segmenter) { clearInterval(check); resolve(segmenter); }
                }, 100);
            });
        }

        isLoading = true;
        try {
            const { pipeline, env } = await import('https://cdn.jsdelivr.net/npm/@huggingface/transformers@latest');
            env.allowLocalModels = false;
            env.useBrowserCache = true;

            // --- V800 FINAL ATTACK: Usando Xenova/RMBG-1.4 (PÚBLICO Y COMPATIBLE) ---
            const modelId = 'Xenova/rmbg-1.4';
            console.log(`[V800 Master] Intentando carga pública de: ${modelId}`);
            
            segmenter = await pipeline('image-segmentation', modelId, {
                device: 'webgpu',
                // Eliminamos el token para descarga pública directa (Evitar 401)
                progress_callback: (res) => { if (onProgress) onProgress(res); }
            }).catch(async (err) => {
                console.warn("[V800 Master] WebGPU falló, reintentando en CPU...", err);
                return await pipeline('image-segmentation', modelId, {
                    device: 'cpu',
                    progress_callback: (res) => { if (onProgress) onProgress(res); }
                });
            });

            isLoading = false;
            console.log("[V800 Master] IA Lista y Cargada.");
            return segmenter;
        } catch (e) {
            isLoading = false;
            console.error("[V800 Critical Fallback] Error inyectando cerebro pública:", e);
            throw e;
        }
    };

    const process = async (blob, onProgress, strict = false) => {
        const seg = await init(onProgress);
        const imgUrl = URL.createObjectURL(blob);
        
        try {
            console.log("[V900 Forensic] Iniciando Segmentación...");
            const results = await seg(imgUrl);
            if (!results || !results[0]) throw new Error("No se pudo extraer la máscara del sujeto.");
            
            const result = results[0];
            let mask = result.mask; // RawImage
            
            const img = new Image();
            img.src = imgUrl;
            await new Promise((resolve, reject) => {
                img.onload = resolve;
                img.onerror = () => reject(new Error("Error cargando imagen para compuesto."));
            });

            const W = img.width, H = img.height;
            console.log(`[V900 Forensic] Escaneando: ${W}x${H}`);

            if (mask.width !== W || mask.height !== H) {
                mask = await mask.resize(W, H);
            }

            const mData = mask.data;
            const channels = mask.channels || 1;

            // --- DETECTOR AUTOMÁTICO DE INVERSIÓN (Forensic Pass) ---
            // Si las 4 esquinas son blancas (>200), la máscara está invertida.
            const corners = [0, W - 1, (H - 1) * W, H * W - 1];
            let cornerSum = 0;
            corners.forEach(c => cornerSum += mData[c * channels]);
            const isInverted = (cornerSum / 4) > 200;
            if (isInverted) console.warn("[V900 Forensic] ¡Máscara Invertida Detectada! Corrigiendo...");

            const canvas = document.createElement('canvas');
            canvas.width = W; canvas.height = H;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0);
            
            const imageData = ctx.getImageData(0, 0, W, H);
            const pixels = imageData.data;

            // --- ESCULPIDO DIAMANTE CDR V1500 (Bisturí de Alta Fidelidad) ---
            for (let i = 0; i < pixels.length; i += 4) {
                const pixelIdx = i / 4;
                const dataIdx = pixelIdx * channels;
                const x = pixelIdx % W;
                const y = Math.floor(pixelIdx / W);
                
                let prob = mData[dataIdx];
                if (isInverted) prob = 255 - prob;

                // 1. SKIN-GUARD CDR (Protector de Sujeto)
                const r = pixels[i], g = pixels[i+1], b = pixels[i+2];
                // Detección de tonos humanos/anime (durazno/piel)
                const isSkin = (r > 180 && g > 140 && b > 110 && r > b + 15); 
                const isBright = (r > 235 && g > 235 && b > 235); 
                
                if ((isSkin || isBright) && prob > 60) {
                    prob = Math.max(prob, 230); // Protección reforzada
                }

                // 2. HALO-SHAVE ULTRA (Erosión Diamante V1500)
                // Aumentamos el contraste de la máscara cerca de los bordes
                const edgeThreshold = strict ? 235 : 210;
                const shaveFactor = strict ? 0.05 : 0.25; // 0.05 es recorte QUIRÚRGICO
                
                if (prob < edgeThreshold && prob > 20) {
                    let hasVoid = false;
                    // Escaneo extendido de 8 vecinos (Caja) para máxima limpieza de halos
                    const neighbors = [-1, 1, -W, W, -W-1, -W+1, W-1, W+1];
                    for (let n of neighbors) {
                        const ni = pixelIdx + n;
                        if (ni >= 0 && ni < mData.length / channels && mData[ni * channels] < 15) {
                            hasVoid = true;
                            break;
                        }
                    }
                    
                    if (hasVoid) {
                        prob = Math.round(prob * shaveFactor); 
                    }
                }

                // 3. CURVA DE AFLIADO (BORDE DE DIAMANTE)
                // Aplicamos una curva sigmoide agresiva para que el borde sea sólido
                let alpha = 0;
                const upperLimit = strict ? 220 : 190;
                const lowerLimit = strict ? 40 : 25;

                if (prob > upperLimit) {
                    alpha = 255;
                } else if (prob < lowerLimit) {
                    alpha = 0;
                } else {
                    const normalized = (prob - lowerLimit) / (upperLimit - lowerLimit);
                    // Elevamos a una potencia para "adelgazar" los bordes semitransparentes
                    const power = strict ? 2.5 : 1.8; 
                    alpha = Math.round(Math.pow(normalized, power) * 255);
                }

                pixels[i + 3] = alpha;
            }

            ctx.putImageData(imageData, 0, 0);
            URL.revokeObjectURL(imgUrl);
            console.log("[V900 Forensic] Limpieza Diamante Finalizada.");
            
            return new Promise(r => canvas.toBlob(r, 'image/png'));
        } catch (e) {
            console.error("[V900 Error]", e);
            URL.revokeObjectURL(imgUrl);
            throw e;
        }
    };

    return { process, init };
})();

