/**
 * MOTOR HIPER-VELOCIDAD: Local rembg Server
 * Conexión directa con el hardware (Puerto 7000).
 */

const EngineLocalServer = (() => {
    const process = async (blob) => {
        const url = 'http://localhost:7000/';
        try {
            const formData = new FormData();
            formData.append('file', blob);

            const response = await fetch(url, {
                method: 'POST',
                body: formData
            });

            if (!response.ok) throw new Error("Server Local Inactivo");
            return await response.blob();
        } catch (e) {
            throw new Error("Local Server Off: Use Master Engine.");
        }
    };

    return { process };
})();

