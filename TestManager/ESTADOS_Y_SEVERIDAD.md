# Sistema de Estados y Severidad - MesaGo Test Manager

## ⚠️ Actualización Importante - Estados Unificados

**¡CAMBIO CRÍTICO!** El sistema ha sido actualizado para **evitar confusión** entre estados de casos de prueba y resultados de ejecución.

### 🔧 Qué Cambió

**ANTES:**
- Cuando se ejecutaba una prueba con resultado `FALLA_MENOR`, el estado del caso cambiaba a `EN_PROGRESO`
- Cuando se ejecutaba una prueba con resultado `FALLA_CRITICA`, el estado del caso cambiaba a `BLOQUEADO`
- Esto generaba confusión porque el resultado no coincidía con el estado visible

**AHORA:**
- ✅ Los **estados de casos de prueba** (`TestStatus`) coinciden **directamente** con los **resultados de ejecución** (`TestResult`)
- ✅ Si ejecutas una prueba y el resultado es `FALLA_MENOR`, el estado del caso será `FALLA_MENOR`
- ✅ Si ejecutas una prueba y el resultado es `FALLA_CRITICA`, el estado del caso será `FALLA_CRITICA`
- ✅ **No más confusión** entre `EN_PROGRESO`/`BLOQUEADO` y las fallas reales

---

## Actualización del Sistema de Pruebas

Se ha actualizado completamente el sistema de pruebas para alinearse con la **Matriz de Pruebas MesaGo V1.1**, incorporando los estados oficiales y el sistema de severidad de defectos.

---

## 📊 Leyenda de Estados

El sistema ahora maneja **7 estados** de prueba según la leyenda oficial:

