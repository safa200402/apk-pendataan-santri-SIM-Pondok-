@echo off
setlocal
cd /d "%~dp0"

echo.
echo === Upload perubahan ke GitHub ===
echo.

git status
echo.

set /p COMMIT_MSG=Tulis ringkasan perubahan (commit message):
if "%COMMIT_MSG%"=="" set "COMMIT_MSG=Update"

git add .
git commit -m "%COMMIT_MSG%"
git push

echo.
echo Selesai. Cek hasilnya di halaman repo GitHub kamu.
pause
