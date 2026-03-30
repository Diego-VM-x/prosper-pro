---
name: code-tunnel-manager
description: Gestiona la conexión remota vía VS Code Tunnel para programar desde dispositivos móviles en ProsperPro, aplicando protocolos de ahorro de scroll y confirmaciones visuales.
---

# Code Tunnel Manager (Modo Móvil)

## Cuándo usar este skill
- Cuando el usuario indique que está en "Modo Móvil".
- Cuando se necesite configurar o gestionar la conexión remota mediante VS Code Tunnel.
- Para programar desde dispositivos móviles con ahorro de scroll y confirmaciones táctiles.

## Inputs necesarios
- Estado actual del túnel `prosper-dev`.
- Confirmación de que el usuario está en "Modo Móvil".
- Ruta del proyecto ProsperPro (C:\Users\Norelys\Desktop\Prosper-Pro).

## Workflow

### 1. Configuración del Túnel
- Ejecutar en terminal: `code tunnel --name prosper-dev`.
- Proveer el enlace de autenticación de GitHub al usuario.
- Verificar que el túnel esté activo y conectado.

### 2. Protocolo Modo Móvil Activo
Cuando el usuario indique que está en "Modo Móvil", aplicar:

**Resúmenes Ejecutivos:**
- Usar listas cortas y negritas.
- Evitar párrafos largos.
- Máximo 3-5 puntos por respuesta.

**Fragmentos de Código:**
- Enviar solo la función o línea específica que cambió.
- No enviar archivos completos para ahorrar scroll.
- Incluir contexto mínimo necesario.

**Confirmación Visual:**
- Antes de editar un archivo, preguntar: "¿Procedo con el cambio en [nombre_archivo]?"
- Esperar confirmación explícita antes de cualquier modificación.
- Evitar errores táctiles en pantalla pequeña.

### 3. Mantenimiento
- Actualizar `CONTEXT.md` al final de cada hito o sesión.
- Asegurar que el servidor de desarrollo (`npm run dev`) esté activo en segundo plano.
- Verificar conexión estable del túnel periódicamente.

## Checklist de Conexión
- [ ] ¿El túnel prosper-dev está activo?
- [ ] ¿Se ha actualizado el CONTEXT.md con el progreso de la última sesión?
- [ ] ¿El servidor de desarrollo (npm run dev) está corriendo en segundo plano?
- [ ] ¿El usuario confirmó que está en "Modo Móvil"?

## Manejo de errores
- Si el túnel se desconecta, intentar reiniciar el comando `code tunnel`.
- Si hay conflicto de hidratación o errores de red, reportar de forma ultra-sintética.
- Si falla la confirmación visual, pausar y solicitar aprobación explícita.

## Output (formato exacto)
Al activarse el modo móvil, todas las comunicaciones deben seguir:

### [Code Tunnel Manager - Modo Móvil]
- **Acción**: [Título breve de la acción realizada]
- **Cambios**: 
  1. [Punto clave 1]
  2. [Punto clave 2]
  3. [Punto clave 3]
- **Snippet**: 
  ```typescript
  // Solo el código modificado (2-5 líneas máximo)
  ```
- **Pregunta**: "¿Continuamos con el siguiente paso?"