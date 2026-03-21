# Guía Ejecutable de Arquitectura

## Decisiones activas
- `domain/` contiene reglas puras del negocio y no depende de React ni de APIs del navegador.
- `application/` concentra casos de uso, comandos, workflow y decisiones de coordinación puras.
- `infrastructure/` encapsula side effects, retries, timeouts y acceso a proveedores externos.
- `hooks/` adapta contratos de `application` e `infrastructure` al ciclo de vida de React.
- `components/` solo presenta UI y no debe hablar directamente con APIs externas o globals del browser.

## Flujo permitido entre capas
- `components/` -> `hooks/`
- `hooks/` -> `application/` y `infrastructure/`
- `application/` -> `domain/`
- `infrastructure/` -> `services/` legacy solo mientras exista una frontera tipada que lo encapsule
- `domain/` no importa desde `application/`, `hooks/`, `components/` ni `infrastructure/`

## Reglas de implementación
- Toda integración remota nueva debe devolver `AppResult<T>` con `status`, `warnings` y `error` tipado.
- Toda mutación importante del registro clínico debe pasar por comandos/casos de uso, no por lógica inline en componentes.
- Los contextos nuevos deben ser finos por responsabilidad; evitar contratos gigantes que mezclen navegación, búsqueda y guardado.
- Cuando exista una frontera tipada en `infrastructure/`, los hooks y componentes no deben consumir el servicio legacy directamente.
- Las utilidades en `utils/` deben ser genéricas; si contienen regla de negocio o política de flujo deben moverse a `domain/` o `application/`.

## Checklist para PRs de refactor
- El cambio reduce acoplamiento o complejidad, no solo mueve código.
- El área tocada tiene tests nuevos o ajustados al comportamiento real.
- No se agregan dependencias desde UI a servicios legacy.
- `lint`, `typecheck`, `typecheck:test`, `test:ci`, `build` y `check:bundle` pasan.
- No se versionan artefactos generados como `coverage/`.
