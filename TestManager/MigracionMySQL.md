# 🚀 Plan de Migración a MySQL - Test Manager MesaGo

## 📋 Información General

**Objetivo:** Migrar el sistema de gestión de pruebas desde localStorage del navegador a una base de datos MySQL profesional.

**Tipo de Implementación:** Gradual por fases (5 fases)

**Tiempo Estimado Total:** 4-6 horas de desarrollo

**Tokens Estimados:** ~30,000 tokens (repartidos en 5 fases)

**Riesgo Global:** Medio (mitigado por implementación gradual)

---

## 🗄️ Configuración MySQL

**Base de Datos:**
- Servidor: `localhost`
- Base de Datos: `testmanager`
- Usuario: `manager`
- Contraseña: `Soysuperadmin#1`
- Puerto: `3306` (por defecto)
projectmanager
---

## 📊 Arquitectura: Antes vs Después

### Antes (localStorage)
```
┌─────────────────────┐
│   React Frontend    │
│   (Vite + TS)       │
├─────────────────────┤
│  testService.ts     │
│  ↓ localStorage     │
│  Browser Storage    │
│  (5-10 MB límite)   │
└─────────────────────┘
```

### Después (MySQL)
```
┌─────────────────────┐
│   React Frontend    │
│   (Vite + TS)       │
├─────────────────────┤
│  apiService.ts      │
│  ↓ HTTP/REST        │
├─────────────────────┤
│  Backend Express    │
│  (server.js)        │
│  ↓ mysql2           │
├─────────────────────┤
│  MySQL Database     │
│  testmanager        │
│  (Ilimitado)        │
└─────────────────────┘
```

---

## 🎯 Fases de Implementación

### ✅ Pre-requisitos (Hacer ANTES de empezar)

- [x] MySQL instalado y corriendo
- [x] Verificar conexión a MySQL desde terminal
- [x] Exportar TODOS los datos actuales a JSON (BACKUP OBLIGATORIO)
- [x] Instalar dependencias necesarias: `express`, `cors`, `mysql2`, `multer`
- [x] Crear base de datos `testmanager` en MySQL
- [x] Crear usuario `manager` con permisos

**Comandos de validación:**
```sql
-- Verificar MySQL corriendo
mysql -u root -p

-- Crear base de datos (si no existe)
CREATE DATABASE IF NOT EXISTS testmanager CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Crear usuario (si no existe)
CREATE USER IF NOT EXISTS 'manager'@'localhost' IDENTIFIED BY 'Soysuperadmin#1';

-- Dar permisos
GRANT ALL PRIVILEGES ON testmanager.* TO 'manager'@'localhost';
FLUSH PRIVILEGES;

-- Verificar conexión
mysql -u manager -p testmanager
```

---

## 📦 FASE 1: Backend Base + Evidencias en Archivos

**Objetivo:** Crear backend Node.js (Express) y migrar las evidencias (imágenes) desde Base64 en localStorage a archivos físicos en el servidor.

**Estimación:** 1-1.5 horas | ~6,000 tokens

**Riesgo:** Bajo (no toca datos críticos aún)

### Tareas:

#### 1.1 Setup Backend
- [x] Validar dependencias en `package.json` (Express, Cors, Multer, Dotenv, MySQL2 y Concurrently ya están instalados)
- [x] Crear `server.js` en la raíz de `TestManager/` con configuración básica de Express
- [x] Configurar CORS en Express para admitir peticiones desde el frontend (puerto 6180)
- [x] Configurar el backend en el puerto 3030
- [x] Crear `.env` con credenciales de conexión de MySQL (`manager` / `Soysuperadmin#1`)
- [x] Asegurar que `.env` esté agregado a `.gitignore`

#### 1.2 Estructura de Carpetas
- [x] Crear `TestManager/uploads/` en la raíz del proyecto para guardar evidencias (⚠️ **Fuera de `src/`** para evitar que el Hot Reloading de Vite recargue la interfaz al subir archivos)
- [x] Configurar Express para servir la carpeta `uploads` de manera estática en el endpoint `/evidences`
- [x] Crear `TestManager/database/schema.sql` para definir la base de datos
- [x] Crear `TestManager/database/migrations/` para parches secuenciales
- [x] Crear `TestManager/src/services/apiService.ts` en el frontend para centralizar Axios

