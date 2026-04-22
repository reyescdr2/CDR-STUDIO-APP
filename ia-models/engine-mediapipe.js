/**
 * MOTOR LIGHT: MediaPipe Selfie Segmentation
 * Alta velocidad y 0 dependencias externas pesadas.
 */

const EngineMediaPipe = (() => {
    let selfieSegmentation = null;
    let canvas = document.createElement('canvas');
    let ctx = canvas.getContext('2d');

    const init = async () => {
        if (selfieSegmentation) return selfieSegmentation;
        
        selfieSegmentation = new SelfieSegmentation({
            locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/selfie_segmentation/${file}`
        });

        selfieSegmentation.setOptions({
            modelSelection: 1, // General model (HD)
        });

        return selfieSegmentation;
    };

    const process = async (blob) => {
        const seg = await init();
        const img = new Image();
        img.src = URL.createObjectURL(blob);
        await new Promise(r => img.onload = r);

        canvas.width = img.width;
        canvas.height = img.height;

        let resultsPromise = new Promise(resolve => {
            seg.onResults(resolve);
        });

        await seg.send({ image: img });
        const results = await resultsPromise;

        // Limpieza de recursos
        URL.revokeObjectURL(img.src);

        // Procesar máscara MediaPipe
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // Dibujamos la máscara blanca y negra
        ctx.drawImage(results.segmentationMask, 0, 0, canvas.width, canvas.height);
        
        const maskData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const mPixels = maskData.data;

        // Dibujamos la imagen original
        ctx.globalCompositeOperation = 'source-over';
        ctx.drawImage(img, 0, 0);
        
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const pixels = imageData.data;

        // --- ESCULPIDO ANIME V1250 (Hilo-Fino + Skin Guard) ---
        for (let i = 0; i < pixels.length; i += 4) {
            const pixelIdx = i / 4;
            const x = pixelIdx % canvas.width;
            const y = Math.floor(pixelIdx / canvas.width);
            
            let prob = mPixels[i]; 
            const r = pixels[i], g = pixels[i+1], b = pixels[i+2];
            
            // 1. SKIN-GUARD
            const isSkin = (r > 190 && g > 150 && b > 120 && r > b + 20);
            if (isSkin && prob > 80) prob = Math.max(prob, 210);

            // 2. HALO-SHAVE (Erosión 1px)
            if (prob < 200 && prob > 40) {
                let hasVoid = false;
                if (x > 0 && mPixels[(pixelIdx - 1) * 4] < 40) hasVoid = true;
                if (x < canvas.width - 1 && mPixels[(pixelIdx + 1) * 4] < 40) hasVoid = true;
                if (y > 0 && mPixels[(pixelIdx - canvas.width) * 4] < 40) hasVoid = true;
                if (y < canvas.height - 1 && mPixels[(pixelIdx + canvas.width) * 4] < 40) hasVoid = true;
                if (hasVoid) prob = Math.round(prob * 0.4);
            }

            if (prob > 180) {
                pixels[i + 3] = 255;
            } else if (prob < 15) {
                pixels[i + 3] = 0;
            } else {
                const normalized = prob / 255;
                pixels[i + 3] = Math.round(Math.pow(normalized, 0.9) * 255);
            }
        }

        ctx.putImageData(imageData, 0, 0);
        return new Promise(r => canvas.toBlob(r, 'image/png'));
    };

    return { process, init };
})();

