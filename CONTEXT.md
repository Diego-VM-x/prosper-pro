# Contexto del Proyecto: Prosper-Pro

## Estado Actual (01 de Abril, 2026 - Actualizado)
- **Objetivo**: Dashboard de Libertad Financiera y Educación Gamificada.
- **Tecnología**: Next.js 16.2.1 (App Router/Turbopack), Vanilla CSS, React 19, TypeScript.
- **Identidad**: Basada en "Prosper." (Azul Navy #1E3A6E y Verde Esmeralda #3DCC8E).
- **URL Local**: http://localhost:3000
- **Modo**: App inicia en BLANCO - sin datos de ejemplo. Todo dato viene de Firebase.

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
- `app/components/Topbar.tsx` → Barra superior (búsqueda, tema, notificaciones push)
- `app/components/ProtectedRoute.tsx` → Protección de rutas autenticadas
- `app/components/icons.tsx` → 21 iconos SVG inline (incluye IconCheck)
- `app/login/page.tsx` → Login (Google + Email)
- `app/register/page.tsx` → Registro (Google + Email)
- `app/metas/page.tsx` → CRUD de metas con filtros
- `app/cursos/page.tsx` → Listado de cursos con progreso
- `app/cursos/[id]/page.tsx` → Detalle de curso con módulos
- `app/calendario/page.tsx` → Calendario con recordatorios
- `app/finanzas/page.tsx` → Transacciones con filtros
- `app/configuracion/page.tsx` → Perfil, tema, cuenta
- `lib/firebase.ts` → Configuración Firebase
- `lib/contexts/AuthContext.tsx` → Contexto de autenticación
- `lib/seed.ts` → Vacío (sin datos de ejemplo)
- `lib/csvParser.ts` → Parser e importador de CSV a Firestore
- `lib/firestore/` → 8 módulos Firestore (goals, users, transactions, gamification, reminders, notifications, community, study, courses)
- `types/index.ts` → Interfaces TypeScript (UserProfile, Goal, Transaction, XPState, Course, etc.)

## Hitos Completados
- ✅ **Simplificación Web**: Eliminación de Capacitor/App nativa, aplanamiento de rutas.
- ✅ **Design Tokens**: Configuración de `globals.css` con soporte para Modo Oscuro/Claro.
- ✅ **Dashboard Core**: Sidebar, Topbar, Widgets de Metas, Analíticas, Comunidad y Gamificación.
- ✅ **Identidad Corporativa**: Integración de logos PNG reales y colores exactos de marca.
- ✅ **Firebase Auth**: Login/Registro con Google y Email/Password.
- ✅ **Firestore Integration**: 8 colecciones con suscripciones en tiempo real.
- ✅ **Mis Metas**: CRUD completo con filtrado, edición, eliminación y agregar fondos.
- ✅ **Gamificación**: Sistema de XP, niveles y logros.
- ✅ **Datos en Blanco**: Eliminados todos los datos de ejemplo. App inicia vacía.
- ✅ **Cursos Academia**: Listado con progreso, detalle con módulos, inscripción, XP reward.
- ✅ **Importar CSV**: Modal funcional con parser, validación y reporte de errores.
- ✅ **Configuración**: Página de perfil (nombre, foto, email, tema, cuenta).
- ✅ **Comunidad CRUD**: Funciones add/delete miembros.
- ✅ **Notificaciones Push**: Permiso del navegador + envío automático.
- ✅ **Responsive Completo**: Todas las páginas adaptadas a móvil/tablet (metas, cursos, finanzas, calendario, configuración, login).
- ✅ **Topbar Estético**: Dropdown de usuario con gradiente, animaciones y diseño moderno.
- ✅ **Configuración Rediseñada**: Página con tarjeta de perfil gradiente, lista de ajustes con iconos, modal de eliminación mejorado.
- ✅ **Sincronización Metas-Calendario**: Campo fecha en metas usa `input type="date"` que se sincroniza con el calendario.

## Historial de Instrucciones
### 01/04/2026
- **Sincronización Firebase completa**: Todos los datos modificables conectados a Firestore.
- **Datos en blanco**: Seed eliminado, datos por defecto removidos de todos los componentes.
- **Skills ejecutadas**: orquestador-maestro, modo-produccion, guardian-del-diseno, firebase-connector, planificacion-pro, memoria-persistente.
- **Responsive + Estética**: Todas las webs responsivas, Topbar con dropdown mejorado, Configuración rediseñada, fecha de metas sincronizada con calendario.

## Notas Técnicas
- El modo oscuro se activa mediante `data-theme="dark"` en el tag `<html>`.
- Usar variables CSS (`var(--token)`) para todos los estilos.
- El servidor de desarrollo corre en puerto 3000.
- Firestore usa `onSnapshot` para actualizaciones en tiempo real.
- **Sin datos de ejemplo**: Todo dato debe ser creado por el usuario o importado via CSV.
- **Cursos**: Se crean manualmente (no hay seed automático).
- **Fecha de metas**: Usa `input type="date"` que guarda formato ISO `YYYY-MM-DD`, compatible con el calendario.
- **Build**: Next.js 16.2.1 con Turbopack, compilación exitosa sin errores TypeScript.
