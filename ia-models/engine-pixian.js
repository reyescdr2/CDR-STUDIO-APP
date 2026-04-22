/**
 * Motor de Inyección CDR: Pixian.ai (Ultra-Rápido)
 * V250 Sovereignty
 */
const PixianEngine = {
    async process(blob, options = {}) {
        const { user, key } = options;
        if (!user || !key) throw new Error("Credenciales de Pixian.ai no configuradas.");

        const formData = new FormData();
        formData.append('image', blob);

        // Pixian requiere Auth Básica en el Header
        const auth = btoa(`${user}:${key}`);

        const response = await fetch('https://api.pixian.ai/api/v2/remove-background', {
            method: 'POST',
            headers: { 
                'Authorization': `Basic ${auth}`
            },
            body: formData
        });

        if (!response.ok) {
            const err = await response.json().catch(() => ({}));
            throw new Error(err.error?.message || `Error Pixian: ${response.status}`);
        }

        return await response.blob();
    }
};

