<#
.SYNOPSIS
    Run database migrations (PostgreSQL + ClickHouse).
#>
$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent $PSScriptRoot

Write-Host ""
Write-Host "Running DB migrations..." -ForegroundColor Cyan
Write-Host ""

# --- PostgreSQL ---
$pgMigrations = Get-ChildItem "$Root\apps\api\migrations\postgres\*.sql" -ErrorAction SilentlyContinue
if ($pgMigrations) {
    foreach ($m in $pgMigrations) {
        Write-Host "  -> PostgreSQL: $($m.Name)" -ForegroundColor Yellow
        Get-Content $m.FullName | docker exec -i netguard-postgres-1 psql -U netguard -d netguard
    }
    Write-Host "  [OK] PostgreSQL migrations applied" -ForegroundColor Green
}
else {
    Write-Host "  [SKIP] No PostgreSQL migrations found" -ForegroundColor Gray
}

# --- ClickHouse ---
$chMigrations = Get-ChildItem "$Root\apps\api\migrations\clickhouse\*.sql" -ErrorAction SilentlyContinue
if ($chMigrations) {
    foreach ($m in $chMigrations) {
        Write-Host "  -> ClickHouse: $($m.Name)" -ForegroundColor Yellow
        Get-Content $m.FullName | docker exec -i netguard-clickhouse-1 clickhouse-client --database=netguard --multiquery
    }
    Write-Host "  [OK] ClickHouse migrations applied" -ForegroundColor Green
}
else {
    Write-Host "  [SKIP] No ClickHouse migrations found" -ForegroundColor Gray
}

Write-Host ""
Write-Host "Done." -ForegroundColor Cyan