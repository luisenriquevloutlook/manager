# Iniciar Test Manager en puerto 6180
Write-Host "🧪 Iniciando Test Manager..." -ForegroundColor Cyan
Write-Host "Puerto: 6180" -ForegroundColor Yellow
Write-Host "URL: http://localhost:6180" -ForegroundColor Green
Write-Host ""
Write-Host "Presiona Ctrl+C para detener el servidor" -ForegroundColor Gray
Write-Host "=" * 50

npm run start-all
