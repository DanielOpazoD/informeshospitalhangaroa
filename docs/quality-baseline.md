# Línea base operativa de calidad

Última actualización: `2026-03-21`

## Validación mínima obligatoria

Para refactors de bajo riesgo sobre editor, Drive, HHR o shell principal:

```bash
npm run validate:critical
```

Esto ejecuta:

1. `npm run typecheck`
2. `npm run test:critical`
3. `npm run build`
4. `npm run check:bundle`

## Validación completa previa a PR

```bash
npm run validate:full
```

Esto ejecuta:

1. `npm run lint`
2. `npm run typecheck`
3. `npm run typecheck:test`
4. `npm run test:ci`
5. `npm run build`
6. `npm run check:bundle`

## Suite crítica del shell/editor

- `src/tests/App.test.tsx`
- `src/tests/header.test.tsx`
- `src/tests/useEditorUiState.test.tsx`
- `src/tests/useDocumentEffects.test.tsx`
- `src/tests/RecordContext.test.tsx`
- `src/tests/editorUseCases.test.ts`
- `src/tests/components/app/AppShellContent.test.tsx`
- `src/tests/components/app/AppWorkspace.test.tsx`

## Suite crítica de integraciones

- `src/tests/driveGateway.test.ts`
- `src/tests/useDriveOperations.test.tsx`
- `src/tests/hhrGateway.test.ts`
- `src/tests/hhrIntegration.test.ts`
- `src/tests/hhrPayloadValidators.test.ts`

## Cobertura focalizada

Para verificar hotspots sin depender de cobertura global:

```bash
npm run test:critical:coverage
```

Áreas protegidas por esta línea base:

- flujo del editor y shell principal,
- persistencia local e historial,
- integración HHR,
- gateway y persistencia operativa de Drive.

## Baseline actual de bundle

Observado en el último build validado:

- `index`: ~`96.40 kB`
- `google`: ~`59.08 kB`
- `hhr`: ~`452.55 kB`
- `pdfGenerator`: ~`4.12 kB`
- `pdf`: ~`594.74 kB`
- `ai`: ~`22.60 kB`
- `cartola`: ~`83.01 kB`

Presupuestos vigentes validados por `check:bundle`:

- `index`: `200 kB`
- `google`: `120 kB`
- `hhr`: `520 kB`
- `pdf`: `650 kB`
- `ai`: `180 kB`
- `cartola`: `220 kB`

## Criterio de salida para fases de refactor

Cada fase se considera terminada solo si:

- mantiene contratos públicos de UI/contexto esperados,
- pasa `npm run validate:critical`,
- actualiza esta línea base si cambia la suite crítica o el baseline de bundle.