#### 1.3 API de Evidencias (Backend)
- [x] Endpoint `POST /api/evidences/upload` - Subir imagen a `/uploads` (límite 10MB con Multer)
- [x] Servir estáticamente las imágenes a través de Express en `GET /evidences/:filename`
- [x] Endpoint `DELETE /api/evidences/:filename` - Eliminar archivo del disco
- [x] Validación de archivos en Multer (permitir solo jpg, jpeg, png, gif, webp)
- [x] Generación de nombres únicos en disco: `timestamp-uuid.ext`

#### 1.4 Frontend - API Service
- [x] Crear `apiService.ts` configurando la base URL `http://localhost:3030` con Axios
- [x] Implementar `uploadEvidence(file: File)` → Retorna URL de acceso del backend
- [x] Implementar `deleteEvidence(filename: string)`

#### 1.5 Modificar ExecutionPage
- [x] Sustituir la conversión `fileToBase64()` por la subida real `uploadEvidence()`
- [x] Guardar la URL remota de la evidencia en lugar de la cadena Base64
- [x] Mantener retrocompatibilidad: si la evidencia guardada empieza con `data:image/`, cargarla como Base64; de lo contrario, cargarla desde la URL del backend

#### 1.6 Modificar HistoryPage
- [x] Detectar el formato de la evidencia (Base64 vs URL del backend) y renderizar correspondientemente

#### 1.7 Scripts de Ejecución Simultánea
- [x] Modificar `package.json` o scripts de inicio para arrancar backend y frontend concurrentemente usando `concurrently` (por ejemplo, `concurrently "npm run dev" "node server.js"`)

### Validación Fase 1:
- [x] El servidor Express inicia correctamente en el puerto 3030
- [x] Al subir una imagen en una prueba, se almacena en la carpeta física `uploads/` de la raíz
- [x] **Vite no se reinicia** ni refresca la pantalla tras subir una evidencia
- [x] Las evidencias legacy (Base64) se visualizan sin problemas
- [x] Las evidencias nuevas se sirven correctamente desde el backend y se despliegan en el historial

### Rollback Fase 1:
Si algo falla, simplemente NO uses el backend y todo sigue funcionando con localStorage.

---

## 📦 FASE 2: MySQL Schema + Migración de Casos de Prueba

**Objetivo:** Diseñar la base de datos SQL completa (incluyendo soporte multi-proyecto desde el inicio) e implementar el backend y scripts para migrar los casos de prueba.

**Estimación:** 1.5 horas | ~8,000 tokens

**Riesgo:** Medio (empieza a tocar datos críticos)

### Tareas:

#### 2.1 Diseño de Base de Datos e Integridad (schema.sql)
- [x] Tabla `schema_migrations` (`version VARCHAR(255) PRIMARY KEY`, `applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP`) para control de versiones de BD
- [x] Tabla `test_projects` (`id` int auto-increment, `name`, `description`, `created_at`) para anticipar la estructura multi-proyecto de la Fase 5
- [x] Tabla `test_cases` con `project_id` as FK apuntando a `test_projects`, código único por proyecto, título, módulo, prioridad, severidad, pasos, resultado esperado, etc.
- [x] Tabla `custom_modules` y tabla `config` vinculadas al esquema
- [x] Índices compuestos y Constraints (ej: asegurar unicidad de código de caso por proyecto)

#### 2.2 Ejecución e Inicialización del Schema
- [x] Crear base de datos y correr `schema.sql`
- [x] Insertar un proyecto por defecto con ID `1` (ej. "Proyecto Default MesaGo") para asociar los datos migrados de localStorage
- [x] Crear el registro inicial de migración en `schema_migrations`

#### 2.3 Backend - Conexión MySQL y Reintento
- [x] Crear `database/connection.js` usando un Pool de Conexiones (`mysql2/promise`)
- [x] Configurar el pool con reconexión automática y manejo de pérdidas de conexión

#### 2.4 Backend - API Casos de Prueba (filtrados por proyecto activo)
- [x] Endpoints REST en backend:
  - `GET /api/test-cases?projectId=X`
  - `GET /api/test-cases/:id`
  - `POST /api/test-cases` (asocia el `projectId` recibido o por defecto `1`)
  - `PUT /api/test-cases/:id`
  - `DELETE /api/test-cases/:id`
