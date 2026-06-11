# Bugs Resueltos — Prosper-Pro

## v1.0.1 (2026-06-11)

### 🔐 Login/Logout Flicker — CRÍTICO
- **Síntoma**: Al iniciar sesión, el usuario era expulsado a /login y luego redirigido automáticamente al dashboard en un bucle.
- **Causa**: El heartbeat en `AuthContext.tsx` usaba `getDeviceInfo()` en lugar de `getDeviceInfoForHeartbeat()`. La primera genera un nuevo `sessionToken` en cada llamada y lo sobrescribe en `sessionStorage`, mientras que Firestore conservaba el token anterior. El heartbeat comparaba token viejo vs token nuevo y detectaba "mismatch" → forzaba logout.
- **Fix**: Heartbeat ahora usa `getDeviceInfoForHeartbeat()` que reusa el token existente sin generar uno nuevo. Commit `8cca99a`.

### 🐢 Login extremadamente lento
- **Síntoma**: Después de ingresar credenciales, la pantalla se quedaba en "cargando..." por 3-10 segundos antes de mostrar el dashboard.
- **Causa**: `onUserReady()` en `firebase-auth-core.ts` era `await` en `initAuth`. Esta función hace: `getUserProfile` → `createUserProfile` (si es nuevo) → `getDeviceInfo` (incluye fetch de IP pública) → `registerDevice` → `notifyNewLogin` → `requestNotificationPermission`. Todo esto bloqueaba `setLoading(false)`.
- **Fix**: `onUserReady` ahora corre en background con `.catch(() => {})` en `initAuth` y en los métodos de login. La UI renderiza inmediatamente. Commit `8cca99a`.

### 🚪 Sesión se cierra sola (logout espontáneo)
- **Síntoma**: Usuario navegando normalmente y de repente es redirigido a /login sin haber hecho nada.
- **Causas múltiples**:
  1. **Error de red en heartbeat**: Si `getUserDevices()` fallaba (Firestore no disponible, red intermitente), `device` era `undefined` y `!device` forzaba logout inmediatamente.
  2. **Dispositivo no registrado aún**: En page reload, `onUserReady` puede tardar más que el heartbeat (especialmente con IP lenta). Si el heartbeat corría antes de que el device se registrara, no lo encontraba → logout.
  3. **Token mismatch de un solo beat**: Un solo heartbeat con token diferente (por ejemplo, por race condition entre pestañas) forzaba logout inmediatamente.
- **Fix**:
  1. Errores de red en `getUserDevices()` ahora se ignoran — no se fuerza logout.
  2. Si el dispositivo no se encuentra, el heartbeat lo **re-registra automáticamente** en lugar de forzar logout.
  3. Token mismatch requiere **2 detecciones consecutivas** antes de logout.
  4. Delay inicial del heartbeat aumentado de 5s a 8s.
  5. `getPublicIP()` ahora tiene timeout de 2s con `AbortController`.
  Commit `8cca99a`.

### 🎭 Dropdown de usuario duplicado en top-right
- **Síntoma**: Dos menús de usuario superpuestos aparecían en la esquina superior derecha.
- **Causa**: El dropdown mobile usaba `createPortal` a `document.body` y se renderizaba siempre que `showUserMenu` era `true`, sin importar si se estaba en desktop o mobile. En desktop ambos dropdowns (desktop + mobile portal) eran visibles simultáneamente.
- **Fix**: El portal mobile ahora solo se renderiza cuando `!isDesktop`. Además, CSS `.mobile-user-dropdown` tiene `display: none` por defecto y solo se muestra en `@media (max-width: 1024px)`. Commit `521e5c7`.

### 🔄 Planes recurrentes no se reiniciaban al vencer el ciclo
- **Síntoma**: Un plan recurrente mensual seguía acumulando `current` indefinidamente en lugar de resetear a 0 cuando iniciaba un nuevo ciclo.
- **Causa**: No existía ninguna lógica que verificara si `nextDueDate` había pasado y reseteara el progreso.
- **Fix**: Nueva función `checkAndResetRecurringPlans()` que revisa todos los planes recurrentes. Si `nextDueDate < hoy`, pone `current: 0` y avanza `nextDueDate` al próximo ciclo válido (maneja múltiples ciclos si la app no se abrió en días). Se ejecuta al cargar planes y cada hora vía `setInterval`. También se corrigió `calculateNextDueDate` que faltaba el case `daily`. Commit `521e5c7`.

### 🚀 Modal de novedades mostraba texto "Sparkles" y "Rocket"
- **Síntoma**: El modal de actualización mostraba literalmente las palabras "Sparkles" y "Rocket" en vez de los emojis ✨ y 🚀.
- **Causa**: Las traducciones en `common.json` tenían los nombres de los iconos como texto literal.
- **Fix**: Reemplazados por emojis Unicode reales en español e inglés. Commit `3d82738`.

---

## v0.9.1 (2026-06-07)

### 💥 "Algo salió mal" en modo privado / Safari iOS
- **Síntoma**: App mostraba pantalla de error/crash en navegadores sandboxed o modo privado.
- **Causa**: `localStorage`/`sessionStorage` no están disponibles en esos entornos. Múltiples componentes accedían sin `try/catch`.
- **Fix**: Creada utilidad `safeStorage.ts` con wrapper + polyfill en memoria. Todos los accesos a storage migrados a la utilidad segura.

---

*Este documento se actualiza cada vez que se resuelve un bug crítico.*
