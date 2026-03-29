---
name: performance-master
description: Audita y refactoriza el código garantizando un Lighthouse Score de 100. Asegura cargas ultraveloces, eliminando clics vacíos o pantallazos negros para una fluidez idéntica a apps nativas (como la Play Store).
---

# Performance Master (Lighthouse Sentinel)

## Cuándo usar esta habilidad
- Siempre que se añadan recursos gráficos (imágenes, SVGs pesados o media).
- Cuando existan problemas de *flashing* (pantallazos blancos/negros) entre la transición de rutas en Next.js.
- Antes del "build" de React, para garantizar que la interfaz se sienta matemáticamente instantánea y continua.

## Inputs necesarios (si faltan, pregunta primero)
1. **Target a optimizar**: El archivo `page.tsx` o `component.tsx` exacto con posibles fugas de rendimiento.
2. **Contexto de estado**: Saber si el módulo necesita obligatoriamente interactividad del usuario (`useState`, eventos) para separar la carga del cliente vs el servidor.

## Workflow de Aceleración
1. **Barrera de Contención Server-First**: Desmenuza tu componente. Fuerza el uso absoluto de **Server Components** por defecto. Segmenta la lógica forzando a que la directiva `'use client'` se aísle solo en los micromódulos estrictamente necesarios (botones interactivos, formularios), reduciendo el JS.
2. **Optimización Extrema de Assets**: Convierte toda instanciación de imagen regular clásica a su equivalente optimizado mediante el componente `<Image />` (`next/image`), asegurando priorización `priority={true}` superior e imponiendo cuotas lógicas de *Sizes* para pre-calcular el cuadro.
3. **Escudo Anti Rerender**: Inspecciona cascadas de reactividad descendente; implementa `React.memo()`, `useCallback` o estructuras de memoización precisas para bloquear que funciones inocentes detonen renderizados cíclicos inútiles en la UI.
4. **Cinemática Ininterrumpida (Play Store Feel)**: El UX es el rey. Modela y configura barreras protectoras (*Skeleton Loaders* en los respectivos archivos `loading.tsx`) para asegurar que todo "salto" de página sea un fundido/expansión continua, erradicando el flash de pantalla negra o flash de recarga de DOM.

## Checklist de Calidad Auditiva (Orden Fijo)
Esta checklist diagnostica el estándar Vitals:
- [ ] ¿Se refactorizó exitosamente restando todo JavaScript o librerías del cliente que no eran de vital uso interactivo?
- [ ] ¿Se suprimió milimétricamente el **Cumulative Layout Shift (CLS)** garantizando que la carga de fuentes y contenedores de imágenes sean pre-anclados?
- [ ] ¿La arquitectura se comporta matemáticamente para entregar un **First Contentful Paint (FCP)** por debajo de 1.5s?
- [ ] ¿La percepción humana al cambiar pestaña enruta suave y continua (skeleton views) sin romper la ilusión de Single Page App nativa móvil?

## Output Estandarizado (formato exacto)
Reporta invariablemente la refactorización siguiendo esto:

### 1. Diagnóstico Lighthouse (Simulado)
*(Desajustes encontrados - FCP/CLS/TTI)*
1. ... *(Máximo 3/5 puntos)*

### 2. Operación Táctica Aplicada
- [x] (Componentes que convertiste a RSC).
- [x] (Imágenes o dependencias optimizadas).
- [x] (Estrategia pre-cálculo para evitar CLS).

### 3. Veredicto Cinemático
**ESTADO DE VELOCIDAD:** [ 100 LIGHTHOUSE (Nativo) / ADVERTENCIA (Bloqueadores JS) ]
**Nota sobre Fricción:** *(Comenta brevemente sobre el feedback de navegación obtenido en routing)*.
