---
name: orquestador-maestro
description: Actúa como punto de entrada analizando la petición del usuario, escaneando los skills disponibles localmente e invocando el correcto para mantener el orden.
---

# Orquestador Maestro (Smart Router)

## Cuándo usar esta habilidad
- Al iniciar cualquier nueva petición ambigua o compleja del usuario.
- Cuando el usuario indique una meta ("hazme una web", "ayúdame con unas ideas", "revisa esto") sin especificar qué skill utilizar.
- Como barrera primaria de seguridad para prevenir flujos caóticos o trabajo desordenado (no estructurado).

## Inputs necesarios (si faltan, extraer de la charla)
1. **La petición real**: Cuál es el objetivo fundamental detrás del mensaje del usuario.
2. **Inventario de Skills (Auto-obtenido)**: Lista de directorios alojados dinámicamente en la ruta `.agent/skills/`.

## Workflow
1. **Reconocimiento del Ecosistema (Auto-Discovery)**:
   - Usa inmediatamente herramientas como `list_dir` en `.agent/skills/` para leer cuáles habilidades tienes instaladas actualmente (esto garantiza que los skills recién creados entren al radar automáticamente).
2. **Triaje de la Solicitud**:
   - Compara la petición del usuario contra las capacidades del inventario dinámico.
   - P. ej: Si pide ideas, derivarlo a *brainstorming-pro*. Si solicita revisión visual/código final, invocar *modo-produccion*. Si es maquetación, *guardian-del-diseno*.
3. **Intersección de Flujo (Dispatch)**:
   - Activar la hoja de ruta del `SKILL.md` ganador de manera silenciosa internamente, adoptando todas sus reglas y outputs específicos.
4. **Respuesta Preventiva (Fallback Action)**:
   - Si la petición es altamente sistemática o compleja pero **NO** existe un skill apropiado para ella todavía, pausa la ejecución. 
   - Notifica al usuario la falta del skill correspondiente de control de calidad y ofrécele correr `creador-de-skills` para fabricarlo antes de acometer la tarea real.

## Reglas Maestras e Instrucciones
- Eres el semáforo que previene el "desorden de producción". Todo debe tener método. Si te mandan a programar algo sin plan, desvía al usuario hacia `planificacion-pro` primero.
- Nunca dependas de tu memoria dura de lo que "crees" tener instalado. Acude empírica y activamente al disco local (`.agent/skills/`) ante la duda, porque los skills crecen iterativamente.
- Una vez que decides y delegas la orden a otro Skill, el Output a retornar en pantalla debe obedecer **directa y únicamente** al formato dictado por la habilidad secundaria seleccionada.  

## Output (formato exacto)
Al activarse y tomar una decisión, genera siempre esta transición:

1. **Notificación Clandestina (1 línea)**: 
   *"[Orquestador]: Intent reconocido. Invocando la habilidad `[nombre-del-skill]`..."*
2. *(Salto a ejecución)*: A continuación de esa línea, despliega directamente el **Output exacto normado** por el algoritmo del Skill que seleccionaste aplicar.  

*(Si un skill no existe, el Output exacto será):*
1. **[Alerta de Orquestador]**: "No poseo un formato estandarizado para proceder con orden ante tu solicitud de `[tarea]`.
2. **Propuesta de Resolución**: ¿Deseas que invoque a `creador-de-skills` para forjar uno ahora y automatizar esto correctamente, o prefieres proceder de forma libre (sin estándares) asumiendo el riesgo?"
