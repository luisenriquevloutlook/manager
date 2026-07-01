# 📥 Guía de Importación desde Excel

El sistema de pruebas ahora soporta **importación desde archivos JSON**. Este documento explica cómo convertir tu archivo Excel de matriz de pruebas a JSON para importarlo al sistema.

---

## 🔄 Opción 1: Usar el Script Python (Recomendado)

### Requisitos:
```bash
pip install pandas openpyxl
```

### Pasos:

1. **Abre el script:** `convert-excel-to-json.py`

2. **Ajusta las rutas** si es necesario (están preconfiguradas):
   ```python
   excel_file = r"C:\Users\luise\OneDrive\Desarrollo\MesaGo\Documentación\Matriz de Pruebas\Matriz de Pruebas MesaGo V1.1.xlsx"
   json_file = r"C:\Users\luise\OneDrive\Desarrollo\MesaGo\Documentación\Matriz de Pruebas\matriz-pruebas-import.json"
   ```

3. **Ejecuta el script:**
   ```bash
   cd C:\Users\luise\OneDrive\Desarrollo\MesaGo\Test
   python convert-excel-to-json.py
   ```

4. **Verifica la salida:**
   ```
   ✅ Conversión exitosa!
   📊 XX casos de prueba convertidos
   🎯 Ahora puedes importar 'matriz-pruebas-import.json' en el sistema
   ```

5. **Importa en el sistema:**
   - Ve a **Configuración** en http://localhost:6180/settings
   - Click en **"📥 Importar desde JSON"**
   - Selecciona el archivo `matriz-pruebas-import.json`
   - Confirma la importación

---

## 📋 Formato de Columnas Esperado en Excel

El script espera las siguientes columnas (ajusta nombres si son diferentes):

| Columna | Descripción | Obligatorio | Ejemplo |
|---------|-------------|-------------|---------|
| **Código** | Identificador único | ✅ Sí | AUTH-001 |
| **Módulo** | Módulo del sistema | ✅ Sí | AUTH, USUARIOS, ROLES |
| **Nombre** | Nombre descriptivo | ✅ Sí | Login con credenciales válidas |
| **Descripción** | Detalles del caso | ❌ No | Verificar que el usuario puede... |
| **Precondiciones** | Condiciones previas | ❌ No | Usuario registrado en BD |
| **Pasos** | Pasos separados por saltos de línea | ❌ No | 1. Abrir app\n2. Ingresar email\n3. Click en login |
| **Resultado Esperado** | Qué debe ocurrir | ✅ Sí | El usuario accede al dashboard |
| **Prioridad** | CRÍTICA, ALTA, MEDIA, BAJA | ❌ No | ALTA |
| **Estado** | PENDIENTE, EN_PROGRESO, COMPLETADO | ❌ No | PENDIENTE |
| **Asignado a** | Nombre del tester | ❌ No | Luis Vázquez |
| **Tiempo (min)** | Duración estimada | ❌ No | 10 |
| **Tags** | Etiquetas separadas por comas | ❌ No | login, seguridad, auth |

---

## 🔧 Opción 2: Conversión Manual (Online)

Si no puedes usar Python, usa un conversor online:

### Pasos:

1. **Abre tu Excel** y guárdalo como CSV:
   - Archivo → Guardar como → CSV (delimitado por comas)

2. **Usa un conversor CSV to JSON:**
   - https://www.convertcsv.com/csv-to-json.htm
   - https://csvjson.com/csv2json
   - https://onlinejsontools.com/convert-csv-to-json

3. **Ajusta el formato** para que coincida con esta estructura:

```json
{
  "testCases": [
    {
      "id": "tc-auth-001",
      "code": "AUTH-001",
      "module": "AUTH",
      "name": "Login con credenciales válidas",
      "description": "Verificar que el usuario puede iniciar sesión",
      "preconditions": "Usuario registrado en la base de datos",
      "steps": [
        "Abrir la aplicación",
        "Ingresar email y contraseña",
        "Click en 'Iniciar Sesión'"
      ],
      "expectedResult": "El usuario accede al dashboard",
      "priority": "ALTA",
      "status": "PENDIENTE",
      "assignedTo": "Luis Vázquez",
      "estimatedTime": 10,
      "tags": ["login", "auth", "seguridad"],
      "createdAt": "2026-06-03T00:00:00Z",
      "updatedAt": "2026-06-03T00:00:00Z",
      "version": "1.1"
    }
  ],
  "executions": [],
  "exportedAt": "2026-06-03T12:00:00Z",
  "version": "1.1"
}
```

