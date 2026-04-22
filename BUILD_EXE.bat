@echo off
chcp 65001 >nul
cls
echo.
echo  ██████╗██████╗ ██████╗     ███████╗████████╗██╗   ██╗██████╗ ██╗ ██████╗
echo ██╔════╝██╔══██╗██╔══██╗    ██╔════╝╚══██╔══╝██║   ██║██╔══██╗██║██╔═══██╗
echo ██║     ██║  ██║██████╔╝    ███████╗   ██║   ██║   ██║██║  ██║██║██║   ██║
echo ██║     ██║  ██║██╔══██╗    ╚════██║   ██║   ██║   ██║██║  ██║██║██║   ██║
echo ╚██████╗██████╔╝██║  ██║    ███████║   ██║   ╚██████╔╝██████╔╝██║╚██████╔╝
echo  ╚═════╝╚═════╝ ╚═╝  ╚═╝    ╚══════╝   ╚═╝    ╚═════╝ ╚═════╝ ╚═╝ ╚═════╝
echo.
echo           [ CDR FOUNDATION - BUILDER DE ESCRITORIO v4.0 ]
echo.
echo =========================================================================
echo   PASO 1/4: Instalando dependencias de Electron...
echo =========================================================================
cd /d "%~dp0\electron-build"
call npm install
if %errorlevel% neq 0 (
    echo [ERROR] Fallo al instalar dependencias.
    pause
    exit /b 1
)

echo.
echo =========================================================================
echo   PASO 2/4: Copiando archivos de la app al bundle...
echo =========================================================================
if exist "%~dp0\electron-build\app-src" rmdir /s /q "%~dp0\electron-build\app-src"
mkdir "%~dp0\electron-build\app-src"

:: Copiar archivos principales
for %%f in (index.html app.js ai-engine.js style.css config.js registered_keys.js blacklist.js expirations.js metadata.js gifuct.js omggif.js) do (
    if exist "%~dp0\%%f" (
        copy "%~dp0\%%f" "%~dp0\electron-build\app-src\%%f" >nul
        echo   [OK] %%f copiado
    )
)

:: Copiar carpeta ia-models
xcopy "%~dp0\ia-models" "%~dp0\electron-build\app-src\ia-models" /e /i /q >nul
echo   [OK] ia-models copiado

:: Copiar GIFs si existen
if exist "%~dp0\CDR gifs" (
    xcopy "%~dp0\CDR gifs" "%~dp0\electron-build\app-src\CDR gifs" /e /i /q >nul
    echo   [OK] CDR gifs copiado
)

echo.
echo =========================================================================
echo   PASO 3/4: Compilando .exe con Electron Packager...
echo =========================================================================
if exist "%~dp0\dist" rmdir /s /q "%~dp0\dist"

call npx electron-packager "%~dp0\electron-build" "CDR Studio" ^
    --platform=win32 ^
    --arch=x64 ^
    --out="%~dp0\dist" ^
    --overwrite ^
    --asar ^
    --app-version=4.0.0 ^
    --electron-version=33.4.0 ^
    --win32metadata.CompanyName="CDR Foundation" ^
    --win32metadata.FileDescription="CDR Studio - Generador de Totem Packs" ^
    --win32metadata.ProductName="CDR Studio"

if %errorlevel% neq 0 (
    echo [ERROR] Fallo al compilar el exe.
    pause
    exit /b 1
)

echo.
echo =========================================================================
echo   PASO 4/4: Moviendo CDR Studio.exe al escritorio...
echo =========================================================================
if exist "%~dp0\dist\CDR Studio-win32-x64\CDR Studio.exe" (
    copy "%~dp0\dist\CDR Studio-win32-x64\CDR Studio.exe" "%~dp0\CDR.exe" >nul
    echo   [OK] CDR.exe generado en el proyecto!
) else (
    echo   [WARN] No se pudo copiar el exe suelto, busca la carpeta dist\
)

echo.
echo =========================================================================
echo   BUILD COMPLETO!
echo   El instalador esta en: dist\CDR Studio-win32-x64\
echo   El .exe portable esta en: CDR.exe (carpeta raiz del proyecto)
echo =========================================================================
echo.
pause