| Estado | Icono | Significado | Color |
|--------|-------|-------------|-------|
| **APROBADO** | ✓ | Prueba exitosa sin errores | Verde (#10b981) |
| **FALLA_CRITICA** | ✗ | Falla que bloquea funcionalidad principal | Rojo (#ef4444) |
| **FALLA_MENOR** | △ | Falla menor o advertencia | Naranja (#f59e0b) |
| **EN_PROCESO** | ⚙ | Prueba en ejecución | Azul (#3b82f6) |
| **PENDIENTE** | ○ | Prueba no ejecutada | Gris (#6b7280) |
| **NO_APLICA** | ⊘ | No aplica para esta versión | Gris claro (#9ca3af) |
| **ACTUALIZAR** | 📝 | Necesita actualización de caso | Morado (#8b5cf6) |

---

## 🔴 Severidad de Defectos

Cuando una prueba resulta en **FALLA_CRITICA** o **FALLA_MENOR**, se debe especificar la severidad del defecto:

| Severidad | Icono | Descripción | Ejemplo |
|-----------|-------|-------------|---------|
| **CRÍTICA** | 🔴 | Bloquea funcionalidad principal | Login no funciona, sistema no carga |
| **ALTA** | 🟠 | Afecta funcionalidad importante | No se pueden crear órdenes |
| **MEDIA** | 🟡 | Afecta funcionalidad menor | Filtros no funcionan correctamente |
| **BAJA** | 🟢 | Cosmético o mejora | Error de ortografía, alineación |

---

## 🛠️ Cambios Técnicos Implementados

### 1. **Tipos Actualizados** (`test.types.ts`)

```typescript
// ANTES - Estados y resultados eran diferentes
export type TestStatus = 'PENDIENTE' | 'EN_PROGRESO' | 'COMPLETADO' | 'BLOQUEADO';
export type TestResult = 
  | 'APROBADO'
  | 'FALLA_CRITICA'
  | 'FALLA_MENOR'
  | 'EN_PROCESO'
  | 'PENDIENTE'
  | 'NO_APLICA'
  | 'REQUIERE_ACTUALIZACION';

// ❌ PROBLEMA: Los resultados se mapeaban a estados diferentes
// FALLA_MENOR → EN_PROGRESO ❌
// FALLA_CRITICA → BLOQUEADO ❌

// AHORA - Estados y resultados son los mismos
export type TestStatus = 
  | 'PENDIENTE'              // ○ Pendiente (caso sin ejecutar)
  | 'APROBADO'               // ✓ Aprobado
  | 'FALLA_CRITICA'          // ✗ Falla crítica
  | 'FALLA_MENOR'            // △ Falla menor / Advertencia
  | 'EN_PROCESO'             // ⚙ En proceso
  | 'NO_APLICA'              // ⊘ No aplica
  | 'ACTUALIZAR';            // 📝 Requiere actualización

export type TestResult = 
  | 'APROBADO'
  | 'FALLA_CRITICA'
  | 'FALLA_MENOR'
  | 'EN_PROCESO'
  | 'PENDIENTE'
  | 'NO_APLICA'
  | 'ACTUALIZAR';

// ✅ SOLUCIÓN: El estado del caso ahora coincide con el resultado de la última ejecución
// FALLA_MENOR → FALLA_MENOR ✅
// FALLA_CRITICA → FALLA_CRITICA ✅

// Nuevo tipo para severidad
export type DefectSeverity = 'CRITICA' | 'ALTA' | 'MEDIA' | 'BAJA';

// TestExecution ahora incluye severity
export interface TestExecution {
  // ... otros campos
  result: TestResult;
  severity?: DefectSeverity; // Solo para fallas
  // ... otros campos
}
```

### 2. **Utilidades Creadas** (`utils/testResults.ts`)

Archivo nuevo con todas las utilidades para manejar estados y severidad:

```typescript
// Configuración de estados
export const TEST_RESULTS: Record<TestResult, Config>;

// Configuración de severidad
export const DEFECT_SEVERITY: Record<DefectSeverity, Config>;

// Funciones útiles
getResultIcon(result)
getResultLabel(result)
getResultColor(result)
getSeverityIcon(severity)
requiresSeverity(result)
requiresErrorMessage(result)
isSuccessResult(result)
isFailureResult(result)
```

### 3. **Estadísticas Actualizadas** (`TestStatistics`)

```typescript
export interface TestStatistics {
  total: number;
  executed: number;
  pending: number;
  approved: number;           // ✓ Aprobadas
  criticalFailed: number;     // ✗ Fallas críticas
  minorFailed: number;        // △ Fallas menores
  inProgress: number;         // ⚙ En proceso
  notApplicable: number;      // ⊘ No aplica
  requiresUpdate: number;     // 📝 Requiere actualización
  passRate: number;
  severityStats: Record<DefectSeverity, number>; // 🆕 Estadísticas por severidad
  // ...
}
```

---

## 📱 Páginas Actualizadas

### 1. **Página de Ejecución** (`ExecutionPage.tsx`)

**Mejoras:**
- ✅ Muestra los 7 estados disponibles (excepto PENDIENTE)
- ✅ Campo de **Severidad** aparece automáticamente cuando se selecciona una falla
- ✅ Validación: Requiere severidad para fallas críticas/menores
- ✅ Validación: Requiere descripción de error para fallas
- ✅ Botones con iconos y colores según la leyenda oficial

**Flujo de Ejecución:**

1. Seleccionar caso de prueba
2. Seleccionar resultado (APROBADO, FALLA_CRITICA, etc.)
3. **Si es falla** → Aparece selector de severidad (CRITICA, ALTA, MEDIA, BAJA)
4. **Si es falla** → Campo "Descripción del Error/Defecto" se vuelve obligatorio
5. Agregar observaciones (opcional)
6. Subir evidencias (opcional)
7. Registrar ejecución

### 2. **Dashboard** (`DashboardPage.tsx`)

**Mejoras:**
- ✅ 6 tarjetas de estadísticas: Total, Ejecutadas, Aprobadas, Fallas Críticas, Fallas Menores, En Proceso
- ✅ Gráfico de pastel con nuevos estados
- ✅ Gráfico de barras por módulo con Aprobadas/Fallas Críticas/Fallas Menores
- ✅ Tabla de últimas ejecuciones con iconos y colores correctos

### 3. **Historial** (`HistoryPage.tsx`)

**Mejoras:**
- ✅ Filtro por resultado con todos los estados disponibles
- ✅ Cards de ejecuciones con:
  - Icono y color según estado
  - **Badge de severidad** cuando aplica (🔴 Crítica, 🟠 Alta, etc.)
  - Badge de reintento
  - Observaciones
  - Descripción del error (cuando hay falla)
  - Evidencias adjuntas

### 4. **Configuración** (`SettingsPage.tsx`)

**Mejoras:**
- ✅ Estadísticas actualizadas: "pruebas aprobadas" y "pruebas con fallas"
- ✅ Compatible con nuevos tipos

---

## 📊 Ejemplo de Uso

### Caso 1: Prueba Aprobada ✓

```
Resultado: APROBADO
Severidad: - (no aplica)
Descripción de Error: - (no aplica)
Observaciones: "Funciona correctamente en Chrome y Firefox"
```

### Caso 2: Falla Crítica 🔴

```
Resultado: FALLA_CRITICA
Severidad: CRÍTICA (🔴)
Descripción de Error: "El login no funciona, error 500 en el servidor"
Observaciones: "Ocurre en todos los navegadores"
Evidencias: screenshot-error-500.png
```

### Caso 3: Falla Menor △

```
Resultado: FALLA_MENOR
Severidad: MEDIA (🟡)
Descripción de Error: "El filtro de fecha no funciona correctamente"
Observaciones: "Se puede trabajar sin el filtro temporalmente"
```

### Caso 4: No Aplica ⊘

```
Resultado: NO_APLICA
Severidad: - (no aplica)
Descripción de Error: - (no aplica)
Observaciones: "Esta funcionalidad no existe en esta versión del sistema"
```

### Caso 5: Requiere Actualización 📝

```
Resultado: ACTUALIZAR
Severidad: - (no aplica)
Descripción de Error: - (no aplica)
Observaciones: "El caso de prueba necesita actualización debido a cambios en el sistema"
```

---

## 🔄 Migración de Datos Existentes

Si ya tienes casos de prueba con los estados antiguos (`EN_PROGRESO`, `BLOQUEADO`, `COMPLETADO`), necesitas migrarlos a los nuevos estados.

### Ejecución Automática de Migración

Se ha creado un script de migración automática que actualiza los estados en la base de datos:

```bash
# Desde la carpeta TestManager
node database/migrations/migrate-test-statuses.js
```

### Qué hace el script:

1. **COMPLETADO → APROBADO**: Todos los casos con estado `COMPLETADO` se actualizan a `APROBADO`
2. **EN_PROGRESO y BLOQUEADO**: Se actualizan basándose en la última ejecución del caso:
   - Si hay ejecución: Se usa el resultado de la última ejecución como nuevo estado
   - Si no hay ejecución: `BLOQUEADO` → `FALLA_CRITICA`, `EN_PROGRESO` → `FALLA_MENOR`

### Ejemplo de salida:

```
🔄 Iniciando migración de estados de casos de prueba...

📝 Actualizando estados COMPLETADO a APROBADO...
   ✅ 5 caso(s) actualizado(s) de COMPLETADO a APROBADO

📝 Actualizando estados EN_PROGRESO y BLOQUEADO basándose en última ejecución...
   ✅ 3 caso(s) actualizado(s) basándose en última ejecución
   ✅ 1 caso(s) actualizado(s) con estado por defecto

📊 Resumen de estados después de la migración:

   Estados actuales:
   - APROBADO: 5 caso(s)
   - FALLA_MENOR: 3 caso(s)
   - FALLA_CRITICA: 1 caso(s)
   - PENDIENTE: 2 caso(s)

✅ Migración completada exitosamente
```

### ⚠️ Recomendaciones

1. **Hacer backup** antes de ejecutar la migración
2. Revisar que todos los estados quedaron correctos después de la migración
3. Si algún estado no es correcto, puedes editarlo manualmente desde la interfaz

---

## 🔄 Migración Manual (Alternativa)

Si prefieres actualizar los estados manualmente o tienes pocos casos:
   - `EXITOSO` → `APROBADO`
   - `FALLIDO` → `FALLA_CRITICA` o `FALLA_MENOR` (según severidad)
   - `BLOQUEADO` → `EN_PROCESO` o `FALLA_CRITICA`
3. Agregar campo `severity` a ejecuciones con fallas

---

## 📈 Reportes y Exportación

### Datos Exportados Incluyen:

```json
{
  "testCases": [...],
  "executions": [
    {
      "id": "exec-123",
      "result": "FALLA_CRITICA",
      "severity": "ALTA",
      "errorMessage": "Descripción del error",
      "observations": "Observaciones adicionales",
      ...
    }
  ],
  "statistics": {
    "approved": 45,
    "criticalFailed": 3,
    "minorFailed": 5,
    "severityStats": {
      "CRITICA": 1,
      "ALTA": 2,
      "MEDIA": 3,
      "BAJA": 2
    }
  }
}
```

---

## ✅ Validaciones Implementadas

1. **No se puede ejecutar sin seleccionar resultado** (distinto de PENDIENTE)
2. **Fallas requieren severidad obligatoria**
3. **Fallas requieren descripción del error**
4. **Los botones se deshabilitan según el contexto**
5. **Colores y estados son consistentes en toda la aplicación**

---

## 🎨 Guía Visual

### Colores Oficiales

- 🟢 **Verde** (#10b981): APROBADO
- 🔴 **Rojo** (#ef4444): FALLA_CRITICA / Severidad CRÍTICA
- 🟠 **Naranja** (#f59e0b): FALLA_MENOR / Severidad ALTA
- 🟡 **Amarillo** (#ca8a04): Severidad MEDIA
- 🟢 **Verde oscuro** (#16a34a): Severidad BAJA
- 🔵 **Azul** (#3b82f6): EN_PROCESO
- ⚪ **Gris** (#6b7280): PENDIENTE
- ⚪ **Gris claro** (#9ca3af): NO_APLICA
- 🟣 **Morado** (#8b5cf6): REQUIERE_ACTUALIZACION

---

## 📝 Próximos Pasos Recomendados

1. ✅ **Sistema actualizado** - Los cambios ya están activos
2. 📊 **Cargar casos de prueba** - Importar desde Excel
3. 🧪 **Ejecutar pruebas** - Usar los nuevos estados
4. 📈 **Revisar dashboard** - Ver estadísticas por severidad
5. 📤 **Exportar reportes** - Generar reportes con nuevos datos

---

## 🆘 Soporte

Si encuentras algún problema o tienes dudas sobre los nuevos estados:

1. Revisa el historial de ejecuciones para ver ejemplos
2. Consulta el Dashboard para ver la distribución de estados
3. Verifica que las severidades se asignan correctamente a las fallas

---

**Versión del Sistema:** 1.0.0  
**Fecha de Actualización:** 3 de junio de 2026  
**Matriz de Pruebas:** V1.1
