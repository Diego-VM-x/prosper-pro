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
- `app/components/Dashboard.tsx` → Widgets (stats, gráficos, metas, XP, comunidad, avisos recientes)
- `app/components/DashboardLayout.tsx` → Layout con Sidebar + Topbar + ThemeProvider + GoalsProvider
- `app/components/Sidebar.tsx` → Navegación lateral
- `app/components/Topbar.tsx` → Barra superior (búsqueda, tema, notificaciones push)
- `app/components/ProtectedRoute.tsx` → Protección de rutas autenticadas
- `app/components/icons.tsx` → 21 iconos SVG inline (incluye IconCheck)
- `app/login/page.tsx` → Login (Google + Email)
- `app/register/page.tsx` → Registro (Google + Email)
- `app/metas/page.tsx` → CRUD de metas con filtros (reactivo via GoalsContext)
- `app/cursos/page.tsx` → Listado de cursos con progreso
- `app/cursos/[id]/page.tsx` → Detalle de curso con módulos
- `app/calendario/page.tsx` → Calendario con recordatorios y metas sincronizadas
- `app/finanzas/page.tsx` → Transacciones con filtros
- `app/configuracion/page.tsx` → Perfil, tema, cuenta
- `lib/firebase.ts` → Configuración Firebase
- `lib/contexts/AuthContext.tsx` → Contexto de autenticación
- `lib/contexts/GoalsContext.tsx` → Contexto reactivo de metas y recordatorios (onSnapshot)
- `lib/seed.ts` → Vacío (sin datos de ejemplo)
- `lib/csvParser.ts` → Parser e importador de CSV a Firestore
- `lib/firestore/` → 8 módulos Firestore (goals, users, transactions, gamification, reminders, notifications, community, courses)
- `types/index.ts` → Interfaces TypeScript (UserProfile, Goal, Transaction, XPState, Course, etc.)

## Hitos Completados
- ✅ **Sincronización Metas-Calendario Corregida (02/04/2026)**: Corregida creación de metas que no aparecían por falta de `userId` y problemas de formato de fecha en el calendario.
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
- ✅ **Timer de Estudio Eliminado**: Removido widget del Dashboard, archivo `lib/firestore/study.ts`, interfaz `StudySession` de `types/index.ts`, y referencia en `AuthContext.tsx`. Build exitoso.
- ✅ **Optimización Firestore**: Todas las vistas cambiadas de `onSnapshot` a `getDocs` (una sola lectura por navegación). Eliminadas conexiones abiertas innecesarias en Dashboard, Metas, Finanzas, Calendario, Cursos, Sidebar y Configuración. Community query optimizada con `Promise.all` en vez de N+1.
- ✅ **Reactividad Global con GoalsContext (01/04/2026)**:
  - Nuevo `lib/contexts/GoalsContext.tsx` con `onSnapshot` para `goals` y `reminders` en tiempo real.
  - Dashboard, Metas y Calendario ahora usan `useGoals()` - datos sincronizados automáticamente.
  - Sección "Avisos Recientes" en Dashboard: muestra metas y recordatorios que vencen HOY.
  - Botón "+ Recordatorio" en Calendario al seleccionar un día.
  - Metas aparecen en calendario con color original; recordatorios con color por tipo.
  - Todos los listeners limpian con `unsubscribe()` - sin fugas de memoria.
- ✅ **Bug Fixes Producción (01/04/2026)**:
  - Dashboard: Eliminado botón "Importar Datos" y modal CSV. Flechas (↗) de tarjetas ahora son funcionales con `useRouter` → `/metas`, `/finanzas`, `/cursos`.
  - Metas: Corregido bug de edición con nueva función `createGoalWithId()` en `goals.ts` (usa `setDoc` con ID explícito).
  - Configuración: Foto de perfil con compresión Canvas (300px, 0.7 calidad) + subida a Firebase Storage. Eliminación de cuenta refactorizada (Storage → Firestore → Auth). Botón "Eliminar" visible en modo claro.

## Historial de Instrucciones
### 02/04/2026
- **Bug Fix Metas y Calendario**: Corregida la creación de metas que no aparecían por falta de validación de `userId` y problemas de formato de fecha en el calendario.
- **Git Push + Dev Server**: Cambios subidos al repositorio y servidor de desarrollo activo.

