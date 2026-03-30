# Bitácora de Diseño (Design Log)

Este documento registra los componentes estéticos, propósitos arquitectónicos y decisiones de diseño fundamentales del proyecto `test`.

## Registro de Cambios y Decisiones

### [2026-03-29 21:40] - Estructura Tripartita (APP, WEB, Publicidad)
- **Archivo/Componente**: Directorios `app/(app)`, `app/(web)`, `app/(publicidad)`.
- **Propósito Arquitectónico**: Segmentación modular de la experiencia del usuario. 
  - `(app)` se reserva para la lógica de aplicación móvil/PWA.
  - `(web)` es el portal de escritorio principal.
  - `(publicidad)` gestiona landings de captación de alta performance.
- **Decisiones de Diseño**: 
  - Uso de **Route Groups** para mantener layouts raíz compartidos pero lógicas de página independientes.
  - Creación del skill `firebase-connector` para centralizar la gestión de servicios en la nube.

### [2026-03-29 17:35] - Base del Proyecto y Sistema de Estilos
- **Archivo/Componente**: Estructura `app/` inicial (por defecto en Next.js).
- **Propósito Arquitectónico**: Proveer el esqueleto para un web app usando Next.js App Router.
- **Decisiones de Diseño**: 
  - Se descartó TailwindCSS para utilizar Vanilla CSS ("flexibilidad máxima") según la directriz estricta del protocolo de Web Application Development para impresiones estéticas muy superiores y control exacto.
  - La estética apuntará a UI ricas, vibrantes, adaptaciones a modo oscuro y micro-animaciones en futuras implementaciones.
