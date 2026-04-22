/**
 * Motor de Inyección CDR: Clipdrop (Stability AI Pro)
 * V240 Sovereignty
 */
const ClipdropEngine = {
    async process(blob, apiKey) {
        if (!apiKey) throw new Error("API Key de Clipdrop no configurada.");

        const formData = new FormData();
        formData.append('image_file', blob);

        const response = await fetch('https://apis.clipdrop.co/remove-background/v1', {
            method: 'POST',
            headers: { 'x-api-key': apiKey },
            body: formData
        });

        if (!response.ok) {
            const err = await response.json().catch(() => ({}));
            throw new Error(err.error || `Error Clipdrop: ${response.status}`);
        }

        return await response.blob();
    }
};