### 01/04/2026
- **Sincronización Firebase completa**: Todos los datos modificables conectados a Firestore.
- **Datos en blanco**: Seed eliminado, datos por defecto removidos de todos los componentes.
- **Skills ejecutadas**: orquestador-maestro, modo-produccion, guardian-del-diseno, firebase-connector, planificacion-pro, memoria-persistente.
- **Responsive + Estética**: Todas las webs responsivas, Topbar con dropdown mejorado, Configuración rediseñada, fecha de metas sincronizada con calendario.
- **Timer eliminado**: Widget de estudio removido por ser innecesario.
- **Bug Fixes Producción**: Dashboard (flechas funcionales, import CSV eliminado), Metas (bug edición corregido), Configuración (foto con compresión + Storage, eliminación de cuenta refactorizada).
- **Reactividad Global + Sistema de Alertas**: GoalsContext con onSnapshot implementado. Dashboard, Metas y Calendario sincronizados en tiempo real. Avisos recientes y botón de añadir recordatorio añadidos.

## Notas Técnicas
- El modo oscuro se activa mediante `data-theme="dark"` en el tag `<html>`.
- Usar variables CSS (`var(--token)`) para todos los estilos.
- El servidor de desarrollo corre en puerto 3000.
- Firestore usa `onSnapshot` para actualizaciones en tiempo real.
- **Sin datos de ejemplo**: Todo dato debe ser creado por el usuario o importado via CSV.
- **Cursos**: Se crean manualmente (no hay seed automático).
- **Fecha de metas**: Usa `input type="date"` que guarda formato ISO `YYYY-MM-DD`, compatible con el calendario.
- **Build**: Next.js 16.2.1 con Turbopack, compilación exitosa sin errores TypeScript.
- **Timer eliminado**: `lib/firestore/study.ts` borrado, `StudySession` removido de `types/index.ts`, referencias limpias en `Dashboard.tsx` y `AuthContext.tsx`.
- **Optimización Firestore**:
  - Nuevo hook `lib/hooks/useFirestoreCache.ts` para caché en memoria compartido entre vistas.
  - Funciones `getDocs` agregadas: `getGoalsByUserId`, `getXPByUserId`, `getAchievementsByUserId`, `getRemindersByUserId`, `getTransactionsByUserId`, `getCourses`, `getUserProgressByUserId`, `getCourseModules`, `getCommunityUsers`.
  - Vistas optimizadas: Dashboard, Metas, Finanzas, Calendario, Cursos, Curso detalle, Sidebar, Configuración.
  - Topbar mantiene `onSnapshot` para notificaciones (necesita tiempo real).
  - Todas las queries incluyen `.where('userId', '==', uid)`.
- **Bug Fixes 01/04/2026**:
  - `lib/firestore/goals.ts`: Nueva función `createGoalWithId()` con `setDoc` para IDs explícitos.
  - `app/components/Dashboard.tsx`: Flechas de tarjetas usan `useRouter` para navegación. Modal CSV eliminado.
  - `app/configuracion/page.tsx`: Compresión de imagen con Canvas API antes de subir a Storage. Eliminación de cuenta: Storage → Firestore → Auth.
  - `AGENTS.md`: Agregada regla de preguntar push a Git después de actualizar CONTEXT.md.
  - **UX/UI Ajustes Rediseño (01/04/2026)**:
    - `app/configuracion/page.tsx`: Zona de Peligro con tarjeta única (`bg-red-50 dark:bg-red-900/20`), botón directo "Confirmar y Eliminar mi cuenta para siempre" sin modales. Textos legibles en modo claro (`text-red-900`). Manejo de re-authentication con mensaje inline. CSS usa variables semánticas Prosper.
    - `app/calendario/page.tsx`: Suscripción `onSnapshot` implementada para metas en tiempo real usando `subscribeToGoals()`. Limpieza de suscripción con `unsubscribe()` para evitar fugas de memoria. CSS usa design tokens Prosper originales.
    - `lib/contexts/AuthContext.tsx`: `deleteAccount()` ahora retorna `{ success: boolean; needsReauth?: boolean; error?: string }`. Orden correcto: Firestore → Storage → Auth. Detección de `auth/requires-recent-login` con flag `needsReauth`.
- **Reactividad Global (01/04/2026)**:
  - `lib/contexts/GoalsContext.tsx`: Nuevo contexto con `onSnapshot` para goals y reminders. Expone `goals`, `reminders`, `userId`, `goalsToday`, `remindersToday` y funciones CRUD.
  - `app/components/DashboardLayout.tsx`: GoalsProvider añadido como wrapper global.
  - `app/components/Dashboard.tsx`: Usa `useGoals()` en lugar de carga manual. Sección "Avisos Recientes" añadida.
  - `app/metas/page.tsx`: Refactorizado para usar `useGoals()`. Sin useState/useEffect manual.
  - `app/calendario/page.tsx`: Refactorizado para usar `useGoals()`. Botón "+ Recordatorio" añadido.
