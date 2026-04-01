# Lista de Problemas Técnicos y Optimizaciones

## ✅ Resueltos

### Firebase: Missing or insufficient permissions
- **Estado**: ✅ Resuelto
- **Solución**: Creado `firestore.rules` con reglas de seguridad por colección.

### React Hydration Mismatch
- **Estado**: ✅ Resuelto
- **Solución**: Agregado `suppressHydrationWarning` en `<html>`.

### Metadata
- **Estado**: ✅ Resuelto
- **Solución**: Configurada `metadataBase` y metadata completa en `app/layout.tsx`.

### Login no redirige al dashboard
- **Estado**: ✅ Resuelto
- **Solución**: Agregado `window.location.href = '/'` tras login en `app/login/page.tsx`.

### Logout no redirige al login
- **Estado**: ✅ Resuelto
- **Solución**: Agregado `router.push('/login')` en `AuthContext.tsx`.

### Botón de usuario no funcional
- **Estado**: ✅ Resuelto
- **Solución**: Agregado menú desplegable en `Topbar.tsx`.

### Responsividad
- **Estado**: ✅ Resuelto
- **Solución**: Media queries para 1280px, 1024px, 768px, 480px y 360px en `globals.css`.

### SEO y Rendimiento
- **Estado**: ✅ Resuelto
- **Solución**: Metadata OG/Twitter, headers de seguridad, compresión, formatos AVIF/WebP.

---

## ⚠️ Pendientes

### Variables de entorno en Vercel
- **Descripción**: Las 7 variables `NEXT_PUBLIC_FIREBASE_*` deben configurarse en Vercel.
- **Impacto**: Crítico - sin esto Firebase no funciona en producción.

### Dominio autorizado en Firebase Auth
- **Descripción**: Agregar `prosper-pro.vercel.app` en Authorized domains.

### Página de Finanzas funcional
- **Descripción**: Actualmente es un placeholder. Implementar con datos reales de Firestore.

### Importación CSV
- **Descripción**: El modal "Importar Datos" no tiene funcionalidad completa.
