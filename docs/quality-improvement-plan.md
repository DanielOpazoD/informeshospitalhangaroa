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
- `src/App.tsx` ya delega parte de la política de título y el flujo HHR a hooks dedicados, aunque sigue siendo el ensamblador principal.
- `src/components/cartola/CartolaApp.tsx` sigue acumulando estado, reglas de dominio, import/export y UI.
- `src/contexts/DriveContext.tsx` sigue concentrando el estado de navegación y búsqueda remota, pero ahora expone modos de búsqueda y resultados parciales.
- La cobertura actual reportada en `coverage/index.html` alcanza una base razonable para refactor seguro:
  - Statements: `64.92%`
  - Branches: `56.69%`
  - Functions: `64.41%`
  - Lines: `66.74%`
- La app ya no confía ciegamente en HTML importado y dejó de persistir API keys sensibles en `localStorage`; aún quedan integraciones browser-globales (`window.gapi`, `window.google`, `fetch`) en transición hacia fronteras más testeables.

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
   - política de título,
   - flujo HHR,
   - composición de modales.
2. Dejar `App.tsx` como ensamblador de providers, rutas, vistas y hooks.
3. Aislar listeners globales y cleanup en hooks dedicados.

**Criterio de salida:** `App.tsx` deja de ser el centro de negocio y pasa a coordinar módulos más pequeños.

### Iteración 3 — Hardening de fronteras externas
1. Mantener `StorageAdapter` y separar persistencia estable vs sesión para credenciales sensibles.
2. Mantener `DriveGateway` tipado y endurecer el parser de registros importados.
3. Dividir `geminiClient.ts` en módulos de catálogo, routing, retries y generación sin romper la API pública.
4. Centralizar mapeo de errores y remover accesos directos evitables a APIs globales en la app.

**Criterio de salida:** las fronteras de storage, Drive y Gemini quedan desacopladas del árbol principal de UI.

### Iteración 4 — Modularización de Cartola
1. Extraer estado y casos de uso a `useCartolaState`.
2. Mover normalización, ordenamiento y export/import a utilidades puras.
3. Reducir `CartolaApp.tsx` a composición de formularios y preview.

**Criterio de salida:** el dominio de cartola puede evolucionar sin tocar un componente monolítico.

### Iteración 5 — Escalabilidad y budgets
1. Consolidar lazy loading y `manualChunks` donde realmente ayuden.
2. Automatizar budget de bundle en CI.
3. Añadir reglas de prevención de regresión sobre cobertura mínima de áreas críticas, tamaño de módulos y búsquedas profundas con presupuesto.

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
