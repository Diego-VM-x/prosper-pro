# Contexto del Proyecto: Prosper-Pro

## Estado Actual (30 de Marzo, 2026)
- **Objetivo**: Dashboard de Libertad Financiera y Educación Gamificada.
- **Tecnología**: Next.js 16 (App Router), Vanilla CSS, React 19, TypeScript.
- **Identidad**: Basada en "Prosper." (Azul Navy #1E3A6E y Verde Esmeralda #3DCC8E).

## Hitos Completados
- ✅ **Simplificación Web**: Eliminación de Capacitor/App nativa, aplanamiento de rutas.
- ✅ **Design Tokens**: Configuración de `globals.css` con soporte para Modo Oscuro/Claro.
- ✅ **Dashboard Core**: Sidebar, Topbar, Widgets de Metas, Analíticas, Comunidad y Gamificación.
- ✅ **Identidad Corporativa**: Integración de logos PNG reales y colores exactos de marca.
- ✅ **Skill Remote Sync**: Preparación para desarrollo móvil vía VS Code Tunnel.
- ✅ **Túnel VS Code Activado**: Túnel `prosper-dev` iniciado para desarrollo remoto desde móvil.

## Pendientes Próximos
- ✅ **Mis Metas**: Implementación de la sección con filtrado y tarjetas de progreso.
- [ ] Desarrollar módulo de "Cursos" de Academia Prosper.
- [ ] Conectar con Firebase para persistencia real.

## Notas Técnicas
- El modo oscuro se activa mediante `data-theme="dark"` en el tag `<html>`.
- Usar variables CSS (`var(--token)`) para todos los estilos.
- El servidor de desarrollo corre en puerto 3000.
