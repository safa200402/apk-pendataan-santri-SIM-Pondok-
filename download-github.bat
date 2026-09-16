@echo off
setlocal
cd /d "%~dp0"

echo.
echo ==========================================================
echo   DOWNLOAD PERUBAHAN TERBARU DARI GITHUB
echo ==========================================================
echo.
echo Info: skrip ini akan mengambil (fetch) perubahan terbaru
echo dari GitHub, lalu menggabungkannya (pull) ke project ini.
echo Kalau ada file lokal yang belum disimpan (belum di-commit)
echo dan bertabrakan dengan perubahan dari GitHub, proses akan
echo berhenti otomatis supaya kerjaanmu tidak tertimpa.
echo.

echo --- Status project saat ini ---
git status
echo.

echo --- Mengecek perubahan terbaru di GitHub (fetch)... ---
git fetch origin main
echo.

echo --- Daftar commit baru yang belum ada di project ini ---
git log HEAD..origin/main --oneline
echo.
echo Keterangan: kalau daftar di atas kosong, berarti project
echo kamu sudah paling baru, tidak perlu download apa-apa.
echo.

set /p LANJUT=Lanjutkan download ^& gabungkan perubahan di atas ke project ini? (y/n):
if /i not "%LANJUT%"=="y" (
    echo.
    echo Dibatalkan. Tidak ada perubahan yang didownload.
    pause
    exit /b
)

echo.
echo --- Mengambil dan menggabungkan perubahan (pull)... ---
git pull origin main

echo.
echo ==========================================================
echo   SELESAI. Project sudah disamakan dengan GitHub.
echo ==========================================================
pause
