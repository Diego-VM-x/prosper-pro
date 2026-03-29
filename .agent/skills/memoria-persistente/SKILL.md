---
name: memoria-persistente
description: Escanea agresivamente la bitácora de diseño, el README y el historial reciente de Git para recuperar el contexto exacto del proyecto y arrancar el día de trabajo idéntico a como se pausó antes.
---

# Memoria Persistente (Continuity Protocol)

## Cuándo usar esta habilidad
- Al iniciar una sesión de desarrollo nueva después de horas o días de inactividad (el "buenos días").
- Cuando el usuario vuelva y ordene continuar con un proyecto sin especificar por dónde íbamos.
- Si parece que el Agente "olvidó" en qué rama o fase de arquitectura se encontraba el ecosistema.

## Inputs necesarios (Auto-extraíbles)
1. **Historial de Cambios**: El `README.md` del directorio raíz.
2. **Historial Arquitectónico**: El `design/design.md`.
3. **Estado de Habilidades**: Un mapeo temporal usando `list_dir` sobre `.agent/skills/`.
4. **Estado de Git**: El último registro del log en consola (`git log -n 3 --oneline`).

## Workflow (Arranque en Frío)
1. **Paso Cero (Silencioso)**: Al recibir el comando del usuario para reactivar el trabajo, el agente **no asume nada**. Usa herramientas como `view_file` para devorar el `README.md` y la bitácora de diseño en `design/design.md`. 
2. **Reconocimiento de Arsenal**: Ejecuta de inmediato un escaneo del directorio `.agent/skills/` o subdirectorios para recargar mentalmente todos los protocolos que deba obedecer durante el día.
3. **Validación de Integridad**: Ejecuta `git status` y revisa cuáles fueron los últimos archivos en los que se tocó código para comprender la intención dejada a medias («Estábamos refactorizando un componente...», «Estábamos haciendo una Landing»).
4. **Respuesta Táctica**: Retorna un reporte compacto al usuario poniéndolo al día, demostrando conocimiento del proyecto sin fisuras.

## Checklist de Calidad Auditiva (Orden Fijo)
- [ ] ¿Leíste físicamente el `README.md` y `design.md` antes de responder para entender el Framework (Vanilla CSS, Next.js, etc.)?
- [ ] ¿Verificaste tu inventario de Skills (`nextjs-architecture-guard`, `modo-produccion`, etc.) para saber qué leyes aplican al usuario?
- [ ] ¿Aislaste en una frase concreta cuál fue el último *hito* que tú y el usuario codificaron juntos?

## Output (formato exacto)
Tu primera interacción de bienvenida del día debe seguir ciegamente este esquema inmersivo:

### [ Inicialización de Continuidad Completada ] 🧠

**1. Estado del Proyecto (Contexto Restaurado)**
- Estamos usando `[Tecnología detectada]`.
- El último hito registrado fue: `[Historial del README / Git]`.

**2. Reglas Maestras Cargadas**
- Detecto "N" skills activos listas para usarse, incluyendo `[Mencionar un par de skills relevantes]`.

**3. Propuesta de Arranque**
- *"Dado nuestro historial, nos quedamos en [X]. ¿Procedemos con eso o iniciamos un requerimiento nuevo?"*
