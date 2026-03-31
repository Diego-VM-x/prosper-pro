# Contexto del Proyecto: Prosper-Pro

## Estado Actual (31 de Marzo, 2026)
- **Objetivo**: Dashboard de Libertad Financiera y Educación Gamificada.
- **Tecnología**: Next.js 16.2.1 (App Router/Turbopack), Vanilla CSS, React 19, TypeScript.
- **Identidad**: Basada en "Prosper." (Azul Navy #1E3A6E y Verde Esmeralda #3DCC8E).
- **URL Local**: http://localhost:3000

## Reglas de Eficiencia de Tokens (AGENTS.md)
- **Lectura:** Solo archivos necesarios, ignorar carpetas pesadas (node_modules, .next, dist), usar resúmenes.
- **Escritura:** Respuestas concisas, ediciones parciales, confirmar tareas grandes (>50k tokens).
- **Memoria:** Consultar CONTEXT.md antes de preguntar, no repetir errores solucionados.
- **Optimización:** PC de bajos recursos (i3/4GB RAM), evitar librerías pesadas.

## Estructura de Archivos Clave
- `app/page.tsx` → Dashboard principal
- `app/components/Dashboard.tsx` → Widgets (stats, gráficos, metas, XP, comunidad, timer)
- `app/components/DashboardLayout.tsx` → Layout con Sidebar + Topbar + ThemeProvider
- `app/components/Sidebar.tsx` → Navegación lateral
- `app/components/Topbar.tsx` → Barra superior (búsqueda, tema, notificaciones)
- `app/components/ProtectedRoute.tsx` → Protección de rutas autenticadas
- `app/components/icons.tsx` → 20+ iconos SVG inline
- `app/login/page.tsx` → Login (Google + Email)
- `app/register/page.tsx` → Registro (Google + Email)
- `app/metas/page.tsx` → CRUD de metas con filtros
- `lib/firebase.ts` → Configuración Firebase
- `lib/contexts/AuthContext.tsx` → Contexto de autenticación
- `lib/seed.ts` → Datos de prueba para nuevos usuarios
- `lib/firestore/` → 8 módulos Firestore (goals, users, transactions, gamification, reminders, notifications, community, study)
- `types/index.ts` → Interfaces TypeScript (UserProfile, Goal, Transaction, XPState, etc.)

## Hitos Completados
- ✅ **Simplificación Web**: Eliminación de Capacitor/App nativa, aplanamiento de rutas.
- ✅ **Design Tokens**: Configuración de `globals.css` con soporte para Modo Oscuro/Claro.
- ✅ **Dashboard Core**: Sidebar, Topbar, Widgets de Metas, Analíticas, Comunidad y Gamificación.
- ✅ **Identidad Corporativa**: Integración de logos PNG reales y colores exactos de marca.
- ✅ **Firebase Auth**: Login/Registro con Google y Email/Password.
- ✅ **Firestore Integration**: 8 colecciones con suscripciones en tiempo real.
- ✅ **Mis Metas**: CRUD completo con filtrado, edición, eliminación y agregar fondos.
- ✅ **Gamificación**: Sistema de XP, niveles y logros.
- ✅ **Seed Data**: Datos automáticos para nuevos usuarios.
- ✅ **Túnel VS Code Activado**: Túnel `prosper-dev` iniciado para desarrollo remoto desde móvil.

## Pendientes Próximos
- [ ] Desarrollar módulo de "Cursos" de Academia Prosper.
- [ ] Páginas adicionales: Calendario, Finanzas, Comunidad, Configuración, Ayuda, Logros.

## Historial de Instrucciones
### 31/03/2026
- **Inicio de servidor**: `npm run dev` en localhost:3000 (nueva ventana PowerShell).
- **Commit local**: `2212c8e` - "feat: integración completa de Firebase con Firestore, CRUD de metas, auth mejorado y sistema de gamificación" (25 archivos, +1527/-669 líneas).
- **Nota**: No hay repositorio remoto configurado para push.

## Notas Técnicas
- El modo oscuro se activa mediante `data-theme="dark"` en el tag `<html>`.
- Usar variables CSS (`var(--token)`) para todos los estilos.
- El servidor de desarrollo corre en puerto 3000.
- Firestore usa `onSnapshot` para actualizaciones en tiempo real.
- Los datos locales se usan como fallback si Firestore no está disponible.
