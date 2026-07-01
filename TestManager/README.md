# 🧪 Test Manager

Sistema profesional de gestión de pruebas para el proyecto MesaGo.

## 📋 Características

- ✅ Gestión completa de casos de prueba basados en matriz Excel
- 🔄 Ejecución y re-ejecución de pruebas
- 📊 Histórico completo de ejecuciones (exitosas, fallidas, corregidas)
- 📸 Carga de evidencias en imagen
- 📝 Observaciones y notas por prueba
- 💾 Almacenamiento en archivos JSON (sin base de datos)
- ➕ Creación de nuevos casos de prueba
- 📈 Dashboard con métricas y estadísticas
- 🎨 Interfaz moderna basada en el diseño de MesaGo WEB

## 🚀 Inicio Rápido

### Instalación

```powershell
cd C:\Users\luise\OneDrive\Desarrollo\MesaGo\Test
npm install
```

### Desarrollo

```powershell
npm run dev
```

El sistema estará disponible en: **http://localhost:6180**

### Compilación

```powershell
npm run build
```

## 📁 Estructura de Datos

Los datos se almacenan en `public/test-data/`:

- `test-cases.json` - Casos de prueba de la matriz
- `executions/` - Histórico de ejecuciones de pruebas
- `evidences/` - Imágenes y archivos de evidencia

## 🧩 Módulos

### 1. Dashboard
- Vista general del estado de pruebas
- Métricas y estadísticas
- Gráficos de cobertura

### 2. Test Cases
- Listado de casos de prueba
- Filtros por módulo, prioridad, estado
- Creación/edición de casos

### 3. Test Execution
- Ejecución de pruebas individuales o en lote
- Registro de resultados
- Carga de evidencias

### 4. Test History
- Histórico completo de ejecuciones
- Filtros y búsqueda
- Comparación de resultados

## 🎨 Tecnologías

- React 19
- TypeScript
- Vite 7
- Tailwind CSS 4
- React Router DOM
- Recharts (gráficos)
- Axios

## 📝 Notas

- Los datos se guardan automáticamente en JSON
- Las evidencias se almacenan en `public/test-data/evidences/`
- Formato de matriz compatible con Excel v1.1

---

**Versión:** 1.0.0  
**Puerto:** 6180  
**Fecha:** Junio 2026