- [x] Validación de unicidad de código en el backend para prevenir inyecciones y colisiones

#### 2.5 Frontend - API Service (Test Cases)
- [x] Mapear llamadas HTTP para interactuar con los nuevos endpoints de casos de prueba

#### 2.6 Modificar testService.ts
- [x] Interceptar y delegar operaciones a `apiService.ts` manteniendo firmas de métodos idénticas para no romper el contexto React (`TestContext`)

#### 2.7 Script de Migración de Casos (Desde Backup JSON)
- [x] Crear script `database/migrations/migrate-test-cases.js`
- [x] **Lógica correcta de migración:** Leer el backup JSON exportado manualmente por el usuario en lugar de intentar leer el `localStorage` del navegador desde Node.js
- [x] Insertar los registros en `test_cases` asociándolos al proyecto con ID `1`
- [x] Generar un archivo de log y reporte de la migración

#### 2.8 Configuración y Módulos
- [x] Adaptar configuraciones globales y módulos personalizados en base de datos MySQL

### Validación Fase 2:
- [x] Tablas de MySQL y el proyecto base ID `1` creados exitosamente
- [x] El script de migración procesa el archivo de backup JSON e inserta correctamente los casos de prueba en MySQL
- [x] Las páginas del frontend cargan los casos de prueba desde la base de datos MySQL (filtrando por defecto el proyecto `1`)
- [x] CRUD completo (Crear, Editar, Eliminar) de casos de prueba operativo contra MySQL

---

## 📦 FASE 3: Migración de Ejecuciones a MySQL

**Objetivo:** Migrar el historial de ejecuciones de prueba a MySQL, vinculando evidencias por URL de archivo físico en lugar de strings Base64.

**Estimación:** 1.5 horas | ~8,000 tokens

**Riesgo:** Alto (datos más grandes, relaciones complejas)

### Tareas:

#### 3.1 Extender Schema MySQL
- [x] Tabla `test_executions` con claves foráneas apuntando a `test_cases` y `test_projects`
- [x] Tabla `test_evidences` para registrar URLs de archivos en disco vinculadas a cada ejecución
- [x] Relación 1:N entre `test_executions` y `test_evidences` (evitando Base64 en BD)
- [x] Índices en campos de consulta comunes (executedAt, result, testCaseId)

#### 3.2 Backend - API Ejecuciones
- [x] Endpoint `GET /api/executions` con soporte de paginación
- [x] Endpoint `POST /api/executions` que inserte ejecución y evidencias asociadas atómicamente usando una Transacción SQL
- [x] Endpoint `DELETE /api/executions/:id` (con borrado lógico o físico en cascada)

#### 3.3 Frontend - API Service (Executions)
- [x] Implementar llamadas HTTP para guardar y obtener ejecuciones del backend

#### 3.4 Modificar executionService.ts
- [x] Migrar almacenamiento local a la API remota

#### 3.5 Script de Migración de Ejecuciones (Desde Backup JSON)
- [x] Crear script `database/migrations/migrate-executions.js`
- [x] **Lógica correcta de migración:** Leer el backup JSON exportado manualmente por el usuario
- [x] Iterar ejecuciones e insertarlas vinculando el `testCaseId` correspondiente en MySQL (haciendo el mapeo de IDs si es necesario)
- [x] Si una ejecución contiene evidencias en Base64, el script debe:
  1. Decodificar la cadena Base64 y guardarla como archivo físico en la carpeta `/uploads`
  2. Insertar la referencia URL correspondiente en la tabla `test_evidences`
- [x] Loguear el avance y controlar fallos con transacciones

#### 3.6 Actualizar ExecutionPage
- [x] Modificar flujo: al presionar guardar prueba, se suben primero las imágenes al endpoint de evidencias y luego se envía la ejecución con las URLs asignadas

#### 3.7 Actualizar HistoryPage
- [x] Cargar ejecuciones paginadas del backend e implementar filtros directamente en las queries SQL (más óptimo que cargarlo todo en memoria)

