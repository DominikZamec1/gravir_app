# Spouštěcí skript pro lokální scheduled task (každých 15 min).
# Spustí feed.py --backlog a loguje do feed_cron.log.
Set-Location -Path $PSScriptRoot
$env:PYTHONIOENCODING = "utf-8"
$log = Join-Path $PSScriptRoot "feed_cron.log"

$py = (Get-Command python -ErrorAction SilentlyContinue).Source
if (-not $py) { $py = "C:\Python314\python.exe" }

# jednotné UTF-8 logování (PowerShell 5.1 by přes >> psal UTF-16 a míchal kódování)
"==== $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss') ====" | Out-File -Append -Encoding utf8 $log
(& $py feed.py --backlog *>&1) | Out-File -Append -Encoding utf8 $log
"" | Out-File -Append -Encoding utf8 $log

# udržet log rozumně velký – posledních 3000 řádků
try {
  $lines = Get-Content $log -ErrorAction Stop
  if ($lines.Count -gt 3000) { $lines[-3000..-1] | Set-Content $log -Encoding utf8 }
} catch {}
