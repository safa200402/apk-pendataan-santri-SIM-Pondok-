@echo off
setlocal
cd /d "%~dp0"

set "PORT=3000"
if not "%~1"=="" set "PORT=%~1"
set "APP_HOST=0.0.0.0"

set "LAN_IP="
for /f "usebackq delims=" %%I in (`powershell -NoProfile -ExecutionPolicy Bypass -Command "$addresses = [System.Net.Dns]::GetHostAddresses([System.Net.Dns]::GetHostName()); foreach ($addr in $addresses) { if ($addr.AddressFamily -eq [System.Net.Sockets.AddressFamily]::InterNetwork -and $addr.IPAddressToString -notmatch '^(127\.|169\.254\.)') { $addr.IPAddressToString; break } }"`) do set "LAN_IP=%%I"
if not defined LAN_IP set "LAN_IP=127.0.0.1"

echo.
echo Menjalankan server versi LAN [MODE WATCH - auto-restart saat file berubah]...
echo Backend + frontend statis bisa diakses dari:
echo   http://localhost:%PORT%
echo   http://%LAN_IP%:%PORT%
echo.
echo Jika Windows Firewall meminta izin, pilih Allow access untuk Private networks.
echo Tekan Ctrl+C untuk menghentikan server.
echo.

net session >nul 2>&1
if not errorlevel 1 (
  netsh advfirewall firewall show rule name="Pendataan Santri Backend %PORT%" >nul 2>&1
  if errorlevel 1 (
    netsh advfirewall firewall add rule name="Pendataan Santri Backend %PORT%" dir=in action=allow protocol=TCP localport=%PORT% profile=private >nul 2>&1
  )
)

set "PORT=%PORT%"
npm run dev

echo.
pause
