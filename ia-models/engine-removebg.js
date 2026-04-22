/**
 * Motor de Inyección CDR: Remove.bg (Industry Standard)
 * V240 Sovereignty
 */
const RemoveBgEngine = {
    async process(blob, apiKey) {
        if (!apiKey) throw new Error("API Key de Remove.bg no configurada.");

        const formData = new FormData();
        formData.append('image_file', blob);
        formData.append('size', 'auto');

        const response = await fetch('https://api.remove.bg/v1.0/removebg', {
            method: 'POST',
            headers: { 'X-Api-Key': apiKey },
            body: formData
        });

        if (!response.ok) {
            const err = await response.json().catch(() => ({}));
            throw new Error(err.errors?.[0]?.title || `Error Remove.bg: ${response.status}`);
        }

        return await response.blob();
    }
};

