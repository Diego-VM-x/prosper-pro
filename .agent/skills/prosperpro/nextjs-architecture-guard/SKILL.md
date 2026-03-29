---
name: nextjs-architecture-guard
description: Perro guardián de la base de código. Exige TypeScript estricto, uso inmaculado del App Router y encapsula la separación de lógica de UI.
---

# Next.js Architecture Guard

## Cuándo usar esta habilidad
- Al iniciar cualquier nuevo componente, módulo, vista o `page.tsx`.
- Durante revisiones de Pull Requests (Code Review) o al refactorizar código.
- Constantemente de fondo al picar la infraestructura de código en Next.js.

## Inputs necesarios (si faltan, extraer del código)
1. **Archivo TypeScript a auditar**: (Ruta del `page.tsx`, `layout.tsx` o módulo `.ts`).
2. **Dependencia del Rendering**: ¿Requiere interacciones directas del lado del cliente o califica como Server Component natural?

## Workflow de Integridad (Clean Code)
1. **Tiranía Estructural (App Router)**: Asegura que todo el sistema de carpetas y archivos se apega a la convención inmutable del App Router de Next.js (`app/[ruta_anidada]/page.tsx`). Usa layouts anidados para código compartido.
2. **Abstracción Quirúrgica**: Extrae, desgarra y separa categóricamente los **Componentes de UI** puros de tu **Lógica de Negocio** (Data fetching, handlers). La vista solo debe consumir variables ya pre-cocinadas.
3. **Mandato SEO Vitalicio**: Implementa de forma dictatorial el export de Metadatos de Next.js (`export const metadata: Metadata = {...}`) nativos en cada página o layout maestro para indexabilidad absoluta.
4. **Documentación Patriótica (JSDoc)**: Toda función exportada al resto de la app DEBE llevar obligatoriamente un bloque de anotación `@param` y `@returns` estructurado integralmente en **idioma Español**.

## Checklist de Calidad Code Review (Orden Fijo)
- [ ] *Política de Cero Tolerancia*: ¿El Tipado es robusto? (Ausencia criminal y total del uso de `any` en todo el flujo de datos del componente).
- [ ] *Enrutamiento Canónico*: ¿Las rutas están bien construidas, separadas en carpetas lógicas y con page handlers válidos?
- [ ] *JSDoc Nativo*: ¿Cada método principal posee su documentación JSDoc respectiva y en español nativo?
- [ ] *Metadatos Orgánicos*: ¿Se incluyó la definición `Metadata` estricta de SEO?

## Output (formato exacto)
Ante validación o corrección, la auditoría debe devolver:

### 1. Reporte de Infracciones TypeScript
- `[Línea X]`: Removido uso temporal o descuidado de `any`. Tipado estrictamente a interface firme.
- `[Línea Y]`: Lógica de UI disociada en componentes modulares.

### 2. Estándares Next.js Aplicados
- [x] Ruteo Canónico App Router estructurado.
- [x] Metadatos SEO aplicados (`title/description`).
- [x] Documentación funcional `JSDoc [ES]`.

### 3. Sello del Arquitecto
**ESTADO DE LA BASE:** [ APROBADO 🛡️ / RECHAZADO (Corrigiendo Arquitectura) ]
