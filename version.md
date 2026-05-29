# Historial de Versiones: Prosper-Pro

## [0.8.5 BETA] - 2026-05-29
### Corregido
- Dropdown móvil (hamburguesa): ahora cubre toda la pantalla (100dvh) con animación slideInLeft suave.
- Dropdown de usuario en móvil: convertido a bottom-sheet con bordes redondeados superiores, ancho completo y scroll.
- Nombre de usuario visible en la topbar móvil junto al avatar.
- Merge conflict sin resolver en `.mobile-user-dropdown` que rompía el CSS.
- Consolidados 4 `@keyframes fadeInUp` duplicados en una única canonical (20px) + `fadeInUpLarge` (40px) para landing page.
- Modal de notas de versión (`UpdateModal`): responsivo completo con anclaje inferior en ≤480px.

## [0.8.2] - 2026-05-28
### Añadido
- Historial de versiones inicializado.

### Cambiado
- Correcciones de responsividad en los menús desplegables del Topbar (`.user-dropdown` y `.notifications-dropdown`) para dispositivos móviles.
- Mejoras de responsividad en el modal principal de `Dashboard.tsx` (`max-height`, `align-items`).
