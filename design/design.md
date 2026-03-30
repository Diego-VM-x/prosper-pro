# Bitácora de Diseño (Design Log)

Este documento registra los componentes estéticos, propósitos arquitectónicos y decisiones de diseño fundamentales del proyecto `Prosper Pro`.

## Registro de Cambios y Decisiones

### [2026-03-30 17:10] - Interfaz de Autenticación Premium (Auth Flows)
- **Archivos/Componentes**: `app/login/page.tsx`, `app/register/page.tsx`, `auth.css`, `AuthContext.tsx`.
- **Propósito Arquitectónico**: Integración del flujo de acceso seguro con Firebase respetando la identidad visual de marca.
- **Decisiones de Diseño**:
  - **Layout**: Diseño centrado de tarjeta blanca sobre fondo degradado Navy a Verde Pino (`radial-gradient`), creando una atmósfera de seguridad y exclusividad.
  - **Identidad**: Uso del logo oficial (`logo-icon.png`) y tipografía de marca (`Prosper.`) con el punto verde esmeralda para una coherencia total con el Dashboard.
  - **Interacción**: Estados de carga (`disabled/opacity`) en botones y campos durante la autenticación. Animaciones sutiles (`entrance-fade`) para alertas de error.
  - **Optimización**: Migración de estilos inline a `auth.css` físico para eliminar el FOUC (parpadeo de estilos) en la carga inicial.

### [2026-03-30 15:40] - Vista Detallada de Metas y Dashboard Atómico
- **Archivos/Componentes**: `app/metas/page.tsx`, `DashboardLayout.tsx`, `Sidebar.tsx`, `icons.tsx`.
- **Propósito Arquitectónico**: Expandir la funcionalidad del dashboard manteniendo consistencia visual y estructural mediante un layout compartido.
- **Decisiones de Diseño**:
  - **Layout**: Implementación de `DashboardLayout` como HOC (Higher-Order Component) para inyectar Sidebar/Topbar consistentemente y manejar el estado del menú móvil.
  - **Componentes**: Tarjetas de meta de ancho completo (`goal-wide-card`) con barras de progreso animadas, chips de filtrado interactivos y sistema de estados dinámicos (Colores por categoría: Ahorro/Verde, Inversión/Navy, Educación/Emerald).
  - **Interacción**: Efectos de hover con desplazamiento horizontal (`translateX(4px)`) y sombras suaves para reforzar la profundidad en la lista de metas.

### [2026-03-30 15:20] - Identidad Visual Oficial Prosper (Emerald & Navy)
- **Archivos/Componentes**: `globals.css`, `Sidebar.tsx`, `Topbar.tsx`.
- **Propósito Arquitectónico**: Unificación de la marca Prosper Pro en toda la plataforma.
- **Decisiones de Diseño**:
  - **Paleta**: Reemplazo de Verde Pino por **Verde Esmeralda (#3DCC8E)** para elementos de acción y **Azul Navy (#1E3A6E)** para tipografía y fondos de énfasis.
  - **Navegación**: Refactorización a `Next/Link` en el `Sidebar` para eliminar recargas de página completas.
  - **Identidad**: Uso de gradientes lineales entre Navy y Emerald en cards destacados para un look premium.

### [2026-03-30 09:45] - Dashboard Completo con Design Tokens y Modo Oscuro/Claro
- **Archivos/Componentes**: `globals.css`, `ThemeProvider.tsx`, `Sidebar.tsx`, `Topbar.tsx`, `Dashboard.tsx`, `icons.tsx`.
- **Propósito Arquitectónico**: Implementación completa del dashboard principal de Prosper-Pro como punto de partida visual y funcional.
- **Decisiones de Diseño**:
  - **Paleta**: Verde Pino (`#2B8560` como color primario) + Gris Piedra (escala `stone-50` a `stone-950`), extraída de la referencia visual "Donezo".
  - **Tipografía**: Inter (Google Fonts) con pesos 300-800 para jerarquía clara.
  - **Modo Oscuro**: Sistema `data-theme="dark"` en `<html>` con overrides de CSS custom properties. Persistencia en `localStorage`, detección de preferencia del sistema operativo (`prefers-color-scheme`).
  - **Componentes**: Sidebar con navegación agrupada (Menú, Aprendizaje, General), Topbar con buscador y toggle de tema, stat cards con gradiente featured, gráficos de barras con tooltips, anillo de progreso circular SVG, timer interactivo, barra de XP gamificada, y sección de logros.
  - **Iconos**: Librería SVG inline propia (`icons.tsx`) para evitar dependencias externas (17 iconos).
  - **Responsive**: Breakpoints en 1280px, 1024px, 768px con sidebar colapsable y grids adaptativos.

### [2026-03-30 09:30] - Pivot hacia Sitio Web Puro y Simplificación de Rutas
- **Archivo/Componente**: Raíz del directorio `app/`.
- **Propósito Arquitectónico**: Reducción de complejidad operativa. Se eliminan los Route Groups `(app)`, `(web)` y `(publicidad)`.
- **Decisiones de Diseño**:
  - La página principal se movió de `app/(web)/page.tsx` a `app/page.tsx` para seguir el estándar de Next.js App Router para proyectos mono-sitio.
  - Se archivaron las skills de arquitectura tripartita en `.agent/skills/app-exclusive/` para mantener la base de conocimiento sin interferir en el desarrollo web actual.
  - Se eliminó Capacitor/Android para aligerar el repositorio.

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

## Design Tokens (Referencia Rápida)

### Paleta Verde Pino
| Token | HEX | Uso |
|:------|:------|:----|
| `--color-pine-900` | `#0D2B1E` | Fondos premium oscuros |
| `--color-pine-500` | `#2B8560` | **Color primario / CTA** |
| `--color-pine-300` | `#62BF97` | Acentos suaves |
| `--color-pine-50`  | `#EEF8F3` | Fondos de hover claro |

### Paleta Stone (Neutros)
| Token | HEX | Uso |
|:------|:------|:----|
| `--color-stone-950` | `#0C0A09` | Fondo dark mode |
| `--color-stone-900` | `#1C1917` | Cards dark mode |
| `--color-stone-50`  | `#FAFAF9` | Fondo light mode |

### Acentos Semánticos
| Token | HEX | Uso |
|:------|:------|:----|
| `--color-gold-500` | `#F59E0B` | Pendientes / warnings |
| `--color-red-500`  | `#EF4444` | Error / stop |
| `--color-blue-500` | `#3B82F6` | En progreso / info |
