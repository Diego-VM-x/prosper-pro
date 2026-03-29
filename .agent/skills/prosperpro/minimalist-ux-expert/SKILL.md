---
name: minimalist-ux-expert
description: Fuerza la reducción visual promoviendo un diseño con mucho "aire" (white space) y una jerarquía hiperclara orientada a reducir la carga cognitiva al mínimo.
---

# Minimalist UX Expert

## Cuándo usar esta habilidad
- Al estructurar componentes interactivos (tarjetas, modales, formularios).
- Cuando un diseño funcional empiece a verse abultado, complejo de leer, o sus flujos cognitivos mareen al usuario final.

## Inputs necesarios (si faltan, extraer del código base)
1. **Viewport / Fragmento Analizado**: (Qué interfaz se está filtrando).
2. **Meta Interfaz**: Cuál es el _CTA (Call To Action)_ único definitivo de la página completa.

## Workflow y Reglas
1. **Ley del Vacío Intencionado**: Escanea cada pixel. Evalúa los respiros y espacios negativos.
   - **REGLA MANDATORIA**: Si al mapear el layout la pantalla se siente remotamente saturada, tienes un abanico binario de actuación: **(a) Elimina un elemento satélite no crítico o (b) Aumenta el padding sustancialmente**.
2. **Estructura Cúbica Constante**: Mapea los CSS / Tailwind y re-escribe todas las interfaces hacia las tolerancias requeridas:
   - Contenedores modulares/Tarjetas (*Cards*): Forzar un radio rígido de **`18px`**.
   - Objetivos Táctiles Primarios (*Botones*): Forzar curvatura de acción rápida de **`12px`**.
3. **Escudo de Paleta Neón**: Auditar el contraste validando los tonos maestros: 
   - Fondo o *Dark Shell*: Negro Profundo **`#0B0B0B`**.
   - Resonador UI o KPI interactivo: Cyan Vibrante **`#00E5FF`**.
   - Los demás elementos deben ceder neutralidad sin estorbar cromáticamente a esa dupla.

## Checklist de Calidad Auditiva (Orden Fijo)
Validación final tras la aplicación de la métrica minimalista:

- [ ] Velocidad Cognitiva: ¿El usuario es capaz de intuir o entender la acción principal exacta en menos de 3 Segundos?
- [ ] Matemática del Ángulo: ¿Se respetan religiosamente las esquinas a `18px` (cards) y `12px` (botones)?
- [ ] Castigo del Color: ¿Se está respetando la balanza de contraste absoluto `#0B0B0B` contra el acento activo `#00E5FF`?

## Output Estandarizado (formato exacto)
Reporta siempre la ejecución visual usando el dictamen a continuación:

### 1. Diagnóstico de Aire (Espacio Negativo)
*(Elementos removidos o expandidos)* 
1. `Removí [Elemento X]` porque competía por atención táctil inútilmente.
2. `Aumenté Padding en [Zona Y]` para guiar el Ojo al centro.

### 2. Rigurosidad Geométrica (Fix Aplicado)
- [x] **Radius Check**: Card (18px) - Botón (12px).
- [x] **Paleta Neón Check**: Fondo (#0B0B0B) - Acento (#00E5FF).

### 3. Veredicto UX
**ESCALA DE LECTURA (3 Segundos):** [ PASÓ LA PRUEBA TÁCTIL / COMPLEJIDAD FALLIDA ]
