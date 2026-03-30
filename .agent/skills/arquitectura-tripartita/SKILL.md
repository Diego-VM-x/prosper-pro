---
name: arquitectura-tripartita
description: Supervisa y mantiene la división del proyecto en los 3 pilares clave del ecosistema Prosper (APP, WEB y Publicidad).
---

# Arquitectura Tripartita Prosper-Pro

Este skill garantiza que el código de **Prosper-Pro** se mantenga organizado y escalable al separar las tres áreas de negocio principales en grupos de rutas aislados dentro de Next.js.

## Cuándo usar este skill
- Al crear nuevas páginas o componentes para cualquiera de las tres zonas.
- Cuando se necesite definir layouts específicos para un pilar (ej. un layout móvil para `app/(app)`).
- Para asegurar que los activos de marketing (`app/(publicidad)`) no se mezclen con la lógica pesada de la aplicación central.
- Al revisar que la navegación respete las fronteras de cada pilar.

## Inputs necesarios
- **Pilar objetivo**: (app, web, publicidad) al que pertenece el cambio.
- **Tipo de archivo**: (Página, Componente, Layout, Asset).

## Workflow
1. **Identificación de Zona**: Confirmar que el archivo se ubicará en la ruta correcta:
   - `app/(app)/` para aplicaciones móviles/PWA.
   - `app/(web)/` para el portal de escritorio.
   - `app/(publicidad)/` para landing pages y material publicitario.
2. **Validación de Estilos**: Asegurar que cada zona tenga su propio `pilar.css` o archivos de estilos encapsulados para evitar fugas visuales entre áreas.
3. **Consistencia de Navegación**: Revisar que los enlaces internos no crucen áreas de forma accidental sin un propósito claro.
4. **Verificación de Metadata**: Cada pilar debe tener sus propias etiquetas SEO y títulos configurados en su `layout.tsx` raíz.

## Instrucciones
- Mantén una separación estricta. Un componente de "Marketing" no debe importar lógica compleja de la "APP" a menos que sea compartido explícitamente en una carpeta `components/shared/`.
- No crees archivos fuera de estos tres grupos de rutas sin una justificación arquitectónica aprobada.

## Checklist de ejecución
- [ ] ¿El archivo está en el grupo de ruta correcto (parentesis)?
- [ ] ¿El SEO y Título de la página son específicos para ese pilar?
- [ ] ¿Se han evitado importaciones cruzadas innecesarias entre `(app)` y `(web)`?

## Manejo de errores 
- **Desbordamiento**: Si una página crece demasiado y pertenece a otro pilar, refactorizar moviéndola al grupo de rutas correspondiente.
- **Conflictos de Layout**: Si hay confusión entre layouts compartidos, priorizar el layout dentro del grupo de rutas específico.

## Output (formato exacto)
Al finalizar un cambio, responde con:
### [ Gestión Arquitectónica Prosper-Pro ] 🏛️
- **Pilar afectado**: `[app / web / publicidad]`
- **Ruta del cambio**: `app/([pilar])/[archivo]`
- **Validación de aislamiento**: `[Correcta / Requiere Revisión]`
