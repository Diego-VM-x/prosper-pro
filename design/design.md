# Bitácora de Diseño (Design Log)

Este documento registra los componentes estéticos, propósitos arquitectónicos y decisiones de diseño fundamentales del proyecto `test`.

## Registro de Cambios y Decisiones

### [2026-03-29 17:35] - Base del Proyecto y Sistema de Estilos
- **Archivo/Componente**: Estructura `app/` inicial (por defecto en Next.js).
- **Propósito Arquitectónico**: Proveer el esqueleto para un web app usando Next.js App Router.
- **Decisiones de Diseño**: 
  - Se descartó TailwindCSS para utilizar Vanilla CSS ("flexibilidad máxima") según la directriz estricta del protocolo de Web Application Development para impresiones estéticas muy superiores y control exacto.
  - La estética apuntará a UI ricas, vibrantes, adaptaciones a modo oscuro y micro-animaciones en futuras implementaciones.

### [2026-03-29] - Integración Visual Módulo Landing
- **Archivo/Componente**: `app/page.tsx` y `app/globals.css`.
- **Propósito Arquitectónico**: Desarrollar un portal público veloz para captar leads que conecten la idea de valor educacional.
- **Decisiones de Diseño**:
  - Incorporar Glassmorphism Navigation bar (`.glass-nav`) para scroll suave e inmersivo.
  - Entregar entradas cinéticas y modernas usando `@keyframes fadeSlideUp` sobre el texto para retención del ojo (micro-animaciones).
  - Utilizar Iconología Nativa en SVG (stroke: 2.5) reemplazando la rudeza gráfica de emojis crudos al ilustrar Features Financieras, inyectando un look corporativo joven y pulido.
