<#
.SYNOPSIS
    Start semua service development (Docker + API + Web).
.DESCRIPTION
    - Pastikan Docker service running
    - Start API (Go) di background
    - Start Web (Vite) di foreground
    - Ctrl+C untuk stop semua
.EXAMPLE
    .\scripts\dev.ps1
    .\scripts\dev.ps1 -Only web
    .\scripts\dev.ps1 -Only api
#>

param(
    [ValidateSet("all", "web", "api", "docker")]
    [string]$Only = "all"
)

$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent $PSScriptRoot
Set-Location $Root

function Write-Header {
    param([string]$Text)
    Write-Host ""
    Write-Host "===========================================" -ForegroundColor Cyan
    Write-Host "  $Text" -ForegroundColor Cyan
    Write-Host "===========================================" -ForegroundColor Cyan
}

Write-Header "NetGuard Dev"
Write-Host "  Mode: $Only" -ForegroundColor Gray

# --- Docker ---
if ($Only -in @("all", "docker")) {
    Write-Host ""
    Write-Host "  [1/3] Docker services..." -ForegroundColor Yellow
    $null = docker compose up -d 2>&1
    if ($LASTEXITCODE -ne 0) {
        Write-Host "  [ERR] Docker gagal. Cek: docker compose logs" -ForegroundColor Red
        exit 1
    }
    Write-Host "  [OK]  Docker running" -ForegroundColor Green
}

# --- API ---
$apiProcess = $null
if ($Only -in @("all", "api")) {
    Write-Host ""
    Write-Host "  [2/3] Starting API (Go)..." -ForegroundColor Yellow

    if (-not (Test-Path "apps\api\cmd\server\main.go")) {
        Write-Host "  [WARN] apps\api\cmd\server\main.go tidak ada (skip)" -ForegroundColor Yellow
    }
    else {
        $apiProcess = Start-Process -FilePath "go" `
            -ArgumentList "run", "./cmd/server" `
            -WorkingDirectory "$Root\apps\api" `
            -PassThru -NoNewWindow
        Start-Sleep -Seconds 2
        if ($apiProcess.HasExited) {
            Write-Host "  [ERR] API gagal start. Cek error di atas." -ForegroundColor Red
        }
        else {
            Write-Host "  [OK]  API running (PID: $($apiProcess.Id)) -> http://localhost:8080" -ForegroundColor Green
        }
    }
}

# --- Web ---
if ($Only -in @("all", "web")) {
    Write-Host ""
    Write-Host "  [3/3] Starting Web (Vite)..." -ForegroundColor Yellow
    Write-Host "  [INFO] Tekan Ctrl+C untuk stop semua" -ForegroundColor Cyan
    Write-Host ""

    try {
        Push-Location "$Root\apps\web"
        pnpm dev
    }
    finally {
        Pop-Location
    }
}

# --- Cleanup ---
if ($apiProcess -and -not $apiProcess.HasExited) {
    Write-Host ""
    Write-Host "  Stopping API..." -ForegroundColor Yellow
    Stop-Process -Id $apiProcess.Id -Force -ErrorAction SilentlyContinue
    Write-Host "  [OK] API stopped" -ForegroundColor Green
}

Write-Host ""
Write-Host "  Selesai." -ForegroundColor Cyan