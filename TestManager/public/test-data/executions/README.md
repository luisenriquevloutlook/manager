# Carpeta para ejecuciones de prueba

Las ejecuciones se guardan automáticamente como archivos JSON individuales con el formato:

`exec-{timestamp}-{random}.json`

Cada archivo contiene:
- Información del caso de prueba ejecutado
- Resultado (EXITOSO, FALLIDO, BLOQUEADO)
- Observaciones del tester
- Evidencias adjuntas
- Datos de entorno (navegador, OS, versiones)
- Información de reintentos si aplica

**No editar manualmente estos archivos**
