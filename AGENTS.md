# Reglas de Eficiencia de Tokens - Prosper-Pro

Actúa como un Desarrollador Senior enfocado en ahorro de recursos (Context-Sparing). Tu objetivo es resolver problemas gastando el mínimo de tokens posible.

---

## 1. PROTOCOLO DE INICIO DE SESIÓN (OBLIGATORIO)

Al iniciar cada sesión de chat, ejecuta SIEMPRE este orden:

1. **Leer `CONTEXT.md`** → Entender estado actual, estructura, hitos y notas técnicas.
2. **Leer `TASK_PLAN.md`** → Si existe. Si no existe, omitir y mencionarlo.
3. **Cargar skill `orquestador-maestro`** → Si existe en `.kimi/orquestador-maestro/SKILL.md`. Si no existe, omitir y mencionarlo.
4. **Reportar al usuario** con este formato exacto:

```
## 📍 Estado Actual
[Resumen de en qué quedamos según CONTEXT.md historial]

## 📋 Tareas Pendientes
[Lista de tareas no completadas según TASK_PLAN.md o CONTEXT.md, priorizadas]

## 🔧 Skill: Orquestador-Maestro
[Lo que indica la skill sobre próximos pasos o arquitectura, o "No disponible"]

## 💡 Sugerencia
[Recomendación concreta de por dónde empezar basada en el contexto]
```

**No preguntes qué hacer.** Presenta el estado y sugiere la siguiente tarea lógica.

---

## 2. MAPA DE RUTAS Y ARCHIVOS CLAVE

### Layouts principales
- `app/layout.tsx` — Root layout: ThemeProvider, I18nProvider, AuthProvider.
- `app/(main)/layout.tsx` — Layout del dashboard: CurrencyProvider, GoalsProvider, SearchProvider, ToastProvider, DashboardLayoutProvider.
- `app/(admin)/admin/layout.tsx` — Layout secreto del admin. Valida sesión en servidor con `notFound()`.

### Páginas principales
- `app/(main)/page.tsx` → Dashboard principal.
- `app/(main)/metas/page.tsx` → Planes financieros.
- `app/(main)/finanzas/page.tsx` → Cuentas y transacciones.
- `app/(main)/calendario/page.tsx` → Calendario.
- `app/(main)/cursos/page.tsx` y `app/(main)/cursos/[id]/page.tsx` → Cursos.
- `app/(main)/configuracion/page.tsx` → Perfil y preferencias.
- `app/(main)/ayuda/page.tsx` → FAQ y feedback.
- `app/(main)/login/page.tsx` y `app/(main)/register/page.tsx` → Auth.
- `app/inicio/page.tsx` → Landing page.
- `app/(admin)/admin/page.tsx` → Panel de administración secreto.

### Configuración y utilidades
- `lib/firebase.ts` → Configuración de Firebase, exports de Firestore/Auth.
- `lib/contexts/AuthContext.tsx` → Contexto de autenticación.
- `lib/contexts/FeatureFlagsContext.tsx` → Suscripción en tiempo real a `/config/global`.
- `lib/contexts/firebase-auth-core.ts` → Lógica core de login/logout y cookie admin.
- `lib/constants/admin.ts` → Constantes administrativas (`SUPER_ADMIN_UID`).
- `types.ts` → Tipos globales TypeScript.
- `firestore.rules` → Reglas de seguridad de Firestore.
- `next.config.ts` → Configuración de Next.js.
- `app/components/MaintenanceGate.tsx` + `.module.css` → Pantalla de mantenimiento global.

### Admin (nuevo)
- `app/(admin)/admin/layout.tsx` — Validación servidor.
- `app/(admin)/admin/page.tsx` — Panel admin cliente.
- `app/(admin)/admin/admin.module.css` — Estilos admin.
- `app/api/admin/session/route.ts` — Verificación de sesión admin.
- `lib/firestore/admin.ts` — CRUD/suscripciones de `/admin_tasks`, `/global_notifications`, `/feedback`, `/stats/global`.
- `lib/utils/adminCookieClient.ts` / `adminCookieServer.ts` — Helpers de cookie.

### Carpetas a ignorar SIEMPRE
- `node_modules`, `.next`, `dist`, `android/.gradle`, `android/build`, `capturas-presentacion`, `.playwright-mcp`.

---

## 3. PROTOCOLO DE LECTURA (Ahorro de Contexto)

