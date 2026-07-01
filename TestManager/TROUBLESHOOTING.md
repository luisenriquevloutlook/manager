# 🔧 Troubleshooting - Test Manager

## QuotaExceededError (Almacenamiento Lleno)

### Síntoma
Al ejecutar un caso de prueba aparece el error:
```
QuotaExceededError: Failed to execute 'setItem' on 'Storage': 
Setting the value of 'mesago-test-executions' exceeded the quota.
```

### Causa
El localStorage del navegador tiene un límite de **~5-10MB** por dominio. Las imágenes en base64 ocupan mucho espacio (una imagen de 2MB puede ocupar 2.7MB en base64).

### ✅ Solución Rápida

1. **Exporta tus datos** (¡IMPORTANTE!):
   - Configuración → "📥 Exportar a JSON"
   - Guarda el archivo en un lugar seguro

2. **Limpia ejecuciones viejas** (Recomendado):
   - Configuración → "🧹 Limpiar Ejecuciones Viejas (>30d)"
   - Elimina solo datos antiguos, mantiene ejecuciones recientes

3. **O limpia todas las ejecuciones**:
   - Configuración → "🗑️ Limpiar Todas las Ejecuciones"
   - Esto libera más espacio pero mantiene los casos de prueba

4. **Vuelve a ejecutar** la prueba

### 🔧 Optimizaciones Implementadas

**El sistema ahora incluye:**
✅ **Compresión automática de imágenes:**
- Redimensiona a máximo **600px** de ancho/alto (antes 800px)
- Comprime a **50% de calidad** JPEG (antes 70%)
- Reduce el tamaño en **~60-80%** (antes 50-70%)

✅ **Límite forzado de evidencias:**
- Máximo **3 imágenes** por ejecución
- Validación en frontend antes de subir
- Mensaje de error claro si excedes el límite

✅ **Limpieza automática de datos viejos:**
- Botón para eliminar ejecuciones >30 días
- Mantiene datos recientes, libera espacio histórico
- Muestra estadísticas antes de eliminar

### 🎯 Mejores Prácticas

1. **Limita evidencias**: Máximo **3 imágenes** por ejecución (forzado por el sistema)
2. **Usa imágenes pequeñas**: Comprime ANTES de subir si es posible
3. **Limpia mensualmente**: 
   - Usa "Limpiar Ejecuciones Viejas (>30d)" cada mes
   - Exporta datos antes de limpiar
4. **Monitorea el uso**: 
   - Ve a Configuración → "Estado del Almacenamiento"
   - Actúa cuando veas advertencia amarilla (>70%)
   - URGENTE si ves alerta roja (>90%)

### 📊 Ver Espacio Usado

La página de **Configuración** ahora muestra:
- ✅ Barra de progreso del almacenamiento
- ✅ Desglose por tipo de datos (casos, ejecuciones, config, módulos)
- ⚠️ Advertencias cuando está >70% lleno
- 🔴 Alerta crítica cuando está >90% lleno

---

## Error al Registrar Ejecución

### Síntoma
Al ejecutar un caso de prueba aparece el mensaje: "Error al registrar la ejecución"

### Causas Comunes

1. **Campos requeridos faltantes**
   - Verifica que hayas completado todos los campos obligatorios:
     - Tester ejecutor
     - Resultado de la prueba
     - Severidad (si es falla crítica o menor)
     - Mensaje de error (si aplica según el resultado)

2. **Problemas con evidencias**
   - Archivos muy grandes (límite sugerido: 5MB por imagen)
   - Formatos no soportados
   - Problemas de conversión a base64

3. **Datos corruptos en localStorage**
   - Abre DevTools (F12) → Application → Local Storage
   - Revisa las claves `mesago-test-cases` y `mesago-test-executions`
   - Si hay errores JSON, considera limpiar y reimportar

### Solución

1. **Ver error detallado**:
   - Abre la Consola del navegador (F12 → Console)
   - Intenta ejecutar la prueba de nuevo
   - Lee el mensaje de error completo en la consola

2. **Limpiar y reintentar**:
   ```
   1. Exporta tus datos (Configuración → Exportar a JSON)
   2. Limpia solo ejecuciones (Configuración → Limpiar Solo Ejecuciones)
   3. Intenta ejecutar la prueba de nuevo
   ```

3. **Reinicio completo** (último recurso):
   ```
   1. Exporta TODOS tus datos
   2. Limpia todos los datos
   3. Importa tus datos de nuevo
   ```

---

## ¿Dónde Están Mis Datos?

### Almacenamiento en localStorage

Los datos **NO** se guardan en archivos JSON en tu disco. Todo está en **localStorage del navegador**.

**Claves de almacenamiento:**
```
mesago-test-cases       → Casos de prueba
mesago-test-executions  → Ejecuciones registradas
mesago-custom-modules   → Módulos personalizados
mesago-config          → Configuración general
```

### Ver datos en el navegador

1. Abre DevTools con **F12**
2. Ve a la pestaña **Application** (Chrome) o **Storage** (Firefox)
3. En el panel izquierdo: **Local Storage** → `http://localhost:6180`
4. Verás todas las claves con tus datos

### ⚠️ IMPORTANTE

- **Si cambias de navegador**, pierdes los datos
- **Si limpias datos del navegador**, pierdes los datos
- **Si usas modo incógnito**, los datos se borran al cerrar
- **Siempre exporta respaldos** usando "Exportar a JSON"

---

## Estado de Casos No Se Actualiza

### Problema
Ejecuto una prueba como "APROBADO" pero el caso sigue en "PENDIENTE"

### Solución
Este bug fue corregido. Si todavía lo experimentas:

1. Recarga la página (F5)
2. El sistema sincronizará automáticamente los estados
3. Verás en la consola: `Sincronizados X caso(s) de prueba con sus ejecuciones`

Si aún no se actualiza:
1. Abre Configuración
2. Exporta tus datos
3. Limpia todos los datos
4. Importa tus datos de nuevo

---

## Errores Comunes de TypeScript

Si ves errores de compilación:

1. **Puerto en uso (6180)**:
   ```powershell
   # Solución rápida
   Stop-Process -Name node -Force -ErrorAction SilentlyContinue
   cd Test
   npm run dev
   ```

2. **Módulos no encontrados**:
   ```bash
   cd Test
   npm install
   ```

3. **Cache corrupta**:
   ```bash
   cd Test
   rm -rf node_modules
   rm package-lock.json
   npm install
   ```

---

## Rendimiento Lento

### Problema
La aplicación se vuelve lenta con muchos datos

### Solución

1. **Limita datos históricos**:
   - Exporta datos antiguos
   - Limpia ejecuciones antiguas
   - Mantén solo ejecuciones del último mes

2. **Reduce evidencias**:
   - Usa imágenes comprimidas
   - Evita subir videos pesados
   - Máximo 2-3 evidencias por ejecución

3. **Limpia localStorage periódicamente**:
   - Exporta respaldo mensual
   - Limpia ejecuciones viejas
   - Reimporta solo datos necesarios

---

## Soporte

Para más ayuda:
1. Revisa la consola del navegador (F12)
2. Exporta tus datos antes de cualquier operación riesgosa
3. Lee los mensajes de error completos
4. Documenta los pasos para reproducir el error
