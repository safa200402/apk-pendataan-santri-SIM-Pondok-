param(
    [int]$Port = 3000
)

Write-Host ""
Write-Host "============================================================"
Write-Host " Proses Node.js yang sedang berjalan"
Write-Host "============================================================"
$procs = Get-CimInstance Win32_Process -Filter "Name='node.exe'"
if (-not $procs) {
    Write-Host "  (tidak ada proses node.exe yang berjalan)"
} else {
    foreach ($p in $procs) {
        $info = Get-Process -Id $p.ProcessId -ErrorAction SilentlyContinue
        $start = if ($info) { $info.StartTime } else { "?" }
        Write-Host ("  PID {0,-7} Start: {1,-22} Cmd: {2}" -f $p.ProcessId, $start, $p.CommandLine)
        Write-Host ("           -> utk matikan: taskkill /PID {0} /F" -f $p.ProcessId)
    }
}

Write-Host ""
Write-Host "============================================================"
Write-Host " Yang sedang pegang port $Port"
Write-Host "============================================================"
$conns = Get-NetTCPConnection -State Listen -ErrorAction SilentlyContinue | Where-Object { $_.LocalPort -eq $Port }
if (-not $conns) {
    Write-Host "  (tidak ada yang listen di port $Port -- server belum jalan?)"
} else {
    foreach ($c in $conns) {
        $cp = Get-CimInstance Win32_Process -Filter "ProcessId=$($c.OwningProcess)"
        $watch = if ($cp -and $cp.CommandLine -match '--watch') { "(--watch, auto-reload)" } else { "(TANPA --watch, TIDAK auto-reload)" }
        Write-Host ("  PID {0} {1}" -f $c.OwningProcess, $watch)
        Write-Host ("           -> utk matikan: taskkill /PID {0} /F" -f $c.OwningProcess)
    }
}

Write-Host ""
Write-Host "============================================================"
Write-Host " Peringatan"
Write-Host "============================================================"
$n = (Get-CimInstance Win32_Process -Filter "Name='node.exe'" | Measure-Object).Count
if ($n -gt 2) {
    Write-Host "  Ada $n proses node.exe aktif -- cek satu-satu di atas, kemungkinan ada proses lama/duplikat yang nyangkut (tidak ke-update pas edit kode)."
} else {
    Write-Host "  Aman, tidak ada proses node.exe yang mencurigakan."
}
Write-Host ""
