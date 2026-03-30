---
name: firebase-connector
description: Automatiza y gestiona las conexiones entre el proyecto Prosper-Pro y Firebase utilizando las herramientas de Firebase MCP.
---

# Firebase Connector (Prosper-Pro)

Este skill es específico para el proyecto **Prosper-Pro** y facilita la integración fluida con los servicios de Firebase (Auth, Firestore, Hosting, etc.) mediante el servidor MCP.

## Cuándo usar este skill
- Al inicializar el proyecto con Firebase por primera vez.
- Cuando se necesite registrar una nueva APP (Web, iOS, Android) en el proyecto.
- Para configurar o descargar archivos secretos como `google-services.json` o `firebaseConfig`.
- Para desplegar reglas de seguridad o configuraciones de hosting.

## Inputs necesarios
- **ID del Proyecto Firebase**: El ID único del proyecto en la consola de Google.
- **Plataforma**: (web, android, ios) para la que se requiere la configuración.

## Workflow
1. **Validación de Entorno**: Ejecutar `firebase_get_environment` para confirmar que el usuario está logueado y el proyecto activo coincide.
2. **Sincronización de Apps**: Listar las apps registradas con `firebase_list_apps`. Si no existe la requerida, usar `firebase_create_app`.
3. **Extracción de Configuración**: Obtener el SDK Config usando `firebase_get_sdk_config`.
4. **Inyectar en el Proyecto**: 
   - Generar un archivo `.env.local` con las variables de Firebase.
   - O actualizar el archivo `src/lib/firebase.ts` (si existe la carpeta `src`).
5. **Verificación de Reglas**: Consultar reglas actuales con `firebase_get_security_rules` para asegurar que el entorno de desarrollo es seguro.

## Instrucciones
- Siempre prioriza el uso de herramientas MCP directas sobre comandos de terminal manuales cuando sea posible.
- Mantén la confidencialidad de las claves de API en los registros de consola.
- Si detectas que falta el login, invoca `firebase_login`.

## Checklist de ejecución
- [ ] Confirma que el `project_id` es el correcto en `firebase_get_environment`.
- [ ] Verifica que la APP esté creada en la plataforma solicitada.
- [ ] Asegura que el archivo de configuración se ha guardado en el lugar correcto.

## Manejo de errores 
- **Error de Autenticación**: Solicitar al usuario que ejecute `firebase_login` o proporcionar el `authCode` si ya lo tiene.
- **App Duplicada**: Si la APP ya existe, saltar el paso de creación y proceder directamente a extraer la configuración.

## Output (formato exacto)
Al finalizar, responde con:
### [ Conexión Firebase Prosper-Pro ] ✅
- **Proyecto**: `[project_id]`
- **App Configurada**: `[app_name]` (`[platform]`)
- **Archivos generados**: `[lista de archivos]`