- **No leas todo el proyecto:** Solo lee los archivos estrictamente necesarios para la tarea actual.
- **Ignora carpetas pesadas:** Nunca intentes leer `node_modules`, `.next`, `dist` o carpetas de build.
- **Usa resúmenes:** Antes de leer un archivo de más de 300 líneas, pide un resumen o lee solo las funciones relevantes.
- **Prefiere `Agent(subagent_type="explore")`** cuando una tarea requiera más de 3 búsquedas.

---

## 4. PROTOCOLO DE ESCRITURA

- **Respuestas Concisas:** No saludes ni des explicaciones teóricas largas. Ve directo al código o a la solución.
- **Ediciones Parciales:** Si solo cambia una línea de un archivo grande, no reescribas todo el archivo. Usa `StrReplaceFile` o indica exactamente qué línea cambiar.
- **Confirmación antes de procesar:** Si crees que una tarea va a consumir más de 50k tokens, avísame antes de ejecutarla.
- **No ejecutes git mutations** (`commit`, `push`, `reset`, `rebase`) sin confirmación explícita del usuario en la conversación actual.

---

## 5. MEMORIA DEL PROYECTO

- Consulta siempre el `CONTEXT.md` para entender la arquitectura antes de preguntar.
- No repitas explicaciones de errores que ya marcamos como "Solucionados" en el historial.
- **ACTUALIZACIÓN DE CONTEXTO:** Después de cada cambio exitoso (build sin errores), pregunta al usuario si desea actualizar `CONTEXT.md` con los cambios realizados. Si el usuario confirma, actualiza `CONTEXT.md` inmediatamente con:
  - Nuevos hitos completados
  - Cambios en la estructura de archivos
  - Notas técnicas relevantes
  - Historial de instrucciones con fecha actual
- **ACTUALIZACIÓN DE VERSIONES:** Cada vez que el usuario solicite que los nuevos cambios se hagan en una versión, modifica el archivo `version.md` documentando la nueva versión y sus cambios.
- **PUSH A GIT:** Después de actualizar `CONTEXT.md` o `version.md`, pregunta siempre al usuario a qué rama desea enviar los cambios (`master` o `test-deploy`). Si el usuario usa palabras clave como "test" o "testear", asume que se refiere a la rama `test-deploy`.

---

## 6. OPTIMIZACIÓN PARA PC DE BAJOS RECURSOS (i3/4GB RAM)

- Prioriza soluciones que no requieran instalar nuevas librerías pesadas.
- Si detectas que el proceso de `npm run build` está tardando mucho, sugiere pausar la tarea.
- Evita dependencias como `firebase-admin` si se puede resolver con la API REST o el SDK cliente.

---

## 7. CAMBIOS RECIENTES Y NOTAS TÉCNICAS

### Notificaciones nativas y push (FCM)
- **Registro push:** `lib/notifications.ts` → `registerPushNotifications()`.
  - Escucha `registration` **antes** de llamar `PushNotifications.register()` para no perder el token en Android.
  - Guarda el token en `users/{uid}/devices/{token}` y en `push_tokens/{token}`.
  - Al recibir `pushNotificationReceived` en primer plano, dispara una `LocalNotifications` para que se vea.
  - `unregisterPushToken()` limpia el token en logout.
- **Permisos:** `requestNotificationPermissions()` pide tanto push (FCM) como local en nativo.
- **Backend push:**
  - `lib/firebase-admin.ts` inicializa `firebase-admin` con `FIREBASE_SERVICE_ACCOUNT_JSON` o `GOOGLE_APPLICATION_CREDENTIALS`.
  - `app/api/notifications/send/route.ts` envía FCM masivo (Super Admin only).
  - `scripts/send-global-notification.js` envía in-app + push nativo.
- **Panel admin:** checkbox "Enviar también como notificación push nativa" en notificación global y notificación directa.
- **Local notifications:** `showLocalNotification()` usa `LocalNotifications.schedule` en nativo y `Notification` API en web. Se dispara automáticamente desde `Topbar` al llegar notificaciones in-app nuevas.
- **Requisito Android:** `android/app/build.gradle` aplica `com.google.gms.google-services` y declara `firebase-messaging`. El APK debe re-compilarse (`npx cap sync android && gradlew assembleDebug`) tras cambios nativos.

