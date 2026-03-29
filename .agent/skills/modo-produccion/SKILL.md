---
name: modo-produccion
description: Revisa una app/landing, detecta problemas típicos, propone mejoras y aplica correcciones con un checklist fijo para dejarlo listo para enseñar o publicar.
---

# Modo Producción (QA + Fix)

## Cuándo usar esta habilidad
- Cuando ya tienes algo generado (landing/app) y quieres dejarlo “presentable”.
- Cuando algo funciona “a medias” (comportamiento en móvil raro, imágenes rotas, botones inactivos, espaciados desequilibrados).
- Justo antes de presentarlo a un cliente, grabar una demostración o desplegarlo en producción real (publicarlo).

## Inputs necesarios (si faltan, pregunta primero)
1. **Archivo principal**: Qué archivo es el epicentro o punto de entrada a auditar (por ejemplo `index.html`, `page.tsx` o la ruta raíz del proyecto).
2. **Objetivo de la revisión**: Definir estrictamente si la calidad meta es "lista para enseñar" (MVP funcional) o "lista para publicar" (calidad exigente de servidor).
3. **Restricciones inmutables**: Ej: no cambiar el branding, no modificar el copy principal, no alterar la estructura del enrutamiento.

## Workflow Analítico
1. **Diagnóstico Rápido**: Escanea el proyecto o recurso indicado para perfilar una lista de problemas (máximo 5–10 bullets), priorizados de mayor a menor gravedad.
2. **Plan Quirúrgico de Arreglos**: Describe "qué voy a cambiar y por qué", acotando el listado a un máximo de 8 cambios de alta rentabilidad y bajo esfuerzo excesivo.
3. **Ejecución Automática**: Aplica las correcciones en el código (modifica los archivos necesarios directamente).
4. **Validación Post-Fix**: Verifica internamente que el checklist (ver la sección de abajo) se cumple a cabalidad en el nuevo estado temporal de la preview.
5. **Cosecha de Resultados**: Devuelve el resumen final estandarizado con el dictamen y notas futuras.

## Checklist de Calidad (Orden Fijo)
*Nota imperativa: Sigue estas etapas ordenadas para la auditoría.*

### A) Funciona y se ve
- [ ] ¿El proyecto arranca sin disparar errores críticos o pantallas en blanco?
- [ ] ¿Los assets (imágenes, SVGs) cargan a la perfección sin enlaces de ruta rotos?
- [ ] ¿Las tipografías y las hojas de estilos (CSS puro/Tailwind) rinden el layout sin colapsar?

### B) Responsive (Mobile-First approach)
- [ ] ¿Se ve armónico en viewports de móvil? (Cero scroll horizontal por desbordamiento de padding).
- [ ] ¿Los Action Targets (botones y enlaces) cuentan con el tamaño táctil idóneo y el texto es legible sin zoom?
- [ ] ¿Existe un espaciado (`gap`/`margins`) vertical coherente entre las secciones de contenido?

### C) Copy y UX Básica
- [ ] ¿Existe una jerarquía marcada en el Titular u H1 y representa limpiamente la propuesta de valor?
- [ ] ¿Los CTAs ostentan consistencia verbo-acción (p. ej. los botones principales impulsan efectivamente a la misma intencionalidad principal)?
- [ ] ¿Se ha erradicado todo texto en fase borrador (clásicos *Lorem Ipsum*)?

### D) Accesibilidad Mínima
- [ ] ¿Las fuentes primarias contra el fondo contrastan equitativamente (textos leíbles oscuros sobre fondo tenue/textos blancos sobre contraste denso)?
- [ ] ¿Los gráficos con rol semántico relevante figuran con atributos de imagen alternativos (`alt`)?
- [ ] ¿Su columna vertebral semántica sigue un esquema correlativo de HTML (`H1`, `H2`...)?

## Reglas Maestras
- **Blindaje Estilístico**: No cambies bajo ningún contexto el estilo visual de la marca si existe otro Skill de "Marca" o un repositorio pre-establecido (Ej. `guardian-del-diseno`) operando como baseline.
- **Factor de Aceleración**: No intentes refactorizar el código global para "perfecto". Corrige únicamente lo mínimo para apalancar calidad exprés (Principio de Pareto).
- **Usabilidad Pura**: Si ocurre un conflicto arquitectónico entre dejarlo "más atractivo" (bonito) o "más intuitivo" (claro), inclina invariablemente tu dictamen por la **Claridad**.

## Output (formato exacto)
Devuelve tu repuesta con extrema disciplina bajo esta plantilla literal:

### 1. Diagnóstico Rápido
*(Priorizados por severidad)*
1. ...
2. ...
*(Hasta 5/10 ítems)*

### 2. Cambios Aplicados (El parche)
- **[Fix A]**: ...
- **[Fix B]**: ...
*(Lista corta, máxima de 8 resoluciones inyectadas en los archivos)*

### 3. Resultado Final y Dictamen
**ESTADO DE PRODUCCIÓN:** [ OK para enseñar / OK para publicar / DENEGADO (requiere rescate masivo) ]

**Notas adicionales:**
- ... *(Solo si restan mejoras como deuda técnica opcional)*.