---

## 📥 Importar en el Sistema

### Pasos:

1. **Accede a Configuración:**
   - http://localhost:6180/settings

2. **Click en "📥 Importar desde JSON"**

3. **Selecciona tu archivo JSON**

4. **Revisa el resumen:**
   ```
   📥 Importar datos desde JSON
   
   Casos de prueba: 45
   Ejecuciones: 0
   
   ⚠️ ADVERTENCIA: Esto SOBRESCRIBIRÁ todos los datos actuales.
   
   ¿Deseas continuar?
   ```

5. **Confirma la importación**

6. **Verifica:**
   - Ve a **Casos de Prueba** para ver los datos importados
   - Revisa el **Dashboard** para ver las estadísticas

---

## ⚠️ Advertencias Importantes

### ⛔ La importación SOBRESCRIBE todos los datos actuales

Antes de importar:

1. **Exporta tus datos actuales:**
   - Configuración → "💾 Exportar a JSON"
   - Guarda el archivo como respaldo

2. **Verifica el archivo JSON:**
   - Asegúrate de que tiene la estructura correcta
   - Comprueba que los módulos existen en tu configuración

3. **Haz una prueba:**
   - Importa en una instancia de prueba primero
   - Verifica que todo se importó correctamente

---

## 🛠️ Personalizar el Script de Conversión

Si tus columnas tienen nombres diferentes, edita el script `convert-excel-to-json.py`:

```python
# Busca esta sección y ajusta los nombres de columnas:
test_case = {
    "code": str(row['TU_COLUMNA_CODIGO']).strip(),  # <-- Cambia aquí
    "module": str(row['TU_COLUMNA_MODULO']).strip(),
    "name": str(row['TU_COLUMNA_NOMBRE']).strip(),
    # ... etc
}
```

---

## ✅ Verificación Post-Importación

Después de importar, verifica:

1. **Casos de Prueba:**
   - ✅ Todos los códigos son únicos
   - ✅ Los módulos existen
   - ✅ Las prioridades son válidas (CRÍTICA, ALTA, MEDIA, BAJA)
   - ✅ Los estados son válidos (PENDIENTE, EN_PROGRESO, COMPLETADO, BLOQUEADO)

2. **Dashboard:**
   - ✅ Las estadísticas se actualizaron
   - ✅ Los gráficos muestran datos correctos

3. **Ejecuciones:**
   - ✅ Si importaste ejecuciones, aparecen en Historial

---

## 🆘 Solución de Problemas

### Error: "El archivo JSON no tiene la estructura correcta"

**Causa:** El JSON no contiene `testCases` o no es un array.

**Solución:**
```json
{
  "testCases": [  // <-- Debe ser un array
    { ... }
  ]
}
```

### Error: "Error al importar el archivo"

**Causa:** JSON mal formado (sintaxis incorrecta).

**Solución:**
- Valida tu JSON en https://jsonlint.com/
- Verifica que no falten comas, corchetes o llaves

### Los módulos no aparecen

**Causa:** Los nombres de módulos no coinciden con los configurados.

**Solución:**
- Ve a Configuración → Gestión de Módulos
- Agrega los módulos que aparecen en tu Excel
- Vuelve a importar

---

## 💡 Consejos

1. **Usa el formato de exportación como plantilla:**
   - Exporta un JSON con casos de ejemplo
   - Úsalo como referencia para crear tu importación

2. **Valida antes de importar:**
   - Revisa el JSON en un editor como VS Code
   - Usa un validador JSON online

3. **Haz respaldos frecuentes:**
   - Exporta JSON regularmente
   - Guarda copias con fecha

4. **Divide importaciones grandes:**
   - Si tienes muchos casos, importa por módulos
   - Más fácil detectar errores

---

## 📞 Soporte

Si tienes problemas con la importación:

1. Verifica el formato del JSON exportado
2. Compara con el archivo que intentas importar
3. Revisa la consola del navegador (F12) para errores detallados
4. Valida tu JSON en https://jsonlint.com/

---

**Última actualización:** 3 de junio de 2026  
**Versión del sistema:** 1.0.0
