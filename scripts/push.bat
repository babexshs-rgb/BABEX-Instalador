@echo off
REM ==================================================
REM BABEX - push.bat
REM Sube el codigo SIN crear una version nueva.
REM Los cambios se ven al instante en la URL /dev
REM (la de pruebas, solo para ti como propietario).
REM
REM Usa este para el dia a dia mientras desarrollas,
REM y deploy.bat SOLO cuando quieras publicar de verdad
REM en la URL /exec para el resto de usuarios.
REM ==================================================

cd /d "%~dp0"

echo.
echo Subiendo cambios con clasp push...
call clasp push -f

if errorlevel 1 (
    echo.
    echo ERROR: clasp push ha fallado.
    pause
    exit /b 1
)

echo.
echo Listo. Recarga la URL /dev para ver los cambios.
pause
