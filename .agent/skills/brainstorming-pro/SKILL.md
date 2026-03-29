---
name: brainstorming-pro
description: Genera ideas de calidad con estructura, filtros y selección final. Úsalo cuando necesites opciones creativas con criterio y una recomendación clara.
---

# Brainstorming Pro

## Cuándo usar esta habilidad
- Cuando el usuario pida ideas, variantes, conceptos, hooks, nombres, formatos o enfoques.
- Cuando haya bloqueo creativo o demasiadas opciones y haga falta ordenar.
- Cuando el usuario necesite ideas “buenas para ejecutar”, no solo ocurrencias genéricas.

## Inputs necesarios (si faltan, pregunta primero)
1. **Objetivo exacto**: qué se quiere conseguir en términos prácticos.
2. **Público / contexto**: para quién es y dónde/cuándo se usa.
3. **Restricciones**: tiempo, presupuesto, tono, formato, herramientas.
4. **Ejemplos (SÍ/NO)**: referencias de lo que el usuario quiere o rechaza categóricamente.

## Workflow
1. **Validación / Aclaración**: Aclara el encargo con 3–5 preguntas rápidas (solo en caso de que falten datos clave).
2. **Generación Cuádruple (4 Tandas)**:
   - **Tanda A**: 10 ideas rápidas (claras directamente ejecutables).
   - **Tanda B**: 5 ideas “diferentes” (ángulos ciegos o no obvios).
   - **Tanda C**: 5 ideas “low effort” (alto ROI por ser veloces/fáciles de producir).
   - **Tanda D**: 3 ideas “high impact” (muy ambiciosas, rompedoras y memorables).
3. **Rigor Analítico**: Filtra y puntúa internamente cada idea (del 1 al 5) según las variables de: Impacto, Claridad, Novedad, Esfuerzo, Viabilidad.
4. **Cosecha Final**: Selecciona matemáticamente las mejores y extrae un TOP 5 final, proveyendo un detalle justificado.

## Instrucciones y Reglas de Calidad
- **Anti-vaguedad**: Cero ideas genéricas (ej: "hacer un blog sobre hábitos"). Concreta *siempre* el gancho específico.
- **Copywriting**: Si el input involucra hooks o títulos, redactar usando extrema concisión, tensión psicológica o curiosidad abierta.
- **Prueba Biológica**: Si piden formatos (video, landing, mail), incluye la macro-estructura + un ejemplo real de los primeros 15 segundos o el primer pantallazo ("above the fold").
- **Coste de Incertidumbre**: Si una idea depende de la suerte (viralidad algorítmica incontrolable, respuesta de un tercero), avisa del riesgo e incluye una ruta alternativa.

## Checklist de Autocontrol
- [ ] ¿Los 4 inputs están cubiertos garantizando pertinencia?
- [ ] ¿Se dividió la lluvia de ideas en los 4 formatos estrictos (A, B, C, y D)?
- [ ] ¿La purga de calidad consideró Novedad vs Viabilidad?
- [ ] ¿El TOP 5 entrega justificaciones de máximo 2 líneas y un primer paso táctico de 1 línea?

## Manejo de Errores
- Si detectas que las ideas del TOP 5 se sienten "aburridas", relaja la variable *Viabilidad* a favor de de la variable *Novedad* y vuelve a generar la tanda B y D antes de mostrarle al usuario la salida final.
- Si las restricciones se anulan entre sí (p.ej "Presupuesto cero" pero "High impact con celebridades"), notifícalo inmediatamente al usuario y detén la iteración masiva.

## Output (formato exacto)
Devuelve el resultado estrictamente con esta morfología:

### 1. Preguntas Rápidas
*(Únicamente incluidas si faltan datos en los inputs principales. Máximo 3 a 5 preguntas.)*
...

### 2. Máquina de Ideas (23 en total)

**Tanda A: 10 Ideas Rápidas y Ejecutables**
1. ...
*(hasta 10)*

**Tanda B: 5 Ideas "Diferentes" (Ángulos no obvios)**
1. ...
*(hasta 5)*

**Tanda C: 5 Ideas "Low Effort" (Rápidas de producir)**
1. ...
*(hasta 5)*

**Tanda D: 3 Ideas "High Impact" (Ambiciosas)**
1. ...
*(hasta 3)*

### 3. TOP 5 Recomendado (Elite)

**#1. [Nombre sugerente de la idea]**
- **Score:** [X/25] (Impacto X, Claridad X, Novedad X, Esfuerzo X, Viabilidad X)
- **Por qué funciona:** [Explicación en dos líneas de su psicología o palanca de ROI].
- **Primer paso:** [El paso accionable concreto en una línea].

*(Repetir de la 2 a la 5 con el mismo formato)*
