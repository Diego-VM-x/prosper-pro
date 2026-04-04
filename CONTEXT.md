# Contexto del Proyecto: Prosper-Pro

## Estado Actual (04 de Abril, 2026 - Rediseño Stitch Metas/Calendario + Dashboard Fix + Menú Izquierda)
- **Objetivo**: Dashboard de Libertad Financiera y Educación Gamificada.
- **Tecnología**: Next.js 16.2.1 (App Router/Turbopack), Vanilla CSS, React 19, TypeScript.
- **Identidad**: Basada en "Prosper." (Azul Navy #1E3A6E y Verde Esmeralda #3DCC8E).
- **URL Local**: http://localhost:3000
- **Modo**: App inicia en BLANCO - sin datos de ejemplo. Todo dato viene de Firebase.
- **Firebase**: Proyecto reseteado. Campo `ownerId` reemplaza a `userId` en todas las colecciones para aislamiento total de datos por usuario.

## Reglas de Eficiencia de Tokens (AGENTS.md)
- **Lectura:** Solo archivos necesarios, ignorar carpetas pesadas (node_modules, .next, dist), usar resúmenes.
- **Escritura:** Respuestas concisas, ediciones parciales, confirmar tareas grandes (>50k tokens).
- **Memoria:** Consultar CONTEXT.md antes de preguntar, no repetir errores solucionados.
- **Optimización:** PC de bajos recursos (i3/4GB RAM), evitar librerías pesadas.

## Estructura de Archivos Clave
- `app/page.tsx` → Dashboard principal (rediseñado con grid system compacto)
- `app/components/Dashboard.tsx` → Widgets rediseñados (stats-row, dual-grid, bottom-grid)
- `app/components/DashboardLayout.tsx` → Layout con Sidebar colapsable + Topbar con logo
- `app/components/Sidebar.tsx` → Navegación lateral colapsable (solo iconos)
- `app/components/Topbar.tsx` → Barra superior con logo, búsqueda funcional, login/logout
- `app/components/ProtectedRoute.tsx` → Protección de rutas autenticadas
- `app/components/icons.tsx` → 25 iconos SVG inline (incluye IconCheck, IconFlight, IconSchool, IconArrowForward, IconReceipt)
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
- ✅ **Rediseño Stitch Metas + Calendario + Dashboard Fix (04/04/2026)**: Metas con stats bar, cards horizontales enriquecidas con sparkline SVG, acciones rápidas, card de insight. Calendario con grid aspect-square, indicadores de puntos, panel lateral mejorado, resumen del mes con iconos SVG. Dashboard con números corregidos (stat-cards, progress ring). Menú móvil ahora desliza desde la izquierda. Responsive completo en 3 breakpoints.
- ✅ **Menú Móvil desde Izquierda (04/04/2026)**: Cambiado de `slideInRight` a `slideInLeft`. Overlay usa `justify-content: flex-start`.
- ✅ **Dashboard Fix Números (04/04/2026)**: Stat cards con font-size reducido (1.5rem), word-break, progress ring con circumference corregido (339.292), responsive 3 breakpoints.
- ✅ **Menú Móvil Responsivo (03/04/2026)**: Topbar con menú hamburguesa desplegable desde la derecha con navegación completa, avatar de usuario, toggle de tema y botón de logout. Overlay con animación fadeIn + slideInRight. Responsive en 3 breakpoints (1024px, 768px, 480px). Todas las páginas ya tienen responsive completo.
- ✅ **Dashboard Rediseño "Libro Esmeralda" (03/04/2026)**: Nuevo layout con 4 stat cards superiores con iconos emoji y badges, gráfico de línea SVG con gradiente y anotación "MAYOR RENDIMIENTO", panel lateral derecho con metas activas en formato card con barras de progreso horizontales, fila inferior con 3 cards (Flujo de Actividad, Progreso Circular, Próximos Hitos). Estética esmeralda oscura mantenida.
- ✅ **UI Rediseño Completo (02/04/2026)**: Dashboard con grid system profesional, stat cards cuadradas compactas, sidebar colapsable con persistencia localStorage, topbar con logo y búsqueda funcional de metas.
- ✅ **Sidebar Colapsable**: Botón de colapsar en topbar, estado persistido en localStorage, modo semi-desplegable (solo iconos).
- ✅ **Topbar Mejorado**: Logo Prosper como botón, título dinámico ("Hola, Usuario" / "Navegación Rápida"), búsqueda funcional con resultados de metas, login/logout condicional.
- ✅ **Dashboard Grid System**: Fila maestra de 4 stat cards, sección dual (gráfico + fechas / metas activas), fila inferior (comunidad + progreso + logros).
- ✅ **Responsive Completo**: 3 breakpoints (1280px, 768px, 480px) para todas las vistas del dashboard.
- ✅ **Sync con Remote + Firebase Error Handling (02/04/2026)**: Pull de 10 commits del remoto. Firebase init con try-catch, AuthContext protegido contra crashes.
- ✅ **GoalsProvider en Root Layout**: Movido de DashboardLayout a layout.tsx para jerarquía correcta de contextos. Soluciona metas no sincronizadas con calendario/dashboard.
- ✅ **GoalsContext Loading Fix**: Eliminado `return null` durante loading en GoalsProvider. Ahora renderiza children inmediatamente con datos vacíos.
- ✅ **Metas Page con GoalsContext**: Refactorizado para usar `useGoals()` en lugar de estado local. Sync completa con calendario y dashboard.
- ✅ **Calendar Redesign**: Vista mes/agenda, barras de progreso de metas, widget de próximas metas, resumen mensual.
- ✅ **Dashboard Updates**: Widget de próximas fechas límite, barras de progreso en metas activas, colores por categoría.
- ✅ **Submodule Huérfano Eliminado**: Removida referencia `.agent/recursos/prosper-repo` que causaba fallos en builds de Vercel.
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

### 02/04/2026 - Reset Total de Firebase
- **Reset Firebase Completo**: Eliminado todo rastro de `userId` y reemplazado por `ownerId` en todos los módulos Firestore, tipos TypeScript, reglas de seguridad y componentes de la app.
- **Archivos modificados**: `types/index.ts`, `lib/firestore/*.ts` (8 módulos), `firestore.rules`, `app/metas/page.tsx`, `app/calendario/page.tsx`, `app/finanzas/page.tsx`, `app/components/Dashboard.tsx`, `app/components/Sidebar.tsx`, `app/cursos/page.tsx`, `lib/csvParser.ts`.
- **Nuevo archivo creado**: `.env.local` con variables de Firebase vacías listas para configurar.
- **Build verificado**: `tsc --noEmit` exitoso sin errores.

## Historial de Instrucciones
### 04/04/2026
- **Rediseño Stitch Metas**:
  - `app/metas/page.tsx`: Reescritura completa con diseño Stitch. Stats bar superior (4 métricas), cards horizontales enriquecidas con icono grande, barra de progreso con gradiente, sparkline SVG dinámico, metadata estimada, acciones rápidas (añadir fondos, editar, eliminar, detalles). Card de insight decorativa al final. Responsive 3 breakpoints.
  - `app/components/icons.tsx`: Agregados IconFlight, IconSchool, IconArrowForward, IconReceipt.
- **Rediseño Stitch Calendario**:
  - `app/calendario/page.tsx`: Grid de celdas aspect-square con bordes redondeados, indicadores como puntos (6px), panel lateral con detalle de eventos y barra de color, resumen del mes con iconos SVG (escudo, campana, check) + barra de progreso mensual. Botón "Añadir Evento" en navegación. Responsive 3 breakpoints con panel derecho en grid 2 columnas a 1024px.
- **Dashboard Fix**:
  - `app/components/Dashboard.tsx`: Stat cards con font-size reducido (1.5rem), word-break/overflow-wrap. Progress ring con circumference corregido (2*PI*54=339.292), container 140px, pct 1.75rem. Responsive mejorado 3 breakpoints (1024px, 640px, 480px) con ajustes progresivos.
- **Menú Móvil desde Izquierda**:
  - `app/components/Topbar.tsx`: Overlay `justify-content: flex-start`, animación `slideInLeft` (translateX(-100%) → 0).

### 03/04/2026
- **Menú Móvil Responsivo**:
  - `app/components/Topbar.tsx`: Menú hamburguesa con panel deslizante desde la derecha. Navegación completa (Dashboard, Metas, Calendario, Finanzas, Comunidad, Cursos, Logros, Configuración). Avatar de usuario, toggle de tema, botón de logout. Overlay con animaciones fadeIn + slideInRight. Responsive en 3 breakpoints.
- **Dashboard Rediseño "Libro Esmeralda"**:
  - `app/components/Dashboard.tsx`: Rediseño completo con nuevo layout. 4 stat cards con iconos emoji, gráfico de línea SVG con gradiente, panel lateral de metas activas, fila inferior con actividad/progreso/hitos. Build exitoso.

### 02/04/2026
- **Login Fix Completo**:
  - `app/login/page.tsx`: Redirección con `setTimeout(500ms)` + `router.replace('/')` después de login exitoso. Evita necesidad de refresh manual.
  - `app/page.tsx`: `ProtectedRoute` envuelve Dashboard para evitar queries Firestore sin autenticación.
  - `lib/contexts/AuthContext.tsx`: `loginWithGoogle` y `loginWithEmail` lanzan error explícito si `auth` es null.
- **Pull de Remote (10 commits)**: Sincronizados cambios del remoto con fast-forward. Commits: calendar-goals-sync-redesign, goals-sync-context, goals-loading-state, goals-provider-placement, remove-submodule, firebase-error-handling.
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
- **Build**: Next.js 16.2.1 con Turbopack, compilación exitosa sin errores TypeScript. `tsc --noEmit` verificado después de cada cambio.
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
- **Reset Firebase (02/04/2026)**:
  - `userId` → `ownerId` en todas las colecciones Firestore.
  - Reglas de seguridad actualizadas para validar `ownerId == request.auth.uid`.
  - Funciones renombradas: `getGoalsByOwnerId`, `getTransactionsByOwnerId`, `getXPByOwnerId`, `getAchievementsByOwnerId`, `getUserProgressByOwnerId`, `getRemindersByOwnerId`, `getUnreadCount(ownerId)`, `markAllNotificationsRead(ownerId)`, `getMonthlySavings(ownerId)`, `getMonthlySummary(ownerId)`, `subscribeToGoals(ownerId)`, `subscribeToReminders(ownerId)`, `subscribeToTransactions(ownerId)`, `subscribeToWeeklyData(ownerId)`, `subscribeToXP(ownerId)`, `subscribeToAchievements(ownerId)`, `subscribeToNotifications(ownerId)`, `subscribeToUserProgress(ownerId)`.
  - `createGoal` ahora incluye `ownerId` automáticamente.
  - `.env.local` creado con placeholders para nuevas credenciales.

- **Login Bug Fix (02/04/2026)**:
  - `app/login/page.tsx`: Redirección via `useEffect` + `router.replace('/')` en lugar de `window.location.href`. Evita race condition con `onAuthStateChanged`.
  - `lib/contexts/AuthContext.tsx`: Funciones de login lanzan error explícito si `auth` es null.

- **Login Fix Completo (02/04/2026)**:
  - `app/login/page.tsx`: `setTimeout(500ms)` + `router.replace('/')` después de login. `useEffect` con `user` sin dependencia de `loading`.
  - `app/page.tsx`: `ProtectedRoute` envuelve `<Dashboard>`.
  - `lib/contexts/AuthContext.tsx`: Login functions lanzan error si `auth` es null.

- **Firebase Error Handling (02/04/2026)**:
  - `lib/firebase.ts`: Init envuelto en try-catch con fallback. Previene crash si config es incorrecta.
  - `lib/contexts/AuthContext.tsx`: `loading=false` si auth es null. `onAuthStateChanged` con try-catch.

- **GoalsProvider en Root Layout (02/04/2026)**:
  - `app/layout.tsx`: GoalsProvider añadido después de AuthProvider.
  - `app/components/DashboardLayout.tsx`: GoalsProvider eliminado (ya no necesario aquí).

- **GoalsContext Loading Fix (02/04/2026)**:
  - `lib/contexts/GoalsContext.tsx`: Eliminado `return null` durante loading. Renderiza children con datos vacíos.

- **Metas Page GoalsContext (02/04/2026)**:
  - `app/metas/page.tsx`: Usa `addGoal()` de GoalsContext. Eliminado `localGoals` state y `refreshGoals()`.

- **Calendar Redesign (02/04/2026)**:
  - `app/calendario/page.tsx`: Vistas mes/agenda, barras de progreso, widget próximas metas, resumen mensual.
  - `app/components/Dashboard.tsx`: Widget próximas fechas límite, barras progreso en metas, colores categoría.

- **Reactividad Global (01/04/2026)**:
  - `lib/contexts/GoalsContext.tsx`: Nuevo contexto con `onSnapshot` para goals y reminders. Expone `goals`, `reminders`, `userId`, `goalsToday`, `remindersToday` y funciones CRUD.
  - `app/components/DashboardLayout.tsx`: GoalsProvider añadido como wrapper global.
  - `app/components/Dashboard.tsx`: Usa `useGoals()` en lugar de carga manual. Sección "Avisos Recientes" añadida.
  - `app/metas/page.tsx`: Refactorizado para usar `useGoals()`. Sin useState/useEffect manual.
  - `app/calendario/page.tsx`: Refactorizado para usar `useGoals()`. Botón "+ Recordatorio" añadido.

## Tareas Pendientes
1. **Configurar variables de entorno en Vercel**: Las 7 variables NEXT_PUBLIC_FIREBASE_* deben agregarse manualmente en Vercel Dashboard → prosper-pro → Settings → Environment Variables. Ver `VERCEL_ENV_VARS.txt` para los valores del nuevo proyecto `prospeweb`.
2. **Redeploy en Vercel**: Después de agregar las variables, hacer un redeploy para que los cambios surtan efecto.
3. **Activar Firebase Storage** (opcional): Para fotos de perfil en Configuración.
4. **Verificar build en Vercel**: Confirmar que el fix del submodule huérfano resolvió los fallos de build.
5. **Páginas faltantes**: Crear `/logros`, `/ayuda`, `/comunidad` (actualmente dan 404).
6. **Búsqueda avanzada**: Extender búsqueda a cursos, transacciones y comunidad.

## Instrucciones para errores conocidos
### Error: "No se ven las metas en producción (Vercel)"
- **Causa**: Variables de entorno de Firebase no configuradas en Vercel.
- **Solución**: Agregar las 7 variables NEXT_PUBLIC_FIREBASE_* en Vercel Dashboard → Settings → Environment Variables. Luego hacer redeploy.
- **Archivo de referencia**: `VERCEL_ENV_VARS.txt` contiene los valores actualizados del proyecto `prospeweb`.

### Error: "404 en /logros, /ayuda, /comunidad"
- **Causa**: Esas páginas no existen aún en el proyecto.
- **Solución**: Ignorar los errores o crear esas páginas cuando sea necesario.