#### 3.9 Limpieza de Datos Viejos
- [x] Modificar "Limpiar Ejecuciones Viejas" para usar SQL
- [x] Query optimizado: `DELETE FROM test_executions WHERE executedAt < DATE_SUB(NOW(), INTERVAL 30 DAY)`
- [x] Cascade delete automático de evidencias

### Validación Fase 3:
- [x] Puedo ejecutar un caso de prueba y se guarda en MySQL
- [x] Las evidencias se guardan como archivos y referencias en BD
- [x] HistoryPage muestra todas las ejecuciones de MySQL
- [x] Puedo ver detalles de una ejecución con evidencias
- [x] Filtros funcionan correctamente
- [x] Dashboard calcula estadísticas desde MySQL
- [x] Limpieza de datos viejos funciona
- [x] Todas las ejecuciones de localStorage se migraron

### Rollback Fase 3:
- [x] Exportar ejecuciones de MySQL a JSON
- [x] Revertir cambios en executionService.ts
- [x] Importar JSON de vuelta a localStorage
- [x] Verificar que HistoryPage funciona como antes

---

## 📦 FASE 4: Estadísticas y Optimizaciones

**Objetivo:** Optimizar cálculo de estadísticas con queries SQL eficientes y agregar caché.

**Estimación:** 1 hora | ~4,000 tokens

**Riesgo:** Bajo (solo optimizaciones)

### Tareas:

#### 4.1 Backend - API Estadísticas
- [x] `GET /api/statistics/summary` - Estadísticas generales
- [x] Query SQL optimizado con COUNT, GROUP BY
- [x] Estadísticas por módulo
- [x] Estadísticas por prioridad
- [x] Estadísticas por resultado
- [x] Pass rate calculado en SQL
- [x] Trends (últimos 7/30 días)

#### 4.2 Frontend - API Service (Statistics)
- [x] `getStatisticsSummary()` → TestStatistics
- [x] `getModuleStats()` → ModuleStatistics[]
- [x] `getPriorityStats()` → PriorityStatistics[]
- [x] Cache de 5 minutos (no recargar en cada navegación)

#### 4.3 Modificar statisticsService
- [x] Usar API en vez de calcular en frontend
- [x] Eliminar cálculos pesados del navegador
- [x] Cache inteligente con invalidación

#### 4.4 Optimizaciones de Performance
- [x] Índices compuestos en MySQL para queries frecuentes
- [x] Connection pooling optimizado
- [x] Compresión GZIP en respuestas HTTP
- [x] Paginación en todas las listas grandes

#### 4.5 Dashboard Mejorado
- [x] Gráficas actualizadas con datos en tiempo real
- [x] Métricas de performance (tiempo de ejecución promedio)
- [x] Top 10 casos con más fallos
- [x] Tendencias de calidad por semana/mes

### Validación Fase 4:
- [x] Dashboard carga rápido (<2 segundos)
- [x] Estadísticas son precisas
- [x] No hay lag al navegar entre páginas
- [x] Cache funciona correctamente
- [x] Queries SQL son eficientes (usar EXPLAIN)

---

## 📦 FASE 5: Proyectos Múltiples y Reportes PDF

**Objetivo:** Habilitar el control y visualización de múltiples proyectos en el frontend (ya estructurado en la BD en la Fase 2) e implementar la exportación de reportes profesionales en formato PDF.

**Estimación:** 1-1.5 horas | ~5,000 tokens

**Riesgo:** Bajo (funcionalidad adicional, no afecta existente)

### Tareas:

#### 5.1 Lógica y UI de Proyectos Múltiples
- [x] La base de datos ya soporta `test_projects` desde la Fase 2, así que no se requieren alteraciones mayores de SQL
- [x] Backend API para Proyectos:
  - `GET /api/projects` - Listar proyectos existentes con estadísticas agregadas (pass rate, casos totales)
  - `POST /api/projects` - Crear nuevo proyecto
  - `DELETE /api/projects/:id` - Eliminar proyecto y sus dependencias (en cascada)
- [x] Selector de Proyecto Activo en el navbar del frontend
- [x] Almacenar el ID del proyecto seleccionado actualmente en localStorage en el navegador para mantener la persistencia al recargar
- [x] Filtrar todas las llamadas de datos de Casos y Ejecuciones de acuerdo al proyecto activo en el frontend

