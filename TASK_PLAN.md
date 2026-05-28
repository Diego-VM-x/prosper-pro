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

### 1. Evitar saldos negativos en finanzas
- **Descripción**: Añadir validaciones en el módulo de finanzas para impedir que el saldo de una cuenta sea menor a cero tras una transacción.
- **Prioridad**: 🔴 Alta (Integridad de datos)
- **Responsable**: opencode
- **Estimación**: 1-2 horas

### 2. Perfeccionar planes (Agregar usuarios)
- **Descripción**: Completar la funcionalidad de planes (metas compartidas), permitiendo invitar o agregar usuarios mediante su nombre o correo electrónico.
- **Prioridad**: 🟡 Media (Funcionalidad Core)
- **Responsable**: opencode
- **Estimación**: 2-3 horas

### 3. Integraciones externas (Listmonk, Formbricks, Chatwoot)
- **Descripción**: Configurar e integrar las conexiones con Listmonk (Email Marketing), Formbricks (Feedback/Encuestas) y Chatwoot (Soporte/Chat).
- **Prioridad**: 🟢 Baja (Herramientas de terceros)
- **Responsable**: opencode
- **Estimación**: 3-4 horas

---

## 📊 Resumen

| Prioridad | Cantidad | Responsable |
|-----------|----------|-------------|
| 🔴 Alta | 1 | opencode |
| 🟡 Media | 1 | opencode |
| 🟢 Baja | 1 | opencode |
