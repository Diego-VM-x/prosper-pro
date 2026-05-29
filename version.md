# Historial de Versiones: Prosper-Pro

## [0.8.6 BETA] - 2026-05-29
### Añadido
- **Planes compartidos colaborativos**: Los planes invitados ahora aparecen automáticamente en tu lista de Metas. Badge "Compartido" e "Invitado" para identificar el rol.
- **Contribuciones por usuario**: Cada vez que alguien añade fondos a un plan compartido, queda registrado quién aportó y se muestra en la tarjeta.
- **Barra Guardar Cambios global**: Botón sticky al fondo de Configuración, visible desde cualquier pestaña, que guarda todas las preferencias de una vez (nombre, moneda, privacidad, alertas, etc.).
- **Exclusión automática**: Ya no puedes enviarte una solicitud a ti mismo al compartir planes.

### Corregido
- **Privacidad de perfil persistente**: El toggle público/privado ahora se guarda correctamente al hacer clic en "Guardar Cambios". Ya no se reinicia al recargar la página.
- **Al rechazar solicitud**: El usuario invitado se elimina del plan compartido, evitando accesos no deseados.

## [0.8.5 BETA] - 2026-05-29
### Añadido
- **Privacidad de perfil**: Nueva opción en Configuración > Preferencias para elegir si tu perfil es público o privado. Si es privado, solo te pueden encontrar por email exacto al compartir planes.
- **Búsqueda por nombre**: Al compartir un plan financiero ahora puedes escribir el nombre de la persona en lugar de solo el email. Si tiene perfil público, aparecerá en una lista de resultados.
- **Etiquetas "En Desarrollo"**: Agregamos badges verdes en las secciones de Idiomas, Sesiones Activas y contacto por Email para indicar que están en desarrollo.

### Corregido
- **Menú móvil**: El menú hamburguesa ahora ocupa toda la pantalla y se desliza suavemente desde la izquierda sin cortes ni animaciones entrecortadas.
- **Menú de usuario en móvil**: Al tocar tu avatar en la barra superior ahora se abre una ventana desde abajo tipo bottom-sheet con bordes redondeados, ocupando todo el ancho.
- **Nombre visible en móvil**: Tu nombre ahora aparece junto al avatar en la barra superior cuando navegas desde el teléfono.
- **Animaciones**: Se unificaron todas las animaciones de entrada (fadeInUp) para que menús, ventanas y elementos aparezcan con transiciones suaves y consistentes en toda la app.
- **Ventana de novedades**: Esta ventana ahora se ve bien en cualquier tamaño de pantalla, especialmente en móviles donde se ancla al fondo.
- **Error de CSS**: Se corrigió un conflicto en el código que impedía que los menús desplegables funcionaran correctamente en la versión móvil.

## [0.8.2] - 2026-05-28
### Añadido
- Historial de versiones inicializado.

### Cambiado
- Correcciones de responsividad en los menús desplegables del Topbar (`.user-dropdown` y `.notifications-dropdown`) para dispositivos móviles.
- Mejoras de responsividad en el modal principal de `Dashboard.tsx` (`max-height`, `align-items`).