#### 5.2 Generación de Reportes PDF (Ligera y Nativa)
- [x] Instalar la biblioteca nativa y ligera **`pdfkit`** (o `pdf-lib`) en el backend
- [x] Evitar Puppeteer debido a su gran tamaño en disco y dependencias adicionales en servidor
- [x] Endpoint `POST /api/reports/generate` que genere un PDF directamente en el backend:
  - Diseño profesional del reporte (cabecera con logo de MesaGo, metadatos del proyecto)
  - Resumen ejecutivo con estadísticas clave calculadas mediante agregaciones SQL
  - Listado de casos ejecutados y fallas reportadas
- [x] Almacenar temporalmente los PDFs generados en la carpeta `TestManager/reports/` (fuera de `src/` para evitar hot reloads)

#### 5.3 Frontend - Reportes
- [x] Agregar interfaz en el frontend para solicitar y descargar el reporte del proyecto
- [x] Previsualización o configuración de parámetros básicos del reporte PDF

#### 5.4 Export/Import Robusto
- [x] Permitir exportación e importación integral de un archivo de proyecto en formato estructurado (incluyendo restauración de BD)

### Validación Fase 5:
- [x] Puedo crear múltiples proyectos
- [x] Cada proyecto tiene sus propios datos aislados
- [x] Puedo cambiar entre proyectos fácilmente
- [x] Generar PDF funciona correctamente
- [x] PDF se ve profesional y completo
- [x] Export/Import funciona sin pérdida de datos

---

## 🔄 Plan de Migración de Datos

### Antes de Empezar CUALQUIER Fase:
1. **BACKUP COMPLETO**
   ```bash
   # En la página de Configuración
   → Exportar a JSON
   # Guardar archivo con nombre: backup-pre-migracion-YYYY-MM-DD.json
   ```

2. **Verificar Backup**
   - Abrir archivo JSON
   - Verificar que contiene testCases y executions
   - Contar registros manualmente

### Migración Automática (Fase 2 y 3):
Los scripts de migración leerán localStorage y copiarán a MySQL. No borrarán localStorage hasta que confirmes que todo funciona.

### Post-Migración:
- [x] Validar que TODOS los datos se migraron
- [x] Comparar conteos (localStorage vs MySQL)
- [x] Probar todas las funcionalidades
- [x] Solo después de 100% validado, limpiar localStorage

---

## 🛡️ Plan de Rollback General

### Si algo sale mal EN CUALQUIER FASE:

1. **Detener servidor backend**
   ```bash
   Ctrl+C en terminal del servidor
   ```

2. **Revertir cambios de código**
   ```bash
   git checkout -- .
   # O usar Git para volver al commit anterior
   ```

3. **Restaurar datos**
   - Ir a Configuración
   - Importar JSON del backup
   - Verificar que todo vuelve a funcionar

4. **Limpiar MySQL (opcional)**
   ```sql
   DROP DATABASE testmanager;
   CREATE DATABASE testmanager;
   ```

5. **Reiniciar solo frontend**
   ```bash
   npm run dev
   ```

Todo debe volver a funcionar como antes de la migración.

---

## 📝 Checklist de Validación Final

### Después de completar TODAS las fases:

#### Funcionalidad Básica
- [x] Crear caso de prueba → Se guarda en MySQL
- [x] Editar caso de prueba → Se actualiza en MySQL
- [x] Eliminar caso de prueba → Se elimina de MySQL
- [x] Ejecutar caso de prueba → Se guarda en MySQL
- [x] Subir evidencias → Se guardan como archivos
- [x] Ver historial → Muestra datos de MySQL
- [x] Aplicar filtros → Funciona correctamente
- [x] Dashboard → Muestra estadísticas correctas

#### Módulos y Configuración
- [x] Crear módulo personalizado → MySQL
- [x] Configuración de tester → MySQL
- [x] Versión de matriz → MySQL

#### Reportes y Exportación
- [x] Generar PDF → Funciona
- [x] Exportar JSON → Incluye todos los datos
- [x] Importar JSON → Restaura datos correctamente

