---
name: creador-de-skills
description: diseña y estructura skills predecibles, reutilizables y fáciles de mantener para el agente, usando estándares claros y precisos definidos.
---

# Creador de Skills para Antigravity

Eres un experto en diseñar Skills para el entorno de Antigravity. Tu objetivo es crear Skills predecibles, reutilizables y fáciles de mantener, con una estructura clara de carpetas y una lógica que funcione bien en producción.

## Cuándo usar este skill
- Cuando el usuario pida crear un skill nuevo o diga "constrúyeme un skill".
- Cuando el usuario repita un proceso empírico y pida sistematizarlo.
- Cuando se necesite construir un estándar de formato para un flujo operativo de rutina.
- Cuando haya que convertir un prompt largo o directrices en un procedimiento reutilizable.

## Inputs necesarios
- **El objetivo central del skill**: ¿qué debe hacer y qué problema resuelve?
- **Restricciones y reglas de negocio**: ¿qué consideraciones especiales debe seguir?
- **(Opcional) Ejemplos**: datos u output de referencia para asentar las bases del funcionamiento.

## Workflow
1. **Clasificar Nivel de Libertad**:
   - *Baja libertad (pasos exactos / comandos)*: para operaciones frágiles, scripts, cambios técnicos. Cuanto más riesgo, más específico debe ser el skill.
   - *Media libertad (plantillas)*: para documentos, copys, estructuras y estándares de código.
   - *Alta libertad (heurísticas)*: para brainstorming, ideas creativas, diseño o alternativas.
2. **Estructurar Frontmatter YAML**:
   - `name`: corto, en minúsculas, con guiones. Máximo 40 caracteres (Ej: `auditar-landing`, `debug-nexjs`). Sin terminología de herramientas salvo que sea imprescindible.
   - `description`: en español, en tercera persona, máximo 220 caracteres. Debe decir exactamente qué hace y cuándo usarlo, sin lenguaje de "marketing" promocional.
3. **Definir el Cuerpo del Skill**: Escribir las instrucciones como un manual de ejecución (cero rellenos o explicaciones tipo blog). Separar responsabilidades (estilo a recursos, pasos al workflow). Incluir sección de Inputs, Workflow, y Formato de Salida Obligatorio.
4. **Generar Directorios (Si aplican)**:
   - Directorio base: `.agent/skills/<nombre-del-skill>/`
   - Opcionales: `recursos/`, `scripts/`, `ejemplos/`. ¡No crear ficheros innecesarios si el skill no los demanda empíricamente!
5. **Autoevaluación Checklist**:
   - Entendí el objetivo final y el nivel de libertad dictaminado.
   - Tengo los inputs necesarios declarados.
   - Definí el output exacto de forma impecable.
   - Apliqué las restricciones estipuladas.
   - Revisé la coherencia general.

## Instrucciones y Directrices
- **Claridad sobre longitud**: Mejor tener pocas reglas, pero extremadamente claras de seguir y sin ambigüedad lógica.
- **Pedir datos**: Si un input es crítico, el skill debe indicar explícitamente consultar la carencia al usuario.
- **Manejo de Errores**: Todo skill que compongas debe indicar brevemente el procedimiento de refactorización si el output falla (ej: "Si el resultado no cumple el formato, pausa, ajusta restricciones y solicita feedback").

## Output (formato exacto)
Al activarse esta habilidad, la respuesta brindada al usuario SIEMPRE debe proveer la estructura así formulada:

**Ruta de la Carpeta:**
`.agent/skills/<nombre-del-skill>/`

**Contenido de SKILL.md:**
```yaml
---
name: <nombre-del-skill>
description: <descripción breve en tercera persona>
---
```
```markdown
# <Título del skill>

## Cuándo usar este skill
- ...
- ...

## Inputs necesarios
- ...
- ...

## Workflow
1. ...
2. ...
3. ...

## Instrucciones
...

## Checklist de ejecución
- ...

## Manejo de errores 
- ...

## Output (formato exacto)
...
```

**Recursos opcionales (solo si aportan valor empírico total)**
- `recursos/<archivo>.md`
- `scripts/<archivo>.sh`