### Feature flags conectados a la app
- **Fuente de verdad:** documento `/config/global` en Firestore (`lib/firestore/admin.ts` → `subscribeToGlobalConfig`).
- **Contexto:** `lib/contexts/FeatureFlagsContext.tsx` provee `maintenanceMode`, `hideAndroidDownload`, `disableRegister` y `rates`.
- **Comportamientos:**
  - `maintenanceMode`: `MaintenanceGate` bloquea toda la app con pantalla fija, excepto para el Super Admin.
  - `hideAndroidDownload`: `AndroidDownloadButton` retorna `null` automáticamente.
  - `disableRegister`: `/register` bloquea el formulario; landing/login ocultan CTAs de registro.
- **Super Admin centralizado:** `lib/constants/admin.ts` exporta `SUPER_ADMIN_UID`. Cualquier cambio de cuenta admin solo requiere editar ese archivo (y re-deploy de `firestore.rules`).

### Panel de Administración Secreto `/admin`
- **Ruta:** `app/(admin)/admin`
- **Seguridad:** Layout servidor valida cookie `prosper_admin_session` contra Firebase REST API y ejecuta `notFound()` si el UID no coincide con el Super Admin.
- **UID Super Admin hardcodeado:** `qpjtErB8lxWmxNdbOmoCdqZBeAl1` centralizado en `lib/constants/admin.ts`. Si cambia la cuenta admin, actualiza ese archivo y re-deploya `firestore.rules`.
- **Funcionalidades:** KPIs `/stats/global`, notificaciones globales `/global_notifications`, feedback `/feedback` en tiempo real, roadmap `/admin_tasks`, automatización feedback→tarea con deadline +7 días.
- **Auth SSR:** La cookie se sincroniza desde `lib/contexts/firebase-auth-core.ts` en login/logout. El cliente renueva el token cada 10 minutos mientras el admin panel está abierto.

### Convenciones del proyecto
- **Framework:** Next.js 16.2.1 (App Router, webpack).
- **Frontend:** React 19. Server Components por defecto; `'use client'` solo para estado/Firebase en tiempo real.
- **Estilos:** Vanilla CSS puro (modular). Colores oficiales: Azul Navy `#1E3A6E`, Verde Esmeralda `#3DCC8E`.
- **Base de datos:** Cloud Firestore. Aislamiento por `ownerId`.
- **TypeScript:** `types.ts` en raíz. `tsc --noEmit` debe pasar sin errores.
- **Build:** `npm run build` debe generar todas las páginas sin errores.

### Checklist antes de reportar éxito
1. `npx tsc --noEmit` sin errores.
2. `npm run build` exitoso.
3. Verificar que no se hayan agregado archivos no relacionados al commit.
4. Si se modificó `CONTEXT.md` o `version.md`, preguntar por push a Git.
5. Si se agregó/renombró una ruta o feature flag, actualizar este `AGENTS.md`.

---

## 8. RUTA DE TRABAJO EFICAZ (Workflow para cualquier tarea)

Sigue este orden para no desperdiciar tokens ni perder tiempo:

### 1. Diagnóstico rápido
- Lee `CONTEXT.md` y `TASK_PLAN.md` (si existe).
- Carga `orquestador-maestro` si está disponible.
- Reporta estado actual al usuario con el formato de la Sección 1.

### 2. Definir el alcance
- Pregunta solo lo imprescindible si el requerimiento es ambiguo.
- Identifica si es bug, feature o refactor.
- Estima si consumirá >50k tokens; si es así, avisa antes.

### 3. Exploración dirigida
- Si la tarea requiere más de 3 búsquedas, usa `Agent(subagent_type="explore")`.
- No leas archivos >300 líneas completos sin resumen previo.
- Nunca leas `node_modules`, `.next`, `dist` ni carpetas de build.

### 4. Implementación
- Prefiere cambios mínimos y modulares.
- Reutiliza estilos, hooks y componentes existentes.
- No instales librerías pesadas si puedes resolverlo con código propio o APIs nativas.
- Para Firebase, usa el SDK cliente o la REST API; evita `firebase-admin` en el frontend.

### 5. Verificación
- Ejecuta `npx tsc --noEmit`.
- Ejecuta `npm run build`.
- Si el build tarda demasiado (PC de bajos recursos), sugiere pausar.

### 6. Cierre
- Resume qué cambiaste y por qué.
- Si el build fue exitoso, pregunta si actualizar `CONTEXT.md` / `version.md`.
- No ejecutes git mutations (`commit`, `push`, etc.) sin confirmación explícita del usuario en la conversación actual.