#### Performance
- [x] Carga inicial < 3 segundos
- [x] Navegación entre páginas fluida
- [x] Sin lag al filtrar/buscar
- [x] Queries MySQL eficientes

#### Datos
- [x] Todos los casos de prueba migraron
- [x] Todas las ejecuciones migraron
- [x] Todas las evidencias accesibles
- [x] No hay datos duplicados
- [x] Integridad referencial correcta

#### Seguridad
- [x] Credenciales en .env (no hardcoded)
- [x] .env en .gitignore
- [x] Validación de inputs en backend
- [x] Protección contra SQL injection (usando prepared statements)

---

## 📊 Seguimiento de Progreso

### Estado Actual: ✅ MIGRACIÓN COMPLETADA

| Fase | Estado | Fecha Inicio | Fecha Fin | Tokens Usados | Notas |
|------|--------|--------------|-----------|---------------|-------|
| Pre-requisitos | ✅ Completada | 2026-06-08 | 2026-06-08 | ~1,000 | Configurado usuario y BD base |
| Fase 1 | ✅ Completada | 2026-06-08 | 2026-06-08 | ~6,000 | Backend Express + uploads físicos |
| Fase 2 | ✅ Completada | 2026-06-08 | 2026-06-08 | ~8,000 | Esquema y persistencia de casos de prueba |
| Fase 3 | ✅ Completada | 2026-06-08 | 2026-06-08 | ~8,000 | Migración e imágenes de ejecuciones |
| Fase 4 | ✅ Completada | 2026-06-08 | 2026-06-08 | ~4,000 | Estadísticas optimizadas y caché client |
| Fase 5 | ✅ Completada | 2026-06-08 | 2026-06-08 | ~5,000 | Multi-proyecto y reportes PDF con pdfkit |
| **TOTAL** | **100%** | 2026-06-08 | 2026-06-08 | **~32,000** | Migración completa exitosa |

### Leyenda de Estados:
- ⬜ Pendiente
- 🔄 En Progreso
- ✅ Completada
- ❌ Bloqueada/Error
- ⚠️ Completada con warnings

---

## 🆘 Troubleshooting Común

### Error: "Cannot connect to MySQL"
**Solución:**
1. Verificar que MySQL está corriendo: `mysql.server status` or `systemctl status mysql`
2. Verificar credenciales en `.env`
3. Verificar puerto 3306 disponible: `netstat -an | findstr 3306`

### Error: "Port 3030 already in use"
**Solución:**
1. Matar proceso: `netstat -ano | findstr 3030` → `taskkill /PID xxxx /F`
2. O cambiar puerto en `server.js` y frontend

### Error: "CORS policy blocked"
**Solución:**
1. Verificar configuración CORS en `server.js`
2. Asegurar que origin incluye `http://localhost:6180`

### Error: "File upload failed"
**Solución:**
1. Verificar permisos en la carpeta raíz `TestManager/uploads/`
2. Verificar límite de tamaño en `multer` (default 10MB)
3. Verificar tipo de archivo permitido

### Error: "Data migration incomplete"
**Solución:**
1. Revisar logs del script de migración
2. Ejecutar migración de nuevo (es idempotente)
3. Comparar conteos: `SELECT COUNT(*) FROM test_cases;`

---

## 📚 Recursos y Referencias

### Documentación
- [MySQL 8.0 Reference](https://dev.mysql.com/doc/refman/8.0/en/)
- [Express.js Guide](https://expressjs.com/en/guide/routing.html)
- [mysql2 npm package](https://www.npmjs.com/package/mysql2)
- [Multer (file uploads)](https://www.npmjs.com/package/multer)
- [PDFKit](https://pdfkit.org/)

### Ejemplos de Referencia
- Proyecto NBA: `C:\Users\luise\OneDrive\Desarrollo\Deportes\NBA\server.js`
- Proyecto NFL: `C:\Users\luise\OneDrive\Desarrollo\Deportes\NFL\server.js`

---

## ✅ Próximos Pasos

1. **Revisar este documento completo** ✋
2. **Levantar el sistema con concurrently** `npm run start-all`
3. **Disfrutar de la persistencia centralizada en base de datos** 🚀

---

**Última Actualización:** 2026-06-08
**Versión del Documento:** 1.1
**Autor:** Antigravity + Luis Enrique
