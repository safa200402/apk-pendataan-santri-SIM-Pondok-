@echo off
setlocal
 
REM Copy semua isi folder saat ini ke folder (check_point)\backup_tanggal_jam
REM Kecuali node_modules, .git, app.exe, dan folder (check_point)
 
set "SOURCE=."
 
for /f %%i in ('powershell -NoProfile -Command "Get-Date -Format ddMMyy_HHmm"') do set "STAMP=%%i"
 
REM Contoh hasil: ..\(check_point)\backup_030403_1037
set "DEST=..\(check_point)\backup_%STAMP%"
 
robocopy "%SOURCE%" "%DEST%" /E ^
  /XD node_modules "(check_point)" ".git" ^
  /XF app.exe ^
  /R:0 /W:0
 
echo.
echo Proses copy selesai.
echo Disimpan di folder: %DEST%
pause