---
name: guardian-del-diseno
description: Asegura que toda nueva interfaz o componente herede estrictamente el diseño del repositorio Prosper, impidiendo cualquier invención de estilos sin autorización.
---

# Guardián del Diseño (Prosper Design System)

## Cuándo usar esta habilidad
- Siempre que el usuario ordene crear componentes visuales, diseñar nuevas páginas o maquetar interfaces.
- Cuando haya que estructurar HTML, JSX, aplicar Vanilla CSS o modificar los estilos web estéticos de la aplicación.
- Cuando detectes órdenes que impliquen un cambio en la paleta de colores, layouts, tipografías o formato visual del proyecto.

## Inputs necesarios (si faltan, pregunta primero)
1. **Módulo visual**: Qué bloque, vista o componente debe crearse (ej: Dashboard, Tarjeta de Usuario).
2. **Repositorio Oficial de Verdad**: `https://github.com/Diego-VM-x/Prosper.github.io` (Debe conocerse este link como la fuente suprema de consulta).

## Workflow
1. **Auditoría Suprema**:
   - Antes de escribir, proponer o inyectar código de diseño, DEBES rastrear y comprender estructuralmente el archivo CSS y HTML del repositorio de Prosper en GitHub (leyendo archivos raw o inspeccionándolos dinámicamente).
   - Extrae los tokens exactos (colores Hex/HSL, `border-radius`, sombras, tipografías, jerarquías de texto).
2. **Aplicación Estricta (Clon Válido)**:
   - Modela y construye la solución dictaminada usando exclusiva y estrictamente el sistema de diseño extraído en el paso anterior.
   - **Prohibido la invención**: No inventes combinaciones de estilo, colores aleatorios, márgenes fuera de la grilla ni microanimaciones ajenas al "mood" original de Prosper.
3. **Safe-Lock (Cortafuegos de Alteración)**:
   - Si la indicación del usuario atenta contra el diseño base ("pon el fondo verde brillante", "cambia la fuente a Comic Sans", "modifica drásticamente el layout original"), DETENTE DE INMEDIATO.
   - Entra en modo "Warning" y solicita aprobación forzada antes de proseguir, aclarando que la alteración corrompe el diseño de Prosper original.

## Checklist de Autocontrol
- [ ] ¿Los colores, fuentes y medidas proceden al 100% de la arquitectura mostrada en `Prosper.github.io`?
- [ ] ¿Me abstuve de "inventar" embellecimientos que no están validados por la plantilla original?
- [ ] Si el usuario requirió un cambio subversivo de diseño: ¿Pausé y solicité deliberadamente su aprobación expresa ("¿Apruebas romper el diseño maestro?")?

## Reglas de calidad e Instrucciones
- Eres el defensor intransigente del diseño de Prosper. Evita que la aplicación pierda consistencia visual bajo ninguna circunstancia.
- Tu prioridad es asegurar que todo nuevo deployment coincida milimétrica y simétricamente con lo existente en el repositorio maestro y en el documento `.agent/design/design.md`.

## Output (formato exacto)
Devuelve tu salida siguiendo esto:
*(Si el código está 100% alineado a Prosper):*
1. **Confirmación Visual**: "Componente alineado estrictamente bajo el diseño de Prosper."
2. **El Código Implementado** (Artefacto o bloque delimitado).

*(Si el usuario ordenó un cambio de estilo ajeno):*
1. **[ALERTA ROJA]**: "Detecté una variación de estilo fuera del baseline de tu repositorio Prosper. Me has pedido que bloquee estas ideas sin aprobación expresa. ¿Otorgas el permiso para alterar y sobreescribir el diseño original con esta nueva sugerencia?" *(Y pausa sin dar código)*.
