---
name: planificacion-pro
description: Convierte una idea en un plan ejecutable por fases, con checklist, riesgos y entregables. Úsalo cuando haya que pasar de idea a acción sin improvisar.
---

# Planificación Pro

## Cuándo usar esta habilidad
- Cuando el usuario pida un plan paso a paso, una estrategia o una hoja de ruta.
- Cuando haya que entregar algo (landing, vídeo, proyecto, lanzamiento) con tiempos.
- Cuando el usuario tenga muchas tareas sueltas y quiera ordenarlas.

## Inputs necesarios (si faltan, pregunta primero)
1. **Resultado final**: qué significa “terminado”.
2. **Fecha límite o ritmo**: hoy, esta semana, sin prisa.
3. **Recursos disponibles**: herramientas, equipo, presupuesto, tiempo diario.
4. **Criterios de éxito**: qué debe cumplir para estar bien.

## Workflow
1. **Definición de Meta:** Define el resultado final en 1 frase y lista 3 criterios de éxito.
2. **División del Trabajo:** Divide el trabajo en fases (máximo 4):
   - Fase 1: Preparación
   - Fase 2: Producción / Ejecución
   - Fase 3: Revisión / QA
   - Fase 4: Publicación / Entrega
3. **Desglose por Fase:** Dentro de cada fase crea:
   - Tareas en orden lógico.
   - Entregable claro (qué sale de esa fase).
   - Tiempo estimado por tarea (aproximado).
4. **Matriz de Riesgos:** Añade “Riesgos y mitigación” (3–5). Ejemplo: "Si pasa X → hago Y".
5. **Cierre:** Cierra con una checklist final de validación.

## Reglas de calidad e Instrucciones
- Evita planes infinitos: prioriza exclusivamente lo que desbloquea lo siguiente.
- Si hay dependencias entre tareas, indícalas explícitamente (“esto depende de X”).
- Ajuste de nivel: Si el usuario es principiante, reduce pasos y da opciones simples. Si el usuario es avanzado, incluye optimizaciones y atajos.

## Checklist de ejecución y validación
- [ ] ¿El resultado final está en una sola frase y los 3 criterios de éxito son medibles?
- [ ] ¿El plan tiene máximo 4 fases orientadas a la entrega?
- [ ] ¿Se estimaron los tiempos realistas por tarea y se definió el entregable por fase?
- [ ] ¿Existen mitigaciones definidas para 3 a 5 riesgos potenciales?

## Manejo de errores
- Si falta alguno de los 4 inputs necesarios al inicio, pausa y recupéralos con el usuario antes de ensamblar el plan.
- Si el plan estructurado requiere más recursos/tiempo de los detectados en los inputs, solicita confirmación para reducir el alcance (MVP) o iterar la estructura.

## Output (formato exacto)
Devuelve siempre con este formato:

### Resultado Final
*(Una frase que defina el objetivo)*
**Criterios de éxito:**
1. ...
2. ...
3. ...

### Plan por Fases
**Fase 1: Preparación**
- Entregable: ...
- [Tarea 1] (*T *): ...
- [Tarea 2] (*T *): ...

*(Repetir para Producción, Revisión y Publicación)*

### Riesgos y Mitigación
1. **Riesgo:** [X] → **Mitigación:** [Hago Y]

### Checklist Final
- [ ] Validación 1
- [ ] Validación 2
