# Arquitectura del Sistema: Clinical Records App

Este documento detalla la estructura y el flujo de datos de la aplicación "Cartola de Medicamentos e Informes Médicos".

## 1. Patrón General: Separación de Responsabilidades
La aplicación está construida sobre React (TypeScript + Vite) y sigue una arquitectura orientada a **componentes de composición**, **hooks de coordinación**, **contextos de estado**, **servicios de frontera** y **utilidades puras**.

### Capas del Proyecto (`src/`)
- **/components:** Presentación y composición visual. La carpeta `components/app/` concentra el ensamblaje del editor principal (`AppShellContent`, `AppWorkspace`, `AppModals`).
- **/contexts:** Estado global y contratos compartidos (`RecordContext`, `AuthContext`, `DriveContext`).
- **/hooks:** Coordinación React reutilizable (`useEditorUiState`, `useDocumentEffects`, `useDriveModals`, `useDriveOperations`, `useToolbarCommands`).
- **/services:** Fronteras con proveedores externos; actualmente `driveGateway.ts` encapsula la interacción con Google Drive.
- **/utils:** Funciones puras, validación y clientes desacoplados (`validationUtils`, `settingsStorage`, familia `gemini*`, `pdfGenerator`, etc.).

## 2. Flujo de Datos Principal (RecordContext)
El estado de la "Ficha Clínica Actual" (el paciente que se está editando) reside centralmente en `RecordContext`.
1. `App.tsx` crea providers y rutas; `AppShellContent` ensambla el editor.
2. La UI lee datos mediante `useRecordContext()`.
3. Las mutaciones del formulario viajan por `useRecordForm` y la persistencia local por `useClinicalRecord`.
4. La persistencia local ya no depende directamente de `window.localStorage` en cada módulo; pasa por adaptadores compartidos.

## 3. Manejo de Almacenamiento y Archivos Remotos
1. **Google Drive:** `AuthContext` mantiene la sesión y `DriveContext` orquesta el estado de navegación.
2. **Gateway tipado:** `services/driveGateway.ts` encapsula `window.gapi` y la subida multipart.
3. **UI de Drive:** `useDriveModals` coordina modales/Picker y `useDriveSearch` resuelve búsqueda y caché.
4. **Persistencia local:** `storageAdapter.ts`, `settingsStorage.ts` y `driveFolderStorage.ts` concentran lectura/escritura en navegador.

## 4. IA Asistida (Gemini API)
La capa de IA está separada por responsabilidad:
- **`geminiCatalogClient.ts`:** catálogo/modelos accesibles.
- **`geminiRoutingResolver.ts`:** descubrimiento `v1`/`v1beta` y caché de routing.
- **`geminiGenerationClient.ts`:** generación de contenido y retries.
- **`geminiClient.ts`:** fachada pública estable para el resto de la app.
- Las credenciales/configuración se persisten localmente mediante `settingsStorage.ts`.

## 5. Decisiones de Renderizado y Rutas
Se usa `react-router-dom` para separar vistas pesadas:
- `/` (Home): el editor principal compuesto por `AppShellContent` y `AppWorkspace`.
- `/cartola`: La visualización histórica de prescripciones (CartolaMedicamentosView).

## 6. Dominio Cartola
- `components/cartola/useCartolaState.ts` concentra estado y casos de uso del módulo.
- `components/cartola/cartolaDomain.ts` contiene reglas puras: normalización, naming de exportación y utilidades de dominio.
- `components/cartola/CartolaApp.tsx` quedó como componente de composición, sin la mayor parte de la lógica de negocio inline.
