# Plan de mejora incremental de calidad técnica

## Objetivo
Evolucionar el sistema de forma segura y gradual hacia una arquitectura más modular, robusta, mantenible y escalable, sin introducir cambios de alto riesgo en un solo ciclo.

## Principios de ejecución
- **Incrementalidad:** cambios pequeños, reversibles y fáciles de revisar.
- **Seguridad operativa:** cada paso con validaciones automatizadas mínimas.
- **Bajo acoplamiento:** mover reglas de negocio y efectos secundarios fuera de componentes grandes.
- **Estandarización:** utilidades compartidas para evitar duplicación.
- **Observabilidad:** errores con mensajes claros y puntos únicos de manejo.

## Línea base validada
- `src/App.tsx` sigue concentrando coordinación de editor, efectos de documento, IA y modales.
- `src/components/cartola/CartolaApp.tsx` sigue acumulando estado, reglas de dominio, import/export y UI.
- `src/contexts/DriveContext.tsx` y `src/utils/geminiClient.ts` concentran integraciones externas y manejo de errores.
- La cobertura histórica reportada en `coverage/index.html` es baja para una base de refactor seguro:
  - Statements: `31.03%`
  - Branches: `22.29%`
  - Functions: `25.51%`
  - Lines: `31.78%`
- Existen accesos directos a `localStorage`, `window.gapi`, `window.google`, `fetch` y listeners globales repartidos en varios módulos.

## Roadmap por fases

### Iteración 0 — Baseline operable
1. Añadir `typecheck`, `typecheck:test` y `test:ci` a `package.json`.
2. Fijar versión de Node mediante `.nvmrc` y `engines`.
3. Crear workflow CI para `lint`, `typecheck`, `typecheck:test`, `test:ci`, `build` y `check:bundle`.
4. Mantener esta guía sincronizada con el estado real del repositorio.

**Criterio de salida:** un desarrollador nuevo puede instalar y validar el proyecto con una secuencia explícita y repetible.

### Iteración 1 — Red de seguridad del core
1. Añadir tests para `useFileOperations`, `useDriveStorage`, `useDriveModals`, `useAppSettings` y flujos clave de `RecordContext`.
2. Crear helpers comunes para storage, browser APIs y providers.
3. Mover lógica pura embebida en `App.tsx` y `CartolaApp.tsx` a utilidades testeables.

**Criterio de salida:** los flujos de guardar, importar, restaurar historial y persistir settings tienen cobertura automatizada.

### Iteración 2 — Descomposición de `App.tsx`
1. Extraer hooks/controladores para:
   - estado UI/editor,
   - efectos de documento,
   - resolución IA,
   - composición de modales.
2. Dejar `App.tsx` como ensamblador de providers, rutas, vistas y hooks.
3. Aislar listeners globales y cleanup en hooks dedicados.

**Criterio de salida:** `App.tsx` deja de ser el centro de negocio y pasa a coordinar módulos más pequeños.

### Iteración 3 — Hardening de fronteras externas
1. Introducir `StorageAdapter` para encapsular persistencia local.
2. Introducir `DriveGateway` tipado para aislar llamadas a Google Drive.
3. Dividir `geminiClient.ts` en módulos de catálogo, routing, retries y generación sin romper la API pública.
4. Centralizar mapeo de errores y remover `any` evitables en la app.

**Criterio de salida:** las fronteras de storage, Drive y Gemini quedan desacopladas del árbol principal de UI.

### Iteración 4 — Modularización de Cartola
1. Extraer estado y casos de uso a `useCartolaState`.
2. Mover normalización, ordenamiento y export/import a utilidades puras.
3. Reducir `CartolaApp.tsx` a composición de formularios y preview.

**Criterio de salida:** el dominio de cartola puede evolucionar sin tocar un componente monolítico.

### Iteración 5 — Escalabilidad y budgets
1. Consolidar lazy loading y `manualChunks` donde realmente ayuden.
2. Automatizar budget de bundle en CI.
3. Añadir reglas de prevención de regresión sobre cobertura mínima de áreas críticas y tamaño de módulos.

**Criterio de salida:** cada PR futuro queda sujeto a límites automáticos de calidad.

## Convenciones de implementación
- 1 objetivo técnico principal por PR.
- Siempre acompañar refactors con tests del área tocada.
- Evitar cambios funcionales no relacionados dentro del mismo PR.
- Recalcular nota 1-7 al cierre de cada iteración usando la misma rúbrica técnica.

## Métricas a seguir
- Estado de `lint`, `typecheck`, `typecheck:test`, `test:ci`, `build`.
- Cobertura global y por hotspots.
- LOC de `App.tsx`, `CartolaApp.tsx`, `DriveContext.tsx`, `geminiClient.ts`.
- Presupuesto del bundle principal.
