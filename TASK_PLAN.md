# Plan de Acción: Prosper-Pro

## ✅ Tareas Completadas
- ✅ Dashboard con grid system, stat cards, gráfico financiero (Recharts), metas activas
- ✅ Sidebar colapsable con persistencia localStorage
- ✅ Topbar con búsqueda funcional, notificaciones, perfil, menú móvil
- ✅ Login/Registro (Google + Email) con ProtectedRoute
- ✅ Mis Metas: CRUD completo, filtros, sparklines reales, categorías custom
- ✅ Calendario: Vista mes/agenda, recordatorios, resumen mensual
- ✅ Finanzas: Cuentas financieras, transacciones vinculadas, balance por cuenta, gráfica de barras
- ✅ Cursos: Listado, detalle con módulos, inscripción, progreso
- ✅ Configuración: Perfil editable, preferencias, notificaciones, zona de peligro (rediseñado con tabs)
- ✅ Ayuda: FAQ con filtros por categoría
- ✅ Gamificación: ~~Logros~~ eliminados (16/05/2026)
- ✅ Comunidad: ~~Chat~~ eliminado (16/05/2026)
- ✅ Importar CSV: Parser funcional con reporte de errores
- ✅ Firebase: ownerId para aislamiento de datos, reglas de seguridad
- ✅ Responsive: 4 breakpoints (1024px, 768px, 480px, 360px)
- ✅ Optimizaciones: Google Fonts next/font, Recharts lazy load, Ably eliminado, Firestore onSnapshot→getDocs
- ✅ Error Boundary + Suspense en root layout
- ✅ Notificaciones push del navegador

## 📋 Tareas Pendientes

### 1. Configurar Vercel para Producción
- **Descripción**: Agregar las 7 variables `NEXT_PUBLIC_FIREBASE_*` en Vercel Dashboard → prosper-pro → Settings → Environment Variables. Los valores están en `VERCEL_ENV_VARS.txt`.
- **Prioridad**: 🔴 Crítica
- **Responsable**: Usuario (requiere acceso a Vercel Dashboard)
- **Estimación**: 10 min

### 2. Redeploy en Vercel
- **Descripción**: Después de agregar las variables, hacer un redeploy desde Vercel Dashboard o con `git push`.
- **Prioridad**: 🔴 Crítica
- **Responsable**: Usuario
- **Estimación**: 5 min

### 3. Activar Firebase Storage (Opcional)
- **Descripción**: Habilitar Firebase Storage en la consola de Firebase para permitir subida de fotos de perfil.
- **Prioridad**: 🟢 Baja
- **Responsable**: Usuario (requiere acceso a Firebase Console)
- **Estimación**: 5 min

### 4. Búsqueda Avanzada
- **Descripción**: Extender la búsqueda global para incluir resultados de cursos y transacciones (no solo metas).
- **Prioridad**: 🟡 Media
- **Responsable**: opencode
- **Estimación**: 1-2 horas

---

## 📊 Resumen

| Prioridad | Cantidad | Responsable |
|-----------|----------|-------------|
| 🔴 Crítica | 2 | Usuario (Vercel) |
| 🟡 Media | 1 | opencode |
| 🟢 Baja | 1 | Usuario (Firebase) |
