# Plan Detallado - Prosper-Pro

## Estado del Proyecto: ✅ Producción Activa
- **URL**: https://prosper-pro.vercel.app/
- **Última actualización**: 01/04/2026
- **Repositorio**: https://github.com/Diego-VM-x/prosper-pro

---

## Arquitectura Actual

```
Prosper-Pro (Next.js 16 + App Router)
├── app/
│   ├── layout.tsx              → Root layout con SEO optimizado
│   ├── page.tsx                → Dashboard (ProtectedRoute)
│   ├── globals.css             → Design tokens + temas + responsive
│   ├── login/page.tsx          → Login (Google + Email)
│   ├── register/page.tsx       → Registro
│   ├── metas/page.tsx          → CRUD de metas
│   ├── cursos/page.tsx         → Listado de cursos
│   ├── cursos/[id]/page.tsx    → Detalle de curso
│   ├── calendario/page.tsx     → Calendario (placeholder)
│   ├── finanzas/page.tsx       → Finanzas (placeholder)
│   └── components/             → Componentes compartidos
│       ├── Dashboard.tsx       → Widget principal
│       ├── DashboardLayout.tsx → Layout con Sidebar + Topbar
│       ├── Sidebar.tsx         → Navegación (9 rutas)
│       ├── Topbar.tsx          → Barra superior con menú usuario
│       ├── ProtectedRoute.tsx  → Protección de rutas
│       └── ThemeProvider.tsx   → Tema claro/oscuro
├── lib/
│   ├── firebase.ts             → Init Firebase (auth, db)
│   ├── seed.ts                 → Datos iniciales
│   ├── csvParser.ts            → Parser CSV
│   ├── contexts/AuthContext.tsx→ Contexto auth con logout redirect
│   └── firestore/              → 9 módulos
│       ├── goals.ts            → CRUD metas
│       ├── transactions.ts     → Transacciones + weekly data
│       ├── users.ts            → Perfiles
│       ├── gamification.ts     → XP + logros
│       ├── reminders.ts        → Recordatorios
│       ├── notifications.ts    → Notificaciones
│       ├── community.ts        → Miembros comunidad
│       ├── study.ts            → Timer estudio
│       └── courses.ts          → Cursos y progreso
├── types/index.ts              → Interfaces TypeScript
├── scripts/clean-firestore.js  → Script limpieza BD
├── firestore.rules             → Reglas de seguridad
└── firebase.json               → Config Firebase CLI
```

---

## Tareas Completadas ✅

| # | Tarea | Estado | Fecha |
|---|-------|--------|-------|
| 1 | T10: Configurar Repositorio Remoto | ✅ Completado | 01/04/2026 |
| 2 | T8: Sincronizar Timer de Estudio con Firestore | ✅ Completado | 01/04/2026 |
| 3 | T1: Módulo de Cursos - Academia Prosper | ✅ Completado | 01/04/2026 |
| 4 | Fix: Login con Google redirección | ✅ Completado | 01/04/2026 |
| 5 | Fix: Logout con redirección al login | ✅ Completado | 01/04/2026 |
| 6 | Feature: Menú desplegable de usuario | ✅ Completado | 01/04/2026 |
| 7 | SEO: Metadata optimizada (OG, Twitter, robots) | ✅ Completado | 01/04/2026 |
| 8 | Performance: next.config.ts optimizado | ✅ Completado | 01/04/2026 |
| 9 | Responsive: Media queries para todos los dispositivos | ✅ Completado | 01/04/2026 |
| 10 | Security: Firestore rules creadas | ✅ Completado | 01/04/2026 |
| 11 | Deployment: Vercel configurado | ✅ Completado | 01/04/2026 |

---

## Tareas Pendientes 📋

### FASE 2: Páginas Funcionales (Prioridad Alta)

#### T3: Página de Finanzas
- **Descripción**: Dashboard de transacciones con gráficos, filtros y resumen mensual.
- **Prioridad**: Alta
- **Archivos**: `app/finanzas/page.tsx`, `lib/firestore/transactions.ts`
- **Funciones necesarias**: `createTransaction`, `deleteTransaction`, `getMonthlySummary`

#### T9: Importar CSV
- **Descripción**: Funcionalidad del modal "Importar Datos" en Dashboard.
- **Prioridad**: Media
- **Archivos**: `app/components/Dashboard.tsx`, `lib/csvParser.ts`

#### T11: Mejorar Protección de Rutas
- **Descripción**: Aplicar ProtectedRoute a todas las páginas del dashboard.
- **Prioridad**: Media
- **Opción recomendada**: Layout group `(dashboard)/`

### FASE 3: Páginas Secundarias (Prioridad Media)

#### T2: Página de Calendario
- **Descripción**: Vista mensual con eventos y recordatorios.
- **Prioridad**: Media
- **Archivos**: `app/calendario/page.tsx` (existe placeholder)

#### T4: Página de Comunidad
- **Descripción**: Lista de miembros, ranking y actividad.
- **Prioridad**: Media
- **Archivos**: `app/comunidad/page.tsx`

#### T5: Página de Logros
- **Descripción**: Galería de logros desbloqueados y bloqueados.
- **Prioridad**: Media
- **Archivos**: `app/logros/page.tsx`

### FASE 4: Páginas de Soporte (Prioridad Baja)

#### T6: Página de Configuración
- **Descripción**: Perfil, preferencias, eliminar cuenta.
- **Prioridad**: Baja
- **Archivos**: `app/configuracion/page.tsx`

#### T7: Página de Ayuda
- **Descripción**: FAQ, guía de uso, contacto.
- **Prioridad**: Baja
- **Archivos**: `app/ayuda/page.tsx`

### FASE 5: Extras (Prioridad Baja)

#### T13: Notificaciones Push
- **Descripción**: Service worker + notificaciones del navegador.
- **Prioridad**: Baja
- **Archivos**: `public/sw.js`, `lib/notifications.ts`

#### T14: Tests Básicos
- **Descripción**: Tests unitarios y de componentes.
- **Prioridad**: Baja
- **Dependencias**: `@testing-library/react`, `jest`

---

## Próximos Pasos Inmediatos

1. **Configurar variables de entorno en Vercel** (URGENTE - sin esto no funciona)
2. **Agregar dominio en Firebase Auth** (`prosper-pro.vercel.app`)
3. **Desplegar reglas de Firestore** (`npx firebase deploy --only firestore:rules`)
4. **Implementar Página de Finanzas (T3)**
5. **Implementar Importación CSV (T9)**

---

## Notas Técnicas

- **Firebase Project ID**: `prosper-197d4`
- **Usuario admin**: `mjsdiegoverde@gmail.com`
- **Script de limpieza**: `scripts/clean-firestore.js` (requiere service account key)
- **Reglas de Firestore**: Permiten lectura/escritura autenticada por colección
