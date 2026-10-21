<#
.SYNOPSIS
    Stop semua service NetGuard (Docker + proses lokal).
.EXAMPLE
    .\scripts\stop.ps1
    .\scripts\stop.ps1 -RemoveVolumes
#>

param(
    [switch]$RemoveVolumes = $false
)

$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent $PSScriptRoot
Set-Location $Root

Write-Host ""
Write-Host "Stopping NetGuard services..." -ForegroundColor Cyan
Write-Host ""

# Stop Docker
Write-Host "  [1/2] Docker compose down..." -ForegroundColor Yellow
if ($RemoveVolumes) {
    $null = docker compose down -v 2>&1
    Write-Host "  [OK] Docker stopped + volumes removed" -ForegroundColor Green
}
else {
    $null = docker compose down 2>&1
    Write-Host "  [OK] Docker stopped (data retained)" -ForegroundColor Green
}

# Kill go run processes
Write-Host "  [2/2] Kill go run processes..." -ForegroundColor Yellow
$goProcs = Get-Process -Name "go", "main" -ErrorAction SilentlyContinue
if ($goProcs) {
    $goProcs | Stop-Process -Force -ErrorAction SilentlyContinue
    Write-Host "  [OK] Killed $($goProcs.Count) process" -ForegroundColor Green
}
else {
    Write-Host "  [OK] Tidak ada go run process" -ForegroundColor Green
}

Write-Host ""
Write-Host "  Semua service stopped." -ForegroundColor Cyan
Write-Host ""