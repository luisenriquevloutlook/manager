# Plan de Implementación - Módulos y Ajustes en MySQL (Sin localStorage)

El objetivo es lograr que la gestión de módulos (crear, editar y eliminar) y la configuración del proyecto (tester por defecto, versión de matriz) sean completamente independientes para cada proyecto, almacenando toda esta información en la base de datos **MySQL** en lugar de usar `localStorage` del navegador.

## Cambios Propuestos

### ⚙️ Backend (Servidor Express)

#### [MODIFY] [server.js](file:///C:/Users/luise/OneDrive/Desarrollo/Manager/TestManager/server.js)
- **Creación de tablas:** Añadir consultas `CREATE TABLE IF NOT EXISTS` al inicio del servidor para garantizar la existencia de las tablas `custom_modules` y `config`.
- **Inicialización de datos:** Implementar una función `initializeProjectsData` que se ejecute al arrancar el servidor. Esta función verificará cada proyecto existente; si no tiene módulos configurados, le asignará los 12 módulos heredados por defecto, y si no tiene configuración, creará su registro básico.
- **Ruta POST `/api/projects`:** Actualizar el endpoint de creación de proyectos para insertar automáticamente los 12 módulos y configuración inicial por defecto al crear un nuevo proyecto.
- **Rutas CRUD para Módulos:**
  - `GET /api/projects/:projectId/modules`: Obtener la lista de nombres de módulos de un proyecto.
  - `POST /api/projects/:projectId/modules`: Agregar un nuevo módulo al proyecto.
  - `PUT /api/projects/:projectId/modules/:oldName`: Editar el nombre de un módulo y actualizar en cascada los casos de prueba del proyecto que lo estén utilizando.
  - `DELETE /api/projects/:projectId/modules/:name`: Eliminar un módulo del proyecto.
- **Rutas para Configuración:**
  - `GET /api/projects/:projectId/config`: Obtener la configuración del proyecto.
  - `PUT /api/projects/:projectId/config`: Guardar/Actualizar la configuración del proyecto.

---

### 💻 Frontend (React)

#### [MODIFY] [apiService.ts](file:///C:/Users/luise/OneDrive/Desarrollo/Manager/TestManager/src/services/apiService.ts)
- Agregar los siguientes métodos HTTP:
  - `getProjectModules(projectId)`
  - `addProjectModule(projectId, name)`
  - `updateProjectModule(projectId, oldName, newName)`
  - `deleteProjectModule(projectId, name)`
  - `getProjectConfig(projectId)`
  - `updateProjectConfig(projectId, config)`

#### [MODIFY] [TestContext.tsx](file:///C:/Users/luise/OneDrive/Desarrollo/Manager/TestManager/src/contexts/TestContext.tsx)
- Añadir estados `modules` (lista de strings) y `projectConfig` (objeto con `defaultTester` y `matrixVersion`) al contexto.
- En la función `refreshData`, cargar estos valores desde MySQL mediante `apiService` para el `currentProjectId` activo.
- Implementar funciones del contexto: `addModule`, `updateModule`, `deleteModule` y `updateConfig` que invoquen al backend y ejecuten `refreshData()` para mantener sincronizada la interfaz.

#### [MODIFY] [SettingsPage.tsx](file:///C:/Users/luise/OneDrive/Desarrollo/Manager/TestManager/src/pages/SettingsPage.tsx)
- Desestructurar `modules`, `projectConfig`, `addModule`, `updateModule`, `deleteModule` y `updateConfig` del contexto `useTest()`.
- Eliminar el uso de utilidades locales de `localStorage`.
- Sincronizar el formulario y los inputs con los valores del context mediante `useEffect`.
- Actualizar los manejadores de eventos para que utilicen las nuevas funciones del context.

#### [MODIFY] [TestCasesPage.tsx](file:///C:/Users/luise/OneDrive/Desarrollo/Manager/TestManager/src/pages/TestCasesPage.tsx)
- Desestructurar `modules` (como `availableModules`) y `projectConfig` del contexto.
- Usar `projectConfig.defaultTester` y `projectConfig.matrixVersion` en lugar de las utilidades de `localStorage`.

#### [MODIFY] [ExecutionPage.tsx](file:///C:/Users/luise/OneDrive/Desarrollo/Manager/TestManager/src/pages/ExecutionPage.tsx)
- Desestructurar `projectConfig` del contexto `useTest()`.
- Usar `projectConfig.defaultTester` para establecer el tester por defecto al ejecutar.

---

### 🗑️ Limpieza

#### [DELETE] [modules.ts](file:///C:/Users/luise/OneDrive/Desarrollo/Manager/TestManager/src/utils/modules.ts)
#### [DELETE] [config.ts](file:///C:/Users/luise/OneDrive/Desarrollo/Manager/TestManager/src/utils/config.ts)
- Eliminar estos archivos utilitarios puesto que toda la persistencia ahora reside en MySQL.

## Plan de Verificación

### Verificación Manual
1. Abrir la sección **Configuración** y verificar que cargue los módulos y la configuración por defecto desde MySQL para el proyecto actual.
2. Crear un nuevo proyecto y verificar en MySQL (o en la UI al cambiar de proyecto) que se inicializa con sus propios módulos por defecto y configuración vacía de forma automática.
3. En el Proyecto A, agregar un módulo personalizado (ej. `PROYECTO_A_ONLY`). Comprobar que no afecta a otros proyectos.
4. En el Proyecto A, renombrar un módulo que está en uso por casos de prueba y verificar que se actualizan correctamente esos casos de prueba.
5. Comprobar que no queden datos en `localStorage` relacionados con módulos o configuración del sistema.
