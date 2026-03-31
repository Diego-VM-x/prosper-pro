# Lista de Problemas Técnicos y Optimizaciones (Logs de Desarrollo)

## Firebase: Missing or insufficient permissions
- **Descripción**: Los módulos de Firestore están fallando al intentar leer datos porque no tienen permisos suficientes (`Missing or insufficient permissions`).
- **Archivos**: `lib/firestore/*.ts` (transactions, study, gamification, reminders, community, goals, achievements).
- **Acción**: Revisar y actualizar `firestore.rules`.

## React Hydration Mismatch
- **Descripción**: Error de hidratación debido a cambios en atributos del DOM (posiblemente por extensiones de navegador o diferencias entre SSR y cliente).
- **Archivos**: `app/layout.tsx` (estructura del body).
- **Acción**: Verificar el uso de `suppressHydrationWarning` y componentes que acceden a `window` o datos variables durante la renderización inicial.

## Unique Keys in React
- **Descripción**: Se detectaron elementos con la misma llave (`key="Otro"`).
- **Archivos**: Probablemente en componentes de renderizado de listas (filtros, selecciones).
- **Acción**: Asegurar que todas las listas en `app/components/` tengan `key` únicos.

## Scroll Behavior
- **Descripción**: Conflicto con `scroll-behavior: smooth` global.
- **Acción**: Seguir recomendación de Next.js de usar `data-scroll-behavior="smooth"` en el `<html>`.

## Metadata
- **Descripción**: Falta configurar `metadataBase` en el layout principal.
- **Acción**: Añadir configuración en el objeto `metadata` de `app/layout.tsx`.
