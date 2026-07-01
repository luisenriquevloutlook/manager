# 🚀 Guía de Inicio Rápido - MesaGo Test Manager

## ⚡ Instalación y Ejecución

### 1. Instalar Dependencias

```powershell
cd C:\Users\luise\OneDrive\Desarrollo\MesaGo\Test
npm install
```

### 2. Iniciar Sistema

```powershell
npm run dev
```

El sistema estará disponible en: **http://localhost:6180**

## 📊 Flujo de Trabajo

### 1. Dashboard (Inicio)
- Vista general de estadísticas
- Gráficos de cobertura
- Últimas ejecuciones

### 2. Casos de Prueba
- Ver todos los casos de la matriz
- Filtrar por módulo, prioridad, estado
- Buscar por código o descripción
- Crear nuevos casos de prueba

### 3. Ejecutar Pruebas
- Seleccionar caso de prueba
- Registrar ejecución paso a paso
- Marcar resultado (Exitoso/Fallido/Bloqueado)
- Agregar observaciones
- Subir evidencias en imagen

### 4. Historial
- Ver todas las ejecuciones realizadas
- Filtrar por resultado o tester
- Ver evidencias adjuntas
- Revisar observaciones y errores
- Identificar pruebas reintentadas

### 5. Configuración
- Ajustes generales
- Importar/Exportar datos
- Información del sistema

## 💾 Almacenamiento de Datos

Los datos se guardan en dos lugares:

1. **LocalStorage del navegador**
   - Casos de prueba
   - Ejecuciones de prueba
   - Configuración

2. **Archivos JSON en public/test-data/**
   - `test-cases.json` - Casos de prueba
   - `executions/*.json` - Ejecuciones individuales
   - `evidences/*` - Imágenes y archivos adjuntos

## 🧪 Casos de Prueba Precargados

El sistema incluye 10 casos de prueba de ejemplo:

- **AUTH-001**: Detectar sistema sin inicializar ✅
- **AUTH-002**: Crear primer administrador ✅
- **AUTH-101**: Login con credenciales válidas ✅
- **USR-106**: Validación de email completo ✅
- **USR-201**: Crear usuario con rol mesero ⏳
- **ROL-101**: Listar roles del sistema ⏳
- **EST-101**: Ver datos del establecimiento ⏳
- **CAT-101**: Crear nueva categoría ⏳
- **PROD-101**: Crear nuevo producto ⏳
- **MESA-101**: Crear nueva mesa ⏳

✅ = Completado | ⏳ = Pendiente

## 📝 Cómo Ejecutar una Prueba

1. Ve a **Ejecutar Pruebas**
2. Selecciona un caso de prueba de la lista
3. Revisa los pasos y resultado esperado
4. Ingresa tu nombre como tester
5. Ejecuta los pasos en el sistema MesaGo
6. Marca el resultado (Exitoso/Fallido/Bloqueado)
7. Agrega observaciones importantes
8. Si falló, describe el error encontrado
9. Adjunta evidencias en imagen si es necesario
10. Haz clic en "Registrar Ejecución"

## 🔄 Reintentos de Pruebas Fallidas

Si una prueba falla:

1. Se guarda el registro del fallo con el error
2. Puedes volver a ejecutar el mismo caso
3. El sistema detecta que es un reintento
4. Se marca como "Reintento #1", "#2", etc.
5. El historial conserva todos los intentos

## 📊 Métricas y Estadísticas

El dashboard muestra:

- Total de pruebas en la matriz
- Pruebas ejecutadas vs pendientes
- Tasa de aprobación (% exitosas)
- Pruebas fallidas y bloqueadas
- Gráfico de distribución de resultados
- Gráfico por módulo
- Últimas 5 ejecuciones

## ➕ Agregar Nuevos Casos

Para agregar casos de prueba que no están en la matriz:

1. Ve a **Casos de Prueba**
2. Haz clic en **+ Nuevo Caso de Prueba**
3. Completa el formulario:
   - Código único (ej: USR-301)
   - Nombre descriptivo
   - Módulo del sistema
   - Descripción completa
   - Precondiciones
   - Pasos de ejecución
   - Resultado esperado
   - Prioridad (Crítica/Alta/Media/Baja)
   - Tags para búsqueda
4. Guardar

El nuevo caso estará disponible para ejecutar inmediatamente.

## 🎯 Buenas Prácticas

1. **Sé descriptivo** en las observaciones
2. **Adjunta evidencias** de errores encontrados
3. **Describe errores claramente** para facilitar la corrección
4. **Actualiza el estado** de los casos según avances
5. **Revisa el historial** antes de reportar bugs duplicados

## 🚨 Solución de Problemas

### Puerto ocupado
Si el puerto 6180 está ocupado:
```powershell
# Cambiar puerto en vite.config.ts
server: { port: 6181 }
```

### Datos no se guardan
- Los datos se guardan en LocalStorage
- Limpia el cache del navegador y recarga

### Evidencias no se cargan
- Las evidencias están en modo simulado
- Se guarda el nombre y tamaño del archivo
- En producción se subirían a un servidor

---

**¿Preguntas?** Consulta el README.md o la documentación del proyecto.

**¡Felices pruebas! 🧪✅**
