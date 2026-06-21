# Historial de Versiones — Prosper Pro

## v1.0.4 (21/06/2026)
- APK Android v1.0.4 generado (`versionCode 3`, ~11 MB debug).
- Modal de novedades actualizado con notas de v1.0.4 en español e inglés.
- Modal de actualización forzada en Android nativo: botón "Descargar actualización" vía `@capacitor/browser`.
- Fix autenticación en Android: `skipNativeAuth: true` + sincronización con `signInWithCredential` para Google; email/password vía SDK JS.
- Script `scripts/send-global-notification.js` para notificación global de nuevas versiones vía Firebase Admin SDK (11 usuarios notificados).
- Build móvil robusto: limpieza de caché `.next` antes de compilar.
- Build web verificado: 21/21 páginas estáticas.

## v1.0.3 (20/06/2026)
- Widget de historial en dashboard (`recent_transactions`).
- Historial de transacciones rediseñado con edición y eliminación.
- Exclusión de `android/` en `tsconfig.json` para evitar errores de assets residuales.

## v1.0.2 (13/06/2026)
- Widget Conversor de Monedas.
- Fix centrado de modal de nueva transacción.
- Abono a planes desde nueva transacción.
- Dashboard personalizable automático por dispositivo.

## v1.0.1 (11/06/2026)
- Estabilidad de autenticación.
- Eliminación de sistema de administración de dispositivos.
- Reset automático de planes recurrentes.

## v1.0.0
- Lanzamiento inicial.
