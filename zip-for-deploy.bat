@echo off
setlocal

cd /d "%~dp0"

set "TEMP=%TEMP%\deploy_temp"
set "ZIP=deploy.zip"

if exist "%ZIP%" del /q "%ZIP%"
if exist "%TEMP%" rmdir /s /q "%TEMP%"

mkdir "%TEMP%"

robocopy . "%TEMP%" /E ^
    /XD node_modules ^
    /XF *.bat *.zip ^
    /R:0 /W:0 >nul

powershell -NoProfile -Command ^
    "Compress-Archive -Path '%TEMP%\*' -DestinationPath '%ZIP%' -Force"

rmdir /s /q "%TEMP%"

echo.
echo Selesai: %CD%\%ZIP%
pause