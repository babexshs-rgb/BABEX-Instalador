@echo off
REM ==================================================
REM BABEX - deploy.bat
REM Sube el codigo y publica una nueva version en la
REM MISMA implementacion web (la URL /exec no cambia).
REM ==================================================

cd /d "%~dp0"

echo.
echo [1/2] Subiendo cambios con clasp push...
call clasp push -f

if errorlevel 1 (
    echo.
    echo ERROR: clasp push ha fallado. No se publica nada nuevo.
    pause
    exit /b 1
)

echo.
echo [2/2] Publicando nueva version en el despliegue web...
call clasp deploy -i AKfycbzBaEQPAKZnqradQsXjNNd_DZ5cPbNhykNWFBRDecPk6K5Kh0PqGHQB3dPSKRcHBQMIEg -d "Deploy automatico %date% %time%"

if errorlevel 1 (
    echo.
    echo ERROR: clasp deploy ha fallado. El codigo se subio pero la web sigue con la version anterior.
    pause
    exit /b 1
)

echo.
echo Listo. La URL /exec ya tiene el ultimo codigo.
pause
