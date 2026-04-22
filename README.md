# CDR-STUDIO 🚀

Sistema avanzado para la generación automática de packs de tótems para Minecraft, con optimización inteligente y gestión de licencias.

## 🛠️ Desarrollo (Entorno Moderno)

Hemos migrado el proyecto a un sistema basado en **NPM** y **Vite** para una mejor experiencia de desarrollo.

### Requisitos
- [Node.js](https://nodejs.org/) instalado.

### Instalación
```bash
npm install
```

### Ejecutar Localmente (Servidor de Desarrollo)
```bash
npm run dev
```

### Construir para Producción
```bash
npm run build
```

## 🔐 Seguridad y Licencias
El proyecto utiliza un sistema de firmas digitales (SHA-256) para validar las llaves de acceso:
- **CDR-E-**: Vinculadas al correo.
- **CDR-S-**: Vinculadas al dispositivo.
- **CDR-P-**: Llaves Premium maestras.

## 📁 Estructura
- `index.html`: Interfaz principal (UI).
- `app.js`: Lógica de validación y procesos.
- `config.js`: Configuración del Webhook de Discord.
- `blacklist.js`: Lista de llaves revocadas.

---
*Desarrollado por CDR FOUNDATION*

