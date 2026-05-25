# Contexto del Proyecto: Prosper-Pro

## Estado Actual (20 de Mayo, 2026 - Conversión USD/BS con cambio de valor principal + moneda persistente)
- **Objetivo**: Dashboard de Libertad Financiera y Educación Financiera.
- **Tecnología**: Next.js 16.2.1 (App Router/Turbopack), Vanilla CSS, React 19, TypeScript.
- **Identidad**: Basada en "Prosper." (Azul Navy #1E3A6E y Verde Esmeralda #3DCC8E).
- **URL Local**: http://localhost:3000
- **Modo**: App inicia en BLANCO - sin datos de ejemplo. Todo dato viene de Firebase.
- **Firebase**: Proyecto reseteado. Campo `ownerId` reemplaza a `userId` en todas las colecciones para aislamiento total de datos por usuario.
- **Borrado de datos**: Al eliminar cuenta o borrar datos, se eliminan TODAS las colecciones del usuario en Firestore (transactions, accounts, goals, plans, reminders, notifications, expense_requests, recurring_payments, feedback, user_course_progress, users).
- **Nota**: Secciones de Comunidad y Logros eliminadas de la web. Código preservado en `_backup_comunidad_logros/`.
- **Bug Fix Crítico (19/05/2026)**: Corregida doble conversión en widgets de resumen financiero. `formatAmount` convertía valores que ya estaban convertidos, causando que 79 BS se multiplicara por la tasa dos veces. Fix: cambiado `formatAmount` → `formatInCurrency` en summary y totalBalance. También eliminado código duplicado en `accounts.ts` donde `recalculateAccountBalance` estaba repetida 6 veces.

## Reglas de Eficiencia de Tokens (AGENTS.md)
- **Lectura:** Solo archivos necesarios, ignorar carpetas pesadas (node_modules, .next, dist), usar resúmenes.
- **Escritura:** Respuestas concisas, ediciones parciales, confirmar tareas grandes (>50k tokens).
- **Memoria:** Consultar CONTEXT.md antes de preguntar, no repetir errores solucionados.
- **Optimización:** PC de bajos recursos (i3/4GB RAM), evitar librerías pesadas.

## Optimizaciones de Rendimiento (06/04/2026)
- **Google Fonts**: Migrado de `@import` CSS a `next/font/google` con `display: 'swap'`. Elimina bloqueo de renderizado.
- **Ably eliminado**: Removida dependencia `ably` (~31 paquetes, ~500KB). Archivo `lib/ably.ts` eliminado. No se usaba en la app.
- **Recharts lazy load**: `FinancialStatusChart` usa `lazy()` + `Suspense`. ~100KB de Recharts no bloquean renderizado inicial.
- **Comunidad listeners optimizados**: 5 `useEffect` consolidados en 1. Heartbeat de presencia reducido de 30s a 60s. Mismas suscripciones activas, menos overhead.
- **Build verificado**: `npm run build` exitoso en 46s, 14/14 páginas generadas.

## Estructura de Archivos Clave
- `app/page.tsx` → Dashboard principal (rediseñado con grid system compacto)
- `app/components/Dashboard.tsx` → Dashboard rediseñado: 4 stat pills, efectos neón, bottom-section con flechas scroll responsive
- `app/globals.css` → Variables glow neón (`--neon-green`, `--glow-sm/md/lg`), sombras/botones actualizados
- `app/components/DashboardLayout.tsx` → Layout con Sidebar colapsable + Topbar con logo
- `app/components/Sidebar.tsx` → Navegación lateral colapsable (solo iconos)
- `app/components/Topbar.tsx` → Barra superior con logo, búsqueda funcional, login/logout
- `app/components/ProtectedRoute.tsx` → Protección de rutas autenticadas
- `app/components/icons.tsx` → 25 iconos SVG inline (incluye IconCheck, IconFlight, IconSchool, IconArrowForward, IconReceipt)
- `app/components/CustomSelect.tsx` → Componente dropdown estético con soporte para opciones personalizadas
- `app/login/page.tsx` → Login (Google + Email)
- `app/register/page.tsx` → Registro (Google + Email)
- `app/metas/page.tsx` → CRUD de metas con filtros, sparklines reales, categorías custom
- `app/cursos/page.tsx` → Listado de cursos con progreso
- `app/cursos/[id]/page.tsx` → Detalle de curso con módulos
- `app/calendario/page.tsx` → Calendario con recordatorios, tipos custom
- `app/finanzas/page.tsx` → Cuentas financieras, transacciones vinculadas, balance por cuenta
- `app/components/FinancialStatusChart.tsx` → Gráfica AreaChart con Recharts, datos en tiempo real via onSnapshot
- `app/configuracion/page.tsx` → Perfil editable, preferencias, notificaciones, seguridad, zona de peligro (rediseñado)
- `app/logros/` → **ELIMINADO** (backup en `_backup_comunidad_logros/logros/`)
- `app/ayuda/page.tsx` → FAQ con 40+ preguntas, accesos rápidos, filtros por categoría
- `app/comunidad/` → **ELIMINADO** (código preservado en backups de diseño)
- `lib/firebase.ts` → Configuración Firebase
- `lib/contexts/AuthContext.tsx` → Contexto de autenticación
- `lib/contexts/GoalsContext.tsx` → Contexto reactivo de metas y recordatorios (onSnapshot)
- `lib/seed.ts` → Vacío (sin datos de ejemplo)
- `lib/csvParser.ts` → Parser e importador de CSV a Firestore
- `lib/firestore/` → 9 módulos Firestore (goals, users, transactions, accounts, reminders, notifications, courses)
- `lib/firestore/gamification.ts` → **ELIMINADO** (backup en `_backup_comunidad_logros/`)
- `lib/firestore/tasks.ts` → **ELIMINADO** (backup en `_backup_comunidad_logros/`)
- `lib/firestore/users.ts` → Preferencias de usuario (categorías custom, tipos custom)
- `lib/firestore/transactions.ts` → Transacciones + historial de ahorro por meta + streaks
- `lib/firestore/plans.ts` → CRUD FinancialPlan (savings/expense/recurring), resumen financiero
- `lib/firestore/requests.ts` → Solicitudes entre usuarios (enviar/aceptar/rechazar divisiones de gastos)
- `lib/firestore/recurring.ts` → Pagos recurrentes, cálculo próximo pago, resumen mensual
- `lib/firestore/accounts.ts` → CRUD de cuentas, gestión contable avanzada (recalculateAccountBalance, wipeAllTransactions, etc.)
- `types/index.ts` → Interfaces TypeScript (UserProfile, Goal, Transaction con archived, XPState, Course, etc.)

## Hitos Completados
- ✅ **Sistema de Animaciones y Micro-interacciones Premium (25/05/2026)**: Creado el archivo de animaciones en `app/animations.css` e importado de forma nativa en `app/layout.tsx` para garantizar la resolución del compilador de Next.js. El archivo reúne keyframes e interactividades premium a 60 FPS aceleradas por hardware (`transform`, `opacity`, `filter`, `will-change`) evitando Layout Shifts. Cuenta con transiciones de página elásticas, micro-pulsaciones en hover/active de botones, esqueletos loaders shimmer adaptables a temas (Claro/Oscuro/AMOLED), modales elásticos, toasts y dropdowns fluidos, efectos de elevación con glow neón en tarjetas financieras, y retardos secuenciales (stagger). Se ajustó la regla de accesibilidad `prefers-reduced-motion` a un formato sutil no destructivo para evitar que apague los transforms y delays de la landing page y el dashboard en sistemas con esa opción activa.
- ✅ **Entrada Fluida Global en DashboardLayout (25/05/2026)**: Integrada la clase `.animate-page-entrance` de forma global en el Root Layout (`layout.tsx`) e implementada en el contenedor de contenido principal en `DashboardLayout.tsx`. Esto garantiza que todas las vistas de la aplicación bajo el dashboard realicen una transición de entrada suave, elástica y premium al navegar, libre de bugs visuales o de redibujado.
- ✅ **Conversión Automática Dinámica y Bidireccional en Transferencias (19/05/2026)**: El modal de "Transferir" ahora detecta automáticamente si las cuentas de origen y destino difieren en moneda (USD vs BS). Despliega inputs responsivos e interactivos para "Monto a debitar" y "Monto a acreditar". Al modificar cualquiera de ellos, convierte bidireccionalmente y en tiempo real usando la Tasa BCV Oficial actual. Al confirmar la transacción, la lógica contable se protege al crear dos registros en Firestore: una transacción de retiro ("saving" debitada de origen) y una contraparte automática ("income" acreditada en destino) con su valor convertido para garantizar saldos contables precisos y rastreables a través de recálculos de saldo.
- ✅ **Sistema Multi-Moneda - Cuentas Independientes de Moneda (USD / BS) (19/05/2026)**: Implementado soporte completo para cuentas financieras con monedas nativas independientes. Un usuario puede tener una cuenta en `USD` y otra en `BS` de forma simultánea, manteniendo balances separados. Al crear transacciones o transferencias, el sistema adapta dinámicamente los prefijos y valida el balance. Las transferencias entre cuentas de monedas distintas realizan conversión automática en tiempo real basada en la tasa oficial BCV de DolarAPI, mostrando una previsualización de equivalencia antes de confirmar. **Permite modificar la moneda de cualquier cuenta activa en vivo sin necesidad de eliminarla**, re-denominando el balance instantáneamente mediante el menú de opciones de la tarjeta de cuenta. **Se eliminó la opción de sobrescribir tasas manualmente en la Configuración**, asegurando la fidelidad total del sistema con la Tasa Oficial del BCV provista en vivo por DolarAPI, la cual se muestra ahora de forma elegante e informativa como un bloque de lectura única. El Dashboard y Finanzas muestran montos en su moneda nativa y sub-etiquetas equivalentes. Los balances totales y ahorro mensual consolidados se calculan reactivamente con `useMemo`.
- ✅ **Sistema Multi-Moneda - Fase 2: Integración DolarAPI y Tasa BCV (19/05/2026)**: Limpieza de monedas a únicamente `BS` y `USD`. Integración del endpoint `app/api/exchange-rates/route.ts` que consulta a `ve.dolarapi.com`. Configuración de la tasa oficial del Banco Central de Venezuela (BCV) de manera predeterminada y fija para todos los cálculos y conversiones en toda la plataforma (Dashboard, Planes Financieros, Gráficos y Finanzas). Corregido bug crítico de estado inicial `'manual'` en `DEFAULT_RATES` que bloqueaba la actualización de las tasas en vivo desde el backend. Deshabilitada la caché en la ruta de la API local con `cache: 'no-store'` para asegurar la frescura del dólar diario BCV en vivo sin retardo de red. Rediseñado `CurrencyContext` con un estado y referencia `apiRatesRef` para conmutar de forma reactiva instantánea entre tasas de la API y el override manual del usuario en Firestore (si el usuario elimina su override manual, la app vuelve de inmediato a la tasa oficial del BCV en vivo sin refresco de página). Mostrado label explícito de Tasa Oficial BCV en la vista de configuración.
- ✅ **Sistema Multi-Moneda - Fase 1 (19/05/2026)**: Implementado soporte completo para Bolívares (BS), Dólares (USD), Euros (EUR) y Tether (USDT). `CurrencyContext` inyectado a nivel global. Selector de moneda base añadido en la vista de registro y perfil (con persistencia en Firestore). Secciones clave (`Dashboard`, `Finanzas`, `Metas`, `FinancialStatusChart`) migradas para usar el hook `useCurrency()` en lugar de llamadas hardcodeadas. Posibilidad de establecer tasas de cambio manuales por el usuario en Configuración. TS errors y formateros corregidos.
- ✅ **Rediseño Completo del Calendario Maestro (19/05/2026)**: Calendario rediseñado para ser un centro de control unificado. Interfaz compacta con sidebar fijo, integración nativa de transacciones (ingresos/gastos/ahorro diarios), fechas de corte de planes financieros y recordatorios. Tooltips y badges adaptativos sin saturar la vista.
- ✅ **UI Fixes: Modal Dropdowns y Dashboard Scroll (19/05/2026)**: Solucionado el bug que cortaba menús desplegables (`CustomSelect`) dentro de modales (como "Nueva Meta"), modificando `.modal-overlay` a scrollable en lugar de `.modal-content`. Arreglado el bug de las flechas de scroll en `.bottom-section` del Dashboard asignándoles `position: absolute` para evitar que aplasten tarjetas en pantallas medias.
- ✅ **Chat de Feedback Persistente en Ayuda (19/05/2026)**: Implementada lógica de persistencia para el chat de bugs y sugerencias en la página de Ayuda. El chat carga el historial de mensajes enviados por el usuario desde Firestore y los muestra intercalados con respuestas automáticas del sistema, dando la sensación de una conversación real persistente entre sesiones. Modificada función `getFeedbackByOwner` para ordenar datos en cliente y evitar errores de Missing Index en Firebase.
- ✅ **Planes Financieros - Reestructuración Completa (17/05/2026)**: Sección Metas transformada en sistema de gestión financiera real. Nuevos tipos: `FinancialPlan` (savings/expense/recurring), `ExpenseRequest`, `RecurringPayment`. 3 módulos Firestore nuevos: `plans.ts` (CRUD planes, resumen financiero), `requests.ts` (solicitudes entre usuarios para dividir gastos), `recurring.ts` (pagos recurrentes, cálculo próximo pago). UI completamente reescrita: stats cards con totales, filtros por tipo/estado, grid de planes con progreso visual. Funcionalidades: crear planes (ahorro/gasto/recurrente), añadir fondos con transacción automática, registrar pagos recurrentes con cálculo de próxima fecha, compartir gastos con usuarios vía email (enviar/aceptar/rechazar solicitudes). GoalsContext actualizado con soporte para FinancialPlan. Icons IconUsers e IconClock añadidos.
- ✅ **Gestión Contable Avanzada + CSS Fixes (17/05/2026)**: Modal de gestión contable en Finanzas con acciones globales (vaciar todo, vaciar por tipo, recalcular balances) y acciones por cuenta. Lógica contable: eliminar ingresos resta del balance, eliminar gastos/ahorros suma. Funciones nuevas en accounts.ts: recalculateAccountBalance, recalculateAllBalances, wipeAllTransactions, wipeTransactionsByTypeWithAdjustment, wipeAllUserTransactions, wipeUserTransactionsByType, wipeTransactionsByDateRange. CSS fixes: agregada variable --color-error (#EF4444), corregido fondo btn-outline a transparent.: Nueva colección `accounts` en Firestore. Tipo `FinancialAccount` con `checking`, `savings`, `cash`, `custom`. Cards de cuentas con iconos, colores y balances. Modal para crear cuentas personalizadas. Transacciones vinculadas a cuentas con `accountId`. Al crear transacción se actualiza balance automáticamente. Filtro por cuenta en tabla. Balance total calculado desde todas las cuentas. Cuentas por defecto creadas automáticamente.
- ✅ **Selects Estéticos + Custom Categories + Sparklines Reales (04/04/2026)**: Nuevo componente `CustomSelect` con dropdown animado, iconos, check de selección y botón "Añadir personalizado". Categorías personalizadas en Metas, tipos en Calendario, categorías de transacción en Finanzas. Sparklines ahora usan transacciones reales de Firestore. Al agregar fondos a meta se crea transacción automática. Textos de monthlyGrowth y streakDays calculados desde datos reales.
- ✅ **Overflow-X Global Fix (04/04/2026)**: Agregado `overflow-x: hidden` y `max-width: 100vw` a html/body en globals.css. Clase `.page-content-overflow-fix` en DashboardLayout. Elimina scroll horizontal en móvil para Finanzas y Metas.
- ✅ **Dashboard Funcional (04/04/2026)**: Stat cards clickeables (navegan a /metas, /finanzas, /cursos). Círculo de progreso corregido (r=54, circumference=339.292). Botón "+ Añadir Nuevo Objetivo" navega a /metas. Milestone items clickeables.
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

### 16/05/2026 - Eliminación de Comunidad y Logros
- **Archivos movidos a backup (`_backup_comunidad_logros/`)**:
  - `app/logros/` → Carpeta completa preservada
  - `lib/firestore/gamification.ts` → Módulo de XP y logros
  - `lib/firestore/tasks.ts` → Módulo de tareas diarias/semanales
- **Referencias eliminadas**:
  - `Topbar.tsx`: Quitado Logros de searchRoutes y menú móvil
  - `Sidebar.tsx`: Eliminados links de Comunidad y Logros
  - `Dashboard.tsx`: Eliminados imports de gamification, estados de achievements/members/xp, carga de datos de logros, actividad de logros
  - `metas/page.tsx`: Eliminadas llamadas a `checkAndUnlockAchievements` en crear/actualizar meta y añadir fondos
  - `finanzas/page.tsx`: Eliminadas llamadas a `checkAndUnlockAchievements` en crear transacción y crear cuenta
  - `cursos/[id]/page.tsx`: Eliminado import de `updateXP` y lógica de XP al completar curso
  - `configuracion/page.tsx`: Eliminados toggles de communityMsgs, botones de limpiar/resetear datos de comunidad, import de privateMessages
  - `types/index.ts`: Eliminados tipos `Achievement`, `DailyTask`, `TaskProgress`, `Community`, `CommunityMessage`, `CommunityRoomMember`, `PrivateConversation`, `PrivateMessage`. Quitado campo `achievements` de `XPState`, `achievementsCount` de `CommunityMember`, tipos de notificación `achievement/community/private_message/channel_message`
  - `AuthContext.tsx`: Eliminadas colecciones `xp_states`, `achievements`, `study_sessions` del deleteAccount. Eliminado código de borrar conversaciones/mensajes privados
  - `tsconfig.json`: Excluido `_backup_comunidad_logros` del compilador
- **Build**: `tsc --noEmit` exitoso sin errores.

### 04/04/2026 - Diseños de Logros, Comunidad y Ayuda
- **Logros Page Rediseñada**:
  - `app/logros/page.tsx`: Reescritura completa. Sin datos de ejemplo, inicia vacío. 19 logros basados en acciones reales (transacciones, cuentas, metas). Conexión con `getTransactionsByOwnerId`, `getAccountsByOwnerId`, `getGoalsByOwnerId`. Progreso calculado desde datos reales de Firestore.
- **Comunidad Page Rediseñada**:
  - `app/comunidad/page.tsx`: Sistema de chat en tiempo real con arquitectura de rooms. Sidebar desplegable con lista de comunidades. Ventana de chat con mensajes, likes, menciones @. Optimizado para Redmi 9A (text-sm, avatares w-8, bordes finos).
- **Tareas Repetitivas + Nivel 30**:
  - `lib/firestore/tasks.ts`: Nuevo módulo con 5 tareas diarias y 5 semanales. Cálculo de progreso desde transacciones reales. `createOrUpdateTaskProgress`.
  - `lib/firestore/gamification.ts`: `MAX_LEVEL = 30`. Al llegar a nivel 30 sigue ganando XP sin subir más.
  - `types/index.ts`: Nuevos tipos `DailyTask`, `TaskProgress`, `TaskFrequency`, `TaskCategory`, `Community`, `CommunityMessage`, `CommunityRoomMember`. Campo `xpReward` añadido a `Achievement`.

### 04/04/2026 - Logros Funcionales con Desbloqueo Automático
- **Gamification Module**:
 - `lib/firestore/gamification.ts`: Nueva función `checkAndUnlockAchievements(ownerId, data)` que verifica 17 logros y desbloquea automáticamente los que cumplan condiciones. Cada logro desbloqueado otorga XP vía `updateXP()` y crea notificación en Firestore vía `addNotification()`. Retorna lista de logros recién desbloqueados.
- **Integración en Transacciones**:
 - `app/finanzas/page.tsx`: `handleAddTransaction()` verifica logros después de crear transacción. `handleAddAccount()` verifica logros después de crear cuenta.
- **Integración en Metas**:
 - `app/metas/page.tsx`: `handleCreateOrUpdateGoal()` verifica logros después de crear/actualizar meta. `handleAddFunds()` verifica logros después de añadir fondos.
- **Notificación Visual**:
 - `app/logros/page.tsx`: Toast animado con animación `slideInRight` y `bounce` que aparece cuando se desbloquea un logro. Suscripción en tiempo real con `subscribeToAchievements()` para detectar nuevos desbloqueos.
- **Types**:
 - `types/index.ts`: Campo `xpReward: number` añadido a interfaz `Achievement`.

### 05/04/2026 - Notificaciones Eliminables + Topbar Móvil Mejorado
- **Notificaciones Eliminables**:
  - `lib/firestore/notifications.ts`: Nueva función `deleteAllNotifications(ownerId)` para eliminar todas las notificaciones de un usuario. `deleteNotification(id)` ya existía para eliminar individual.
  - `app/components/Topbar.tsx`: Dropdown de notificaciones con botón "Limpiar todo" en header. Cada notificación tiene botón ✕ para eliminar individualmente. Click en contenido marca como leída.
- **Topbar Móvil Mejorado**:
  - `app/components/Topbar.tsx`: Avatar del usuario en topbar móvil con dropdown (solo Configuración). Menú hamburguesa mantiene info de perfil en header + navegación completa + notificaciones + footer con toggle tema y logout.
- **Tareas Vinculadas a Logros**:
   - `app/logros/page.tsx`: `handleClaimTask()` ejecuta `checkAndUnlockAchievements()` al completar tarea. Auto-check de logros al cargar la página: useEffect verifica condiciones y desbloquea logros automáticamente otorgando XP.

### 05/04/2026 - Logros Funcionales + Comunidad UI + Configuración Rediseñada
- **Logros Page - XP y Tareas en Tiempo Real**:
  - `app/logros/page.tsx`: Agregada suscripción `subscribeToXP` para XP en tiempo real. Agregada suscripción `subscribeToTaskProgress` para tareas en tiempo real. `handleClaimTask` mejorado con validación de progreso suficiente y auto-check de logros. Cleanup con flag `cancelled` para evitar memory leaks.
- **Comunidad Page - UI Estática**:
  - `app/comunidad/page.tsx`: Rediseñada según `design/comunidad/code.html`. Hero con gradiente, foros de discusión en grid, recursos descargables, leaderboard top 3 a la derecha, próximos eventos. Sidebar derecha con ranking y eventos. Responsive completo 3 breakpoints.
- **Configuración Page - Rediseño Completo**:
  - `app/configuracion/page.tsx`: Rediseñada según `design/configuracion/code.html`. Perfil editable (nombre, bio) con guardado en Firestore. Preferencias de idioma/moneda. Toggles de notificaciones funcionales. Tabla de sesiones activas. Zona de peligro con eliminación de cuenta. Suscripción `subscribeToUserProfile` para cambios en tiempo real. Toast de éxito/error. Responsive completo 3 breakpoints (1024px, 768px, 480px).

### 05/04/2026 - Chats Privados + Busqueda de Usuarios en Comunidad
- **Comunidad Page - Chats Privados**:
  - `app/comunidad/page.tsx`: Tabs para Canales Publicos y Chats Privados. Busqueda de usuarios por nombre/email. Conversaciones 1:1 con mensajes en tiempo real via Firestore. Contador de mensajes no leidos. Creacion de nuevos canales.
- **Private Messages Module**:
  - `lib/firestore/privateMessages.ts`: Nuevo modulo con `searchUsers`, `getOrCreateConversation`, `subscribeToConversations`, `subscribeToPrivateMessages`, `sendPrivateMessage`, `markMessagesAsRead`, `subscribeToTotalUnreadCount`.
- **Types**:
  - `types/index.ts`: Nuevos tipos `PrivateConversation`, `PrivateMessage`. `UserProfile` extendido con `level`, `title`, `currentXP`.

### 05/04/2026 - Bug Fixes Chats + Notificaciones Push Completas
- **Bug Fix - Orden de mensajes**:
  - `lib/firestore/privateMessages.ts`: `subscribeToPrivateMessages` ahora parsea correctamente timestamps de Firestore (Timestamp.toDate().getTime()) y fallbacks numericos. Ordenamiento ascendente garantizado.
- **Bug Fix - Usuarios duplicados**:
  - `lib/firestore/privateMessages.ts`: `getAllUsers` y `subscribeToAllUsers` ahora comparan por `createdAt` cuando hay emails duplicados, manteniendo el usuario mas reciente.
- **Bug Fix - Cuentas huerfanas**:
  - `lib/contexts/AuthContext.tsx`: `deleteAccount` ahora elimina conversaciones privadas, mensajes privados y documento `users/{uid}` al borrar cuenta.
- **Notificaciones Push - Mensajes privados**:
  - `lib/firestore/privateMessages.ts`: Al enviar mensaje privado se crea notificacion Firestore (tipo `private_message`) + `sendBrowserNotification()` para alerta en navegador del receptor.
- **Notificaciones Push - Canales**:
  - `lib/firestore/communityMessages.ts`: Al enviar mensaje en canal se notifica a todos los miembros (tipo `channel_message`) + `sendBrowserNotification()`.
- **Notificaciones Push - Tipos nuevos**:
  - `types/index.ts`: Agregados `private_message` y `channel_message` al union type de `Notification.type`.
- **Notificaciones Push - Permiso automatico**:
  - `lib/contexts/AuthContext.tsx`: Al autenticarse se solicita permiso para notificaciones push del navegador automaticamente.
- **Notificaciones Push - Toggle en Configuracion**:
  - `app/configuracion/page.tsx`: Nuevo toggle "Notificaciones Push" en seccion de notificaciones. Detecta estado actual del permiso al cargar pagina. Nuevo metodo `enableNotifications()` en AuthContext.

### 06/04/2026 - Responsive Comunidad + Configuración + Modal Metas Móvil
- **Comunidad Page - Responsive Móvil**:
  - `app/comunidad/page.tsx`: Agregada clase `comunidad-container`. Media queries mejorados para `@media (max-width: 768px)` con altura `100dvh` para móviles con barras dinámicas. Menú lateral con posición fixed y transición suave. Lista de conversaciones y chat en pantalla completa. Botón de retroceso visible en móvil. Media queries para `@media (max-width: 480px)` con sidebar reducido a 56px, elementos de navegación compactos (40px), headers, avatares y burbujas de mensaje reducidos, input area optimizado.
- **Configuración Page - Bug Fix CSS**:
  - `app/configuracion/page.tsx`: Corregido error de sintaxis CSS (selector `.toggle-switch` faltante en línea 841).
- **Metas Page - Modal Móvil Fix**:
  - `app/metas/page.tsx`: Modal de creación/edición ajustado para móvil con `max-height: 90dvh` y fallback `-webkit-fill-available`. Overlay con `align-items: flex-start` y `padding-top: 10vh` para mejor scroll. Footer con botones en columna y ancho completo.

### 05/04/2026 - Error Boundaries + Firebase Validation + Suspense
- **ErrorBoundary**:
  - `app/components/ErrorBoundary.tsx`: Nuevo componente React con `componentDidCatch`. Muestra UI amigable con botones "Recargar página" e "Ir al inicio". En desarrollo muestra detalles del error.
- **Layout Robustez**:
  - `app/layout.tsx`: Envuelto con `ErrorBoundary` y `Suspense` con skeleton de carga.
- **Firebase Validation**:
  - `lib/firebase.ts`: Validación de 6 variables `NEXT_PUBLIC_FIREBASE_*` con `console.error` claro. Fallback: app funciona sin Firebase configurado (sin crashes). Doble try-catch para producción.

### 02/04/2026 - Reset Total de Firebase
- **Reset Firebase Completo**: Eliminado todo rastro de `userId` y reemplazado por `ownerId` en todos los módulos Firestore, tipos TypeScript, reglas de seguridad y componentes de la app.
- **Archivos modificados**: `types/index.ts`, `lib/firestore/*.ts` (8 módulos), `firestore.rules`, `app/metas/page.tsx`, `app/calendario/page.tsx`, `app/finanzas/page.tsx`, `app/components/Dashboard.tsx`, `app/components/Sidebar.tsx`, `app/cursos/page.tsx`, `lib/csvParser.ts`.
- **Nuevo archivo creado**: `.env.local` con variables de Firebase vacías listas para configurar.
- **Build verificado**: `tsc --noEmit` exitoso sin errores.

## Historial de Instrucciones
### 25/05/2026 - Sistema de Animaciones Premium y Micro-interacciones
- **animations.css**: Creación y estructuración de la hoja de estilos de animación con aceleración de hardware a 60 FPS (transiciones de página, botones con shimmer sweep, skeletos shimmer adaptativos, modales con entrada elástica y rebote, card-hover-premium con neón glow, retardo stagger y sparklines SVGs dinámicos).
- **layout.tsx**: Importación global del archivo de animaciones (`animations.css`).
- **DashboardLayout.tsx**: Integración de la clase `.animate-page-entrance` en el contenedor principal del layout para otorgar transiciones de página lujosas, fluidas y libres de bugs de re-paint a todas las vistas.

### 25/05/2026 - Mejora del botón de cerrar sesión
- **Topbar.tsx**: Mejorado el alineado y dimensiones del botón "Cerrar Sesión" en los menús desplegables (desktop y móvil) aplicando estilos flexbox y dimensionando el icono a 20x20 para una apariencia más profesional y consistente.
### 25/05/2026 - Despliegues de prueba (no producción) en Vercel
- **Opción 1 - Despliegues de vista previa automáticos**: Hacer push a cualquier rama distinta de `master` (ej: `feature/mi-cambio`) para que Vercel cree automáticamente un Preview Deployment con URL como `https://prosper-pro-git-feature-mi-cambio-diegovm-x.vercel.app`.
- **Opción 2 - Despliegue manual con Vercel CLI**: Instalar `vercel`, ejecutar `vercel login`, luego `vercel` desde la rama actual para crear un preview.
- **Opción 3 - Entorno de staging**: Mantener solo `master` como rama de producción en Vercel Settings → Git; usar ramas como `staging` para despliegues de prueba que no afecten producción.
- **Pruebas locales**: Ejecutar `npm run dev` para desarrollo o `npm run build` + `npm run start` para pruebas locales de producción.
### 25/05/2026 - Fix Vercel Build & Theme Buttons Layout
- **Vercel Build Fix**: Solucionado error crítico de sintaxis en `app/components/Topbar.tsx` (etiquetas `</svg>` y `</button>` duplicadas y un `</div>` sobrante) que provocaba un fallo "Unterminated regexp literal" en Turbopack durante el despliegue en Vercel. Adicionalmente, se corrigieron caracteres no escapados en JSX para superar las reglas estrictas de eslint (`react/no-unescaped-entities`).
- **UI Móvil**: Rediseño de los botones selectores de tema (Claro, Oscuro, AMOLED) en los menús desplegables de la versión móvil (el del avatar del usuario y el del footer general). Se cambiaron de ítems de lista completa a un layout flexbox de 3 botones horizontales de igual tamaño con iconos centrados, mejorando la usabilidad táctil.

### 20/05/2026 - Conversión USD/BS con Cambio de Valor Principal + Moneda Persistente
- **Gráfica/Dashboard**: Botón ⇄ Convertir en resumen financiero. Al activarlo, el valor principal cambia a la moneda alternativa (BS↔USD) y el valor original queda como ≈ debajo. Componente `SummaryCard` reutilizable.
- **Finanzas**: Mismo botón ⇄ Convertir en resumen mensual. Convierte ingresos, gastos, ahorro y balance total. Cuentas mantienen moneda nativa. Componente `SummaryWidget` reutilizable.
- **Configuración**: "Moneda de Visualización" cambia inmediatamente al hacer clic (sin necesidad de guardar). Persiste en localStorage vía `setDisplayCurrency`. Se mantiene al recargar página.
- **Vercel fixes**: Eliminado `turbopack.root` de `next.config.ts` (incompatible con ESM de Vercel). Corregidos tipos `CurrencyCode` en interfaces de SummaryCard/SummaryWidget.

### 20/05/2026 - Fix Gráfica Financiera: Cálculos Multi-Moneda + Responsividad
- **Bug Cálculos**: `FinancialStatusChart.tsx` sumaba `t.amount` directamente sin conversión de moneda. Si el usuario tenía transacciones en USD y BS, se mezclaban sin convertir a la moneda de visualización.
- **Fix chartData**: Cada transacción ahora usa `convertBetween(t.amount, txCurrency, displayCurrency)` donde `txCurrency` viene de la cuenta vinculada (`account.currency || 'USD'`). Aplica a income, expense y saving.
- **Fix totals**: Igual que chartData, todos los totales convierten usando la moneda de la cuenta. Balance corregido: `income - expense - saving` (antes no restaba ahorro).
- **Responsividad**: Altura dinámica del gráfico según viewport: 200px (<480px), 240px (<768px), 280px (desktop). Listener `resize` para ajuste en tiempo real. Summary usa `grid` con `auto-fit` en lugar de `flex`. Eliminado selector de moneda redundante del header (ya existe en contexto global).
- **Dashboard.tsx**: Media queries ajustados para `chart-card` en 1024px y 768px.
- **Imports nuevos**: `subscribeToAccounts`, tipo `FinancialAccount` añadidos al componente.

### 20/05/2026 - Fix Crítico: Balances Exagerados en Todas las Cuentas
- **Bug**: Transacciones de tipo `saving` (ahorro) se **sumaban** al balance en lugar de **restar**, causando valores exageradísimos en todas las cuentas para todos los usuarios.
- **finanzas/page.tsx**: Corregida lógica de deltas en 3 handlers:
  - `handleAddTransaction` (línea 226): `expense ? -amount : amount` → `income ? amount : -amount`
  - `handleDeleteTransaction` (línea 265): `expense ? amount : -amount` → `income ? -amount : amount`
  - `handleVepayConfirm` (línea 365): `expense ? -finalAmount : finalAmount` → `income ? finalAmount : -finalAmount`
- **Lógica correcta**: income suma (+), expense resta (-), saving resta (-).
- **Para corregir balances existentes**: Usar "Gestión Contable" → "Recalcular Balances" en Finanzas. La función `recalculateAccountBalance` en `accounts.ts:187` ya tiene la lógica correcta.

### 19/05/2026 - Fix Doble Conversión Multi-Moneda en Widgets de Resumen
- **Bug**: Los widgets de resumen (Ingresos, Gastos, Ahorro, Balance Total) mostraban valores absurdos porque `formatAmount` convertía valores que ya habían sido convertidos por `summary` y `totalBalance`. Ejemplo: 79 BS se multiplicaba por la tasa del día dos veces.
- **finanzas/page.tsx**: Cambiado `formatAmount` → `formatInCurrency` en las 4 summary cards (líneas 838-850). `formatInCurrency` solo formatea sin convertir, evitando la doble conversión.
- **accounts.ts**: Eliminado código duplicado - la función `recalculateAccountBalance` estaba repetida 6 veces (líneas 222-377). Ahora solo existe una vez correctamente.
- **next.config.ts**: Agregado `turbopack.root: __dirname` para fix de build.
- **.gitignore**: Agregados patrones para archivos sensibles (`*-firebase-adminsdk-*.json`, `scripts/wipe-users-*.js`).

### 18/05/2026 - Dashboard: Eliminar Balance Total + Efectos Neón + Flechas Scroll
- **Dashboard.tsx**: Eliminado stat pill "Balance Total" () de la fila de stats superiores. Quedan 4 pills: Ahorro Mensual, Ahorro en Planes, Recurrentes/Mes, Metas Completadas.
- **Efectos Neón**: Agregados `drop-shadow` y `box-shadow` con glow esmeralda en: welcome banner, stat pills, section headers, content cards, progress ring, deadline badges, account balances. Variables CSS `--neon-green`, `--glow-sm/md/lg` en `globals.css`. Hover effects con glow en cards y pills.
- **Bottom Section**: Nueva estructura con `bottom-section-wrapper` (wrapper relativo) + `bottom-section` (grid scrollable) + flechas izquierda/derecha posicionadas absoluto. Flechas solo visibles en `<=1024px` con `display: flex`. Grid mantiene 3 columnas en desktop, scroll horizontal en tablet/móvil con `scroll-snap-type`.
- **Theme Toggle**: Agregado glow esmeralda en hover del botón de tema.
- **Build**: `tsc --noEmit` exitoso sin errores.

### 18/05/2026 - Fixes Finales Planes Financieros
- **Firestore Rules**: Agregadas reglas para `plans` (CRUD propietario), `expense_requests` (crear emisor, actualizar emisor/receptor, eliminar emisor), `recurring_payments` (CRUD propietario).
- **Modal Overlay CSS**: Agregado `.modal-overlay` con `position: fixed`, `z-index: 1000`, `backdrop-filter: blur` al `<style>` de metas/page.tsx. Modal centrado como transferencia.
- **Firestore undefined fix**: Campos `frequency`, `nextDueDate`, `accountId` solo se incluyen cuando tienen valor real (no undefined).
- **Renombrado UI**: "Mis Metas" → "Planes Financieros" en Sidebar, Topbar (búsqueda y menú móvil).
- **Perfil usuario en compartir**: Al escribir email en modal compartir, se busca usuario y muestra tarjeta con avatar (foto o inicial), nombre, email y check verde. Botón enviar se habilita solo con usuario válido.
- **searchUserByEmail**: Tipo de retorno explícito con `displayName`, `email`, `photoURL` nullable.
- **Build**: `tsc --noEmit` y `npm run build` exitosos sin errores.

### 17/05/2026 - Planes Financieros (Reestructuración Metas)
- **Types**:
  - `types/index.ts`: Nuevos tipos `FinancialPlan` (reemplaza Goal como entidad principal), `ExpenseRequest`, `RecurringPayment`. `PlanType` = 'savings' | 'expense' | 'recurring'. `PlanCategory` con 13 categorías (Ahorro, Inversión, Comida, Tecnología, Vivienda, etc.). `RecurringFrequency` = 'weekly' | 'biweekly' | 'monthly' | 'quarterly' | 'yearly'. `RequestStatus` = 'pending' | 'accepted' | 'rejected' | 'cancelled'. Goal mantenido para compatibilidad.
- **Firestore Plans**:
  - `lib/firestore/plans.ts`: Nuevo módulo con `subscribeToPlans`, `getPlansByOwnerId`, `createPlan`, `updatePlan`, `deletePlan`, `addFundsToPlan`, `recordPayment`, `completePlan`, `cancelPlan`, `resetPlan`, `getPlansByType`, `getPlansByStatus`, `getPlanSummary` (resumen financiero total).
- **Firestore Requests**:
  - `lib/firestore/requests.ts`: Nuevo módulo con `sendExpenseRequest`, `respondToRequest`, `cancelRequest`, `deleteRequest`, `subscribeToSentRequests`, `subscribeToReceivedRequests`, `getRequestsByPlan`, `getPendingReceivedRequests`, `searchUserByEmail`.
- **Firestore Recurring**:
  - `lib/firestore/recurring.ts`: Nuevo módulo con `recordRecurringPayment`, `getPaymentsByPlan`, `subscribeToPlanPayments`, `getPaymentsByOwner`, `deletePayment`, `getDueRecurringPlans`, `getMonthlyRecurringSummary`. Cálculo automático de próxima fecha según frecuencia.
- **Metas Page**:
  - `app/metas/page.tsx`: Reescritura completa. Header con stats cards (ahorro total, gastos planificados, recurrentes mensuales, estado general). Filtros por tipo y estado. Sección de solicitudes recibidas con aceptar/rechazar. Grid de planes con icono, tipo, progreso visual, metadata (fecha, frecuencia, invitados). Acciones por plan: añadir fondos (savings), registrar pago (recurring), abonar (expense), compartir, editar, eliminar. Modales: crear/editar plan con selector de tipo visual, añadir fondos con cuenta vinculada, registrar pago recurrente, compartir gasto con email de usuario.
- **GoalsContext**:
  - `lib/contexts/GoalsContext.tsx`: Agregado soporte para `FinancialPlan` con `plans` state, `addPlan`, `updatePlanFn`, `deletePlanFn`, `refresh`.
- **Icons**:
  - `app/components/icons.tsx`: Añadidos `IconUsers` (compartir) e `IconClock` (tiempo/frecuencia).
- **Build**: `tsc --noEmit` y `npm run build` exitosos sin errores.

### 17/05/2026 - Gestión Contable Avanzada + CSS Fixes
- **Firestore Accounts - Gestión Contable**:
  - `lib/firestore/accounts.ts`: Nuevas funciones `recalculateAccountBalance(accountId)` recalcula balance desde transacciones activas (income +, expense -, saving -). `recalculateAllBalances(ownerId)` recalcula todas las cuentas. `wipeAllTransactions(accountId)` elimina todas las transacciones de una cuenta y resetea balance a 0. `wipeTransactionsByTypeWithAdjustment(accountId, type)` elimina transacciones por tipo con ajuste contable automático (eliminar ingresos resta, eliminar gastos/ahorros suma). `wipeTransactionsByDateRange(accountId, start, end)` elimina por rango de fechas. `wipeAllUserTransactions(ownerId)` vacía todo el usuario. `wipeUserTransactionsByType(ownerId, type)` vacía por tipo en todas las cuentas.
- **Finanzas Page - Modal Contable**:
  - `app/finanzas/page.tsx`: Nuevo botón "Gestión Contable" en header. Modal con dos secciones: Acciones Globales (vaciar todo, vaciar ingresos/gastos/ahorros, recalcular balances) y Por Cuenta (acciones individuales por cuenta). Cada acción tiene confirmación con descripción del impacto contable. Feedback visual con resumen de ajustes. UI con cards por cuenta, botones con iconos y colores por tipo. Info box explicando lógica contable. Responsive completo.
- **CSS Fixes**:
  - `app/globals.css`: Agregada variable `--color-error: #EF4444` (usada en 19 lugares pero no definida). Corregido `.btn-outline` background de `var(--bg-secondary)` a `transparent` para que botones outlined no tengan fondo oscuro.
- **Build**: `tsc --noEmit` y `npm run build` exitosos sin errores.

### 04/04/2026 - Cuentas Financieras + Transacciones Vinculadas
- **Types**:
  - `types/index.ts`: Nuevo tipo `FinancialAccount` con `id`, `ownerId`, `name`, `type`, `balance`, `icon`, `color`, `createdAt`, `updatedAt`. `AccountType` = 'checking' | 'savings' | 'cash' | 'custom'. `Transaction` ahora tiene `accountId?`.
- **Firestore Accounts**:
  - `lib/firestore/accounts.ts`: Nuevo módulo con `subscribeToAccounts`, `getAccountsByOwnerId`, `createAccount`, `updateAccount`, `deleteAccount`, `updateAccountBalance`, `getTotalBalance`, `createDefaultAccounts`.
- **Finanzas Page**:
  - `app/finanzas/page.tsx`: Reescritura completa. Grid de cuentas con cards estéticas. Selector de cuenta en filtros. Modal para crear cuentas (nombre, tipo, balance inicial). Transacciones vinculadas a cuentas con badge. Al crear/eliminar transacción se actualiza balance. Columna "Cuenta" en tabla. Filtro por cuenta. Balance total desde `getTotalBalance`.

### 04/04/2026 - Selects Estéticos + Custom Categories + Sparklines Reales
- **CustomSelect Component**:
  - `app/components/CustomSelect.tsx`: Nuevo componente dropdown con animaciones, iconos, check de selección, input inline para añadir opciones personalizadas.
- **Metas Page**:
  - `app/metas/page.tsx`: Select de categoría usa `CustomSelect`. Categorías custom se guardan en Firestore (`customCategories`). Filter bar incluye categorías custom. Sparklines usan transacciones reales via `generateRealSparklineData()`. `handleAddFunds` crea transacción automática con descripción "Ahorro para: {meta}". Modal de detalle muestra `monthlyGrowth` y `streakDays` reales.
- **Dashboard**:
  - `app/components/Dashboard.tsx`: Select de categoría en modal "Nueva Meta" usa `CustomSelect`. Carga preferencias del usuario al montar.
- **Calendario**:
  - `app/calendario/page.tsx`: Select de tipo de recordatorio usa `CustomSelect`. Tipos personalizados se guardan en Firestore (`customReminderTypes`).
- **Finanzas**:
  - `app/finanzas/page.tsx`: Selects de tipo y categoría usan `CustomSelect`. Categorías de transacción personalizables (`customTransactionCategories`). Filtros con iconos.
- **Firestore Users**:
  - `lib/firestore/users.ts`: Nuevas funciones `addCustomCategory`, `addCustomReminderType`, `addCustomTransactionCategory`, `getUserPreferences`. Usa `arrayUnion` para evitar duplicados.
- **Firestore Transactions**:
  - `lib/firestore/transactions.ts`: Nuevas funciones `getGoalSavingsHistory`, `getMonthlyGrowthForGoal`, `getStreakDaysForGoal`. Calculan estadísticas reales desde transacciones.
  
  ### 04/04/2026 - Gráfica Financiera Premium con Recharts
  - **Dependencias**:
    - `package.json`: Agregadas `recharts` y `@types/recharts`.
  - **FinancialStatusChart Component**:
    - `app/components/FinancialStatusChart.tsx`: Nuevo componente con AreaChart de Recharts. Curvas monotone, degradado opacity 0.2→0.0. onSnapshot de Firestore para datos en tiempo real. Selectores de rango (1D, 1S, 1M, 3M, 6M, YTD). CustomTooltip con formato moneda EUR. Skeleton loading. ResponsiveContainer. Limpieza de listener con unsubscribe().
  - **Dashboard Integration**:
    - `app/components/Dashboard.tsx`: Reemplazado LineChart por FinancialStatusChart. Eliminadas variables no usadas (chartView, chartPeriod, weeklyData, incomeVsExpenseData). Limpieza de imports.
  
  ### 04/04/2026 - Eliminar Cuentas + Borrar Historial de Transacciones
  - **Types**:
    - `types/index.ts`: Agregados campos `archived?: boolean` y `archivedAt?: number` a `Transaction`.
  - **Firestore Transactions**:
    - `lib/firestore/transactions.ts`: `subscribeToTransactions` y `getTransactionsByOwnerId` ahora filtran transacciones con `archived: true`.
  - **Firestore Accounts**:
    - `lib/firestore/accounts.ts`: Nueva función `clearAccountHistory(accountId)` que marca transacciones como archivadas en lugar de eliminarlas. `deleteAccount` elimina cuenta + transacciones.
  - **Finanzas Page**:
    - `app/finanzas/page.tsx`: Botón de borrar historial (IconArchive) junto al de eliminar cuenta. Confirmación separada para cada acción. Mensaje corregido en eliminación de cuenta.
  - **Icons**:
    - `app/components/icons.tsx`: Nuevos iconos `IconArchive` (caja de archivo) e `IconReset` (reiniciar).
  
  ### 04/04/2026 - Gestión Avanzada de Cuentas y Historial
  - **Firestore Accounts**:
    - `lib/firestore/accounts.ts`: Nuevas funciones `deleteTransactionsByType(accountId, type)` elimina transacciones por tipo (income/expense/saving). `resetAccountBalance(accountId)` resetea balance a 0. `clearAllTransactionHistory(ownerId)` archiva todas las transacciones del usuario.
  - **Finanzas Page**:
    - `app/finanzas/page.tsx`: Botón "Borrar Historial" en header para archivar todas las transacciones. En cada card de cuenta: botón archivar historial, botón resetear balance, dropdown con opciones para eliminar ingresos/gastos/ahorros por separado y eliminar cuenta completa. Confirmaciones con advertencias detalladas sobre consecuencias.
  - **Icons**:
    - `app/components/icons.tsx`: Nuevo icono `IconReset` (flecha circular).
  
  ### 04/04/2026 - Gráfica Recharts en Dashboard y Finanzas
  - **Dashboard**:
    - `app/components/Dashboard.tsx`: `FinancialStatusChart` integrado con `onSnapshot` para actualización en tiempo real ante cualquier cambio en transacciones.
  - **Finanzas**:
    - `app/finanzas/page.tsx`: Reemplazado `LineChart` por `FinancialStatusChart`. Eliminadas variables no usadas (`chartPeriod`, `incomeVsExpenseData`). La gráfica se actualiza automáticamente al agregar/eliminar transacciones o modificar balances.
  
  ### 04/04/2026 - Gráfica de Barras Simplificada
  - **FinancialStatusChart**:
    - `app/components/FinancialStatusChart.tsx`: Reescrito como BarChart con 3 barras (Ingresos 📥, Gastos 📤, Ahorro 💰). Selectores: Día (24h), Semana (7 días), Mes (4 semanas), Año (12 meses). Resumen con totales de ingresos, gastos, ahorro y balance. Tooltip personalizado con formato moneda. Actualización en tiempo real via onSnapshot. Botón toggle 👁️/ para ocultar/mostrar montos en widgets y barras del gráfico. Colores: verde (#3DCC8E) ingresos, rojo (#EF4444) gastos, naranja (#F59E0B) ahorro.
  
  ### 04/04/2026 - Páginas Próximamente
  - **Nuevas páginas**: `app/logros/page.tsx`, `app/ayuda/page.tsx`, `app/comunidad/page.tsx`. Todas con mensaje "Próximamente" y diseño centrado con icono emoji.
  - **Responsive**: Clases CSS `.coming-soon` con 3 breakpoints (768px, 480px) para adaptación en móvil/tablet.
  
  ### 04/04/2026 - Responsive Mobile Completo del Dashboard
  - **globals.css**:
    - Nuevas clases base: `.main-grid` (2 columnas: gráfico + metas), `.bottom-grid` (3 columnas), `.goals-panel`.
    - Mobile 768px: `.stats-grid` en 2 columnas, `.main-grid` y `.bottom-grid` en 1 columna, stat-cards con `aspect-ratio: auto`, padding reducido, fuentes más pequeñas.
    - Mobile 480px: Stat-cards más compactas (min-height 70px, padding 6px), fuentes reducidas, topbar con gap mínimo, elementos con `flex-shrink: 0`.
    - Topbar mobile: Logo, collapse-btn, menu-btn con `flex-shrink: 0` para no aplastarse.
  
  ### 04/04/2026 - Compatibilidad Redmi 9A / Gama Baja
  - **Viewport**: `maximumScale: 1` en layout.tsx para evitar zoom accidental.
  - **Box-sizing**: `border-box` global ya aplicado.
  - **Gap Fallback**: Margin negativo en grids + margin positivo en hijos como fallback para navegadores antiguos sin soporte de `gap`.
  - **Tipografía Clamp**: Todas las clases `.text-*` usan `clamp()` para escalado automático según viewport.
  - **100dvh Fix**: `height: 100dvh` + `height: -webkit-fill-available` para barras de navegación dinámicas en móviles.
  - **Flex-shrink**: Iconos de topbar, logo y botones con `flex-shrink: 0` para evitar aplastamiento.
  - **Min-width**: `.topbar-title-dynamic` con `min-width: 60px`, grids con `min-width: 0` para evitar desbordamiento.

### 04/04/2026
- **Overflow-X Fix**:
  - `app/globals.css`: Agregado `overflow-x: hidden; max-width: 100vw` a html y body. Clase `.page-content-overflow-fix` con `max-width: 100vw; overflow-x: hidden`.
  - `app/components/DashboardLayout.tsx`: Agregada clase `page-content-overflow-fix` al div `.page-content`.
  - `app/finanzas/page.tsx`: Eliminado wrapper `.finanzas-wrapper` redundante.
  - `app/metas/page.tsx`: Eliminado wrapper `.metas-wrapper` redundante.
- **Dashboard Funcional**:
  - `app/components/Dashboard.tsx`: Stat cards con clase `stat-card-clickable` (cursor pointer). Metas Activas→/metas, Completadas→/metas, Ahorro→/finanzas, Lecciones→/cursos. Círculo progreso: r cambiado de 50 a 54 (coincide con circumference 339.292). Botón "+ Añadir Nuevo Objetivo" usa `router.push('/metas')`. Milestone items con `milestone-item-clickable`→/metas.
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
5. **Búsqueda avanzada**: Extender búsqueda a cursos, transacciones y comunidad.

## Instrucciones para errores conocidos
### Error: "No se ven las metas en producción (Vercel)"
- **Causa**: Variables de entorno de Firebase no configuradas en Vercel.
- **Solución**: Agregar las 7 variables NEXT_PUBLIC_FIREBASE_* en Vercel Dashboard → Settings → Environment Variables. Luego hacer redeploy.
- **Archivo de referencia**: `VERCEL_ENV_VARS.txt` contiene los valores actualizados del proyecto `prospeweb`.

### Error: "404 en /logros, /ayuda, /comunidad"
- **Causa**: Esas páginas no existen aún en el proyecto.
- **Solución**: Ignorar los errores o crear esas páginas cuando sea necesario.

### 19/05/2026 - Borrado Total de Datos en Firestore
- **Nueva función `wipeAllUserData`** en `lib/firestore/accounts.ts`: Elimina TODAS las colecciones del usuario en Firestore (transactions, accounts, goals, plans, reminders, notifications, expense_requests, recurring_payments, feedback, user_course_progress, users). También borra solicitudes recibidas donde el usuario es `toOwnerId`.
- **`deleteAccount` refactorizado** en `lib/contexts/AuthContext.tsx`: Reemplazada lógica antigua (que usaba `userId` y solo borraba 4 colecciones) por llamada a `wipeAllUserData`. Ahora borra todo consistentemente.
- **Nueva función `wipeAllData`** en `AuthContext.tsx`: Permite borrar todos los datos del usuario **sin eliminar la cuenta**. Recrea cuentas por defecto después del borrado.
- **Configuración mejorada** en `app/configuracion/page.tsx`: Nueva tarjeta amarilla "Borrar Todos Mis Datos" en tab Seguridad. Requiere escribir "BORRAR" para confirmar. Recarga la página tras borrar.
- **Build**: `tsc --noEmit` exitoso sin errores.

### 25/05/2026 - Rollback a Commit 71514a7
- **Acción**: Se realizó un rollback del repositorio al commit `71514a705c19b7926236a51d038384c8f52f648d` para restaurar el estado del proyecto.
- **Archivos afectados**: Todos los archivos locales y remotos fueron revertidos a este commit.
- **Push forzado**: Se ejecutó `git push --force origin master` para actualizar el repositorio remoto.

### 25/05/2026 - Animaciones fluidas en toda la web (test)
- **AnimatedSection.tsx**: Nuevo componente reutilizable que anima elementos al entrar en viewport con tipos: fade-up, fade-down, fade-left, fade-right, scale, pulse, float. Soporta retrasos escalonados.
- **globals.css**: Añadidas keyframes y clases utilities para animaciones suaves y consistentes en todos los dispositivos, inspiradas en la landing page. Se corrigió el transform inicial de .animate-on-scroll para asegurar que las animaciones se activen correctamente.
- **Uso**: Reemplazar usos de AnimatedSection en app/page.tsx y cualquier otro componente por el nuevo componente con prop `animationType`.
- **Objetivo**: Mejorar la experiencia de usuario con transiciones fluidas sin afectar rendimiento.
- **Fix 25/05/2026**: Corregido error de importación en app/page.tsx (ruta incorrecta '@/components/AnimatedSection' → './components/AnimatedSection') que causaba fallo en el build de Turbopack.
