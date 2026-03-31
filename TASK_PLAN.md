# Plan de Acción: Prosper-Pro

## 📋 Tareas Pendientes

### 1. Módulo de Cursos - Academia Prosper
- **Descripción**: Desarrollar la página `/cursos` con listado de cursos de educación financiera, tarjetas de progreso por módulo, sistema de lecciones y contenido gamificado. Incluir vista de detalle del curso con módulos expandibles.
- **Prioridad**: Alta
- **Estimación**: 4-6 horas
- **Fecha**: 01/04/2026
- **Archivos a crear**: `app/cursos/page.tsx`, `lib/firestore/courses.ts`

### 2. Página de Calendario
- **Descripción**: Crear `/calendario` con vista mensual/semanal de recordatorios, sesiones con mentor y eventos financieros. Integrar con la colección `reminders` de Firestore. Permitir crear nuevos recordatorios desde el calendario.
- **Prioridad**: Media
- **Estimación**: 3-4 horas
- **Fecha**: 02/04/2026
- **Archivos a crear**: `app/calendario/page.tsx`, componente `CalendarView`

### 3. Página de Finanzas
- **Descripción**: Crear `/finanzas` con dashboard de transacciones detalladas, gráficos de ingresos vs gastos, categorías de gasto, y resumen mensual. Conectar con la colección `transactions` de Firestore.
- **Prioridad**: Alta
- **Estimación**: 4-5 horas
- **Fecha**: 03/04/2026
- **Archivos a crear**: `app/finanzas/page.tsx`, componente `TransactionList`, `FinanceChart`

### 4. Página de Comunidad
- **Descripción**: Crear `/comunidad` con perfil de miembros, ranking de usuarios, actividad reciente, y funcionalidad para invitar nuevos miembros. Conectar con `community_members` de Firestore.
- **Prioridad**: Media
- **Estimación**: 3-4 horas
- **Fecha**: 04/04/2026
- **Archivos a crear**: `app/comunidad/page.tsx`

### 5. Página de Logros
- **Descripción**: Crear `/logros` con galería de logros desbloqueados y bloqueados, sistema de progreso por categoría, y animaciones de desbloqueo. Conectar con `achievements` y `xp_states`.
- **Prioridad**: Media
- **Estimación**: 2-3 horas
- **Fecha**: 05/04/2026
- **Archivos a crear**: `app/logros/page.tsx`

### 6. Página de Configuración
- **Descripción**: Crear `/configuracion` con opciones de perfil (nombre, foto, email), preferencias de tema, notificaciones, y opción de eliminar cuenta.
- **Prioridad**: Baja
- **Estimación**: 2-3 horas
- **Fecha**: 06/04/2026
- **Archivos a crear**: `app/configuracion/page.tsx`

### 7. Página de Ayuda
- **Descripción**: Crear `/ayuda` con FAQ, guía de uso del dashboard, contacto de soporte y tutorial interactivo.
- **Prioridad**: Baja
- **Estimación**: 1-2 horas
- **Fecha**: 07/04/2026
- **Archivos a crear**: `app/ayuda/page.tsx`

### 8. Sincronización del Timer de Estudio con Firestore
- **Descripción**: El timer actual solo funciona en local. Implementar `saveStudyTimer` para guardar el progreso de estudio en Firestore cada cierto intervalo y sincronizar al pausar/detener.
- **Prioridad**: Alta
- **Estimación**: 1-2 horas
- **Fecha**: 01/04/2026
- **Archivos a modificar**: `app/components/Dashboard.tsx`, `lib/firestore/study.ts`

### 9. Implementar Importación de CSV
- **Descripción**: El modal "Importar Datos" no tiene funcionalidad. Implementar lectura de archivos CSV con transacciones y creación automática en Firestore.
- **Prioridad**: Media
- **Estimación**: 2-3 horas
- **Fecha**: 02/04/2026
- **Archivos a modificar**: `app/components/Dashboard.tsx`, crear `lib/csvParser.ts`

### 10. Configurar Repositorio Remoto
- **Descripción**: Agregar remote de GitHub/GitLab y hacer push del código actual. Configurar CI/CD básico si es necesario.
- **Prioridad**: Alta
- **Estimación**: 30 min
- **Fecha**: 01/04/2026
- **Comando**: `git remote add origin <url>` + `git push -u origin master`

### 11. Mejorar Protección de Rutas
- **Descripción**: Actualmente solo el Dashboard usa `ProtectedRoute`. Aplicar protección a todas las páginas del dashboard (`/metas`, `/cursos`, `/finanzas`, etc.) mediante middleware o layout protegido.
- **Prioridad**: Media
- **Estimación**: 1 hora
- **Fecha**: 03/04/2026
- **Archivos a modificar**: `app/layout.tsx`, `app/components/ProtectedRoute.tsx`

### 12. Optimización de Rendimiento
- **Descripción**: Implementar lazy loading para componentes pesados, optimizar imágenes del logo, y reducir bundle size. Revisar imports dinámicos de Firestore.
- **Prioridad**: Media
- **Estimación**: 2-3 horas
- **Fecha**: 05/04/2026
- **Archivos a modificar**: Varios componentes

### 13. Sistema de Notificaciones Push
- **Descripción**: Implementar notificaciones en el navegador para recordatorios de metas, sesiones con mentor y logros desbloqueados.
- **Prioridad**: Baja
- **Estimación**: 3-4 horas
- **Fecha**: 08/04/2026
- **Archivos a crear**: `lib/notifications.ts`, service worker

### 14. Tests Básicos
- **Descripción**: Agregar tests unitarios para funciones de Firestore y tests de componentes clave (Dashboard, Metas, Auth).
- **Prioridad**: Baja
- **Estimación**: 4-6 horas
- **Fecha**: 09/04/2026
- **Dependencias**: `@testing-library/react`, `jest`

---

## 📊 Resumen

| Prioridad | Cantidad | Tiempo Total Estimado |
|-----------|----------|----------------------|
| Alta      | 4        | 8-10 horas           |
| Media     | 6        | 13-17 horas          |
| Baja      | 4        | 8-12 horas           |
| **Total** | **14**   | **29-39 horas**      |

## 🎯 Próximos Pasos Inmediatos (Semana 1)
1. Configurar repositorio remoto (30 min)
2. Sincronizar timer de estudio con Firestore (1-2h)
3. Módulo de Cursos (4-6h)
4. Página de Finanzas (4-5h)
