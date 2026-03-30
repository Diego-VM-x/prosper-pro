---
name: remote-sync
description: Gestiona la conexión remota vía VS Code Tunnel para programar desde dispositivos móviles en ProsperPro, aplicando reglas de síntesis y ahorro de scroll.
---

# Remote Sync (Modo Móvil)

## Cuándo usar este skill
- Cuando el usuario indique que está en "Modo Móvil".
- Cuando se necesite gestionar la conexión remota mediante VS Code Tunnel.

## Inputs necesarios
- Estado del túnel `prosper-dev`.
- Confirmación de "Modo Móvil" activo.

## Workflow

1. **Activación de Túnel**:
   - Ejecutar `code tunnel --name prosper-dev`.
   - Proveer el enlace de autenticación de GitHub al usuario.

2. **Protocolo Modo Móvil**:
   - **Resúmenes Ejecutivos**: Usar listas cortas y negritas. Evitar párrafos largos.
   - **Fragmentos de Código**: Enviar solo la función o bloque específico modificado. No enviar archivos completos.
   - **Confirmación de Paso**: Antes de cualquier edición, solicitar permiso explícito: "¿Procedo con el cambio en [archivo]?".

3. **Mantenimiento**:
   - Actualizar `CONTEXT.md` al final de cada hito o sesión.
   - Asegurar que el servidor de desarrollo (`npm run dev`) esté activo.

## Checklist de Conexión
- [ ] ¿El túnel prosper-dev está activo?
- [ ] ¿Se ha actualizado el CONTEXT.md con el progreso de la última sesión?
- [ ] ¿El servidor de desarrollo (npm run dev) está corriendo en segundo plano?

## Manejo de errores
- Si el túnel se desconecta, intentar reiniciar el comando `code tunnel`.
- Si hay conflicto de hidratación o errores de red, reportar de forma ultra-sintética.

## Output (formato exacto)
Al activarse el modo móvil, todas las comunicaciones deben ser:
- **Título**: Acción realizada.
- **Cambios**: Lista de puntos clave.
- **Snippet**: Solo el código modificado.
- **Pregunta**: "¿Continuamos con el siguiente paso?"
