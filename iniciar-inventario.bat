@echo off
cd /d "%~dp0"
echo Iniciando Inventario WebAR en http://localhost:8081
start "Inventario WebAR - servidor" cmd /k "cd /d ""%~dp0"" && npm run dev -- --host 0.0.0.0 --port 8081"
timeout /t 3 /nobreak >nul
start "" "http://localhost:8081"