/**
 * MOTOR CLOUD PRO: Photoroom API
 * Máxima calidad para tótems HD (Servicio de Pago).
 */

const EnginePhotoroom = (() => {
    const process = async (blob, apiKey) => {
        const formData = new FormData();
        formData.append('image_file', blob);

        const response = await fetch('https://sdk.photoroom.com/v1/segment', {
            method: 'POST',
            headers: { 'x-api-key': apiKey },
            body: formData
        });

        if (!response.ok) {
            if (response.status === 402) throw new Error("CRÉDITOS AGOTADOS");
            throw new Error(`Photoroom Error: ${response.status}`);
        }

        return await response.blob();
    };

    return { process };
})();

