<#
.SYNOPSIS
    Run database migrations (PostgreSQL + ClickHouse).
.DESCRIPTION
    Abaikan NOTICE/warning dari PostgreSQL dan ClickHouse.
    Cek success dari exit code, bukan dari output.
#>
$ErrorActionPreference = "Continue"  # JANGAN Stop — biar warning tidak mematikan script
$Root = Split-Path -Parent $PSScriptRoot
Set-Location $Root

Write-Host ""
Write-Host "=== RUN MIGRATIONS ===" -ForegroundColor Cyan
Write-Host ""

$failed = 0

# --- PostgreSQL ---
$pgMigrations = Get-ChildItem "$Root\apps\api\migrations\postgres\*.sql" -ErrorAction SilentlyContinue | Sort-Object Name
if ($pgMigrations) {
    foreach ($m in $pgMigrations) {
        Write-Host "  [PG] $($m.Name)..." -ForegroundColor Yellow -NoNewline

        # Redirect stderr ke variable, jangan ke error stream PowerShell
        $output = Get-Content $m.FullName -Raw | docker exec -i netguard-postgres psql -U netguard -d netguard 2>&1 | Out-String

        if ($LASTEXITCODE -eq 0) {
            Write-Host " OK" -ForegroundColor Green
        } else {
            Write-Host " FAIL (exit $LASTEXITCODE)" -ForegroundColor Red
            Write-Host "       $output" -ForegroundColor DarkRed
            $failed++
        }
    }
}

# --- ClickHouse ---
$chMigrations = Get-ChildItem "$Root\apps\api\migrations\clickhouse\*.sql" -ErrorAction SilentlyContinue | Sort-Object Name
if ($chMigrations) {
    foreach ($m in $chMigrations) {
        Write-Host "  [CH] $($m.Name)..." -ForegroundColor Yellow -NoNewline

        $output = Get-Content $m.FullName -Raw | docker exec -i netguard-clickhouse clickhouse-client --multiquery 2>&1 | Out-String

        if ($LASTEXITCODE -eq 0) {
            Write-Host " OK" -ForegroundColor Green
        } else {
            Write-Host " FAIL (exit $LASTEXITCODE)" -ForegroundColor Red
            Write-Host "       $output" -ForegroundColor DarkRed
            $failed++
        }
    }
}

Write-Host ""
if ($failed -eq 0) {
    Write-Host "=== SELESAI - SEMUA OK ===" -ForegroundColor Green
} else {
    Write-Host "=== SELESAI - $failed GAGAL ===" -ForegroundColor Red
}