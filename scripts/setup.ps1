<#
.SYNOPSIS
    One-shot setup untuk project NetGuard.
.DESCRIPTION
    - Cek prerequisite (Go, Node, pnpm, Docker, Git)
    - Copy .env.example ke .env
    - Install Go dependencies (go mod download)
    - Install Node dependencies (pnpm install)
    - Git init + first commit (jika belum)
    - Start docker-compose (ClickHouse, VM, PostgreSQL, NATS, Grafana)
    - Tunggu service ready (health check)
    - Print next steps
.EXAMPLE
    .\scripts\setup.ps1
    .\scripts\setup.ps1 -SkipDocker -SkipGit
#>

param(
    [switch]$SkipDocker = $false,
    [switch]$SkipGit = $false,
    [switch]$SkipDeps = $false
)

$ErrorActionPreference = "Stop"

# ============ HELPER ============
function Write-Header {
    param([string]$Text)
    Write-Host ""
    Write-Host "===========================================" -ForegroundColor Cyan
    Write-Host "  $Text" -ForegroundColor Cyan
    Write-Host "===========================================" -ForegroundColor Cyan
}

function Write-Step {
    param([string]$Text)
    Write-Host "  -> $Text" -ForegroundColor Yellow
}

function Write-Ok {
    param([string]$Text)
    Write-Host "  [OK]   $Text" -ForegroundColor Green
}

function Write-Err {
    param([string]$Text)
    Write-Host "  [ERR]  $Text" -ForegroundColor Red
}

function Write-Warn {
    param([string]$Text)
    Write-Host "  [WARN] $Text" -ForegroundColor Yellow
}

function Test-Command {
    param([string]$Cmd)
    $null = Get-Command $Cmd -ErrorAction SilentlyContinue
    return $?
}

# ============ START ============
$startTime = Get-Date
$Root = Split-Path -Parent $PSScriptRoot
Set-Location $Root

Write-Header "NetGuard Setup"
Write-Host "  Root: $Root" -ForegroundColor Gray

# =============================================
Write-Header "1. Prerequisites Check"
# =============================================

# Pakai $null (bukan null) untuk value kosong
$prereqs = @(
    [PSCustomObject]@{ Name = "go"; Cmd = "go"; Install = "https://go.dev/dl/" },
    [PSCustomObject]@{ Name = "node"; Cmd = "node"; Install = "https://nodejs.org/" },
    [PSCustomObject]@{ Name = "pnpm"; Cmd = "pnpm"; Install = "npm install -g pnpm" },
    [PSCustomObject]@{ Name = "docker"; Cmd = "docker"; Install = "https://www.docker.com/products/docker-desktop/" },
    [PSCustomObject]@{ Name = "git"; Cmd = "git"; Install = "https://git-scm.com/" }
)

$missing = @()
foreach ($p in $prereqs) {
    if (Test-Command $p.Cmd) {
        Write-Ok "$($p.Name) ditemukan"
    }
    else {
        Write-Err "$($p.Name) TIDAK ditemukan"
        Write-Host "         Install: $($p.Install)" -ForegroundColor Gray
        $missing += $p.Name
    }
}

if ($missing.Count -gt 0) {
    Write-Host ""
    Write-Err "Prerequisite belum lengkap. Install dulu, lalu jalankan ulang:"
    Write-Host "         $($missing -join ', ')" -ForegroundColor Red
    exit 1
}

# Cek Docker daemon running
if (-not $SkipDocker) {
    Write-Step "Cek Docker daemon..."
    try {
        $null = docker info 2>&1
        if ($LASTEXITCODE -ne 0) { throw "Docker daemon tidak running" }
        Write-Ok "Docker daemon running"
    }
    catch {
        Write-Err "Docker daemon tidak running. Start Docker Desktop dulu."
        exit 1
    }
}

# =============================================
Write-Header "2. Environment File (.env)"
# =============================================

if (-not (Test-Path ".env")) {
    if (Test-Path ".env.example") {
        Copy-Item ".env.example" ".env"
        Write-Ok ".env dibuat dari .env.example"
    }
    else {
        Write-Warn ".env.example tidak ada, membuat .env minimal"
        $envContent = @"
API_PORT=8080
API_LOG_LEVEL=debug
CLICKHOUSE_HOST=localhost
CLICKHOUSE_PORT=9000
CLICKHOUSE_DB=netguard
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_USER=netguard
POSTGRES_PASSWORD=netguard
POSTGRES_DB=netguard
VM_URL=http://localhost:8428
NATS_URL=nats://localhost:4222
VITE_API_URL=http://localhost:8080
"@
        Set-Content -Path ".env" -Value $envContent -Encoding UTF8
        Write-Ok ".env dibuat"
    }
}
else {
    Write-Ok ".env sudah ada (skip)"
}

# =============================================
Write-Header "3. Install Dependencies"
# =============================================

if (-not $SkipDeps) {
    # --- Go services ---
    $goServices = @("apps\api", "apps\agent", "apps\collector", "apps\engine", "packages\sdk-go")
    foreach ($svc in $goServices) {
        if (Test-Path "$svc\go.mod") {
            Write-Step "go mod download: $svc"
            Push-Location $svc
            try {
                $output = go mod download 2>&1
                if ($LASTEXITCODE -eq 0) {
                    Write-Ok "$svc"
                }
                else {
                    Write-Warn "$svc - mod download gagal (mungkin go.mod belum ada dependency)"
                }
            }
            catch {
                Write-Warn "$svc - $_"
            }
            Pop-Location
        }
        else {
            Write-Warn "$svc - go.mod tidak ada (skip)"
        }
    }

    # --- Web (pnpm) ---
    if (Test-Path "pnpm-workspace.yaml") {
        Write-Step "pnpm install (workspace root)"
        try {
            $null = pnpm install --reporter=silent 2>&1
            if ($LASTEXITCODE -eq 0) {
                Write-Ok "pnpm install"
            }
            else {
                Write-Warn "pnpm install ada warning (cek manual)"
            }
        }
        catch {
            Write-Warn "pnpm install: $_"
        }
    }
    else {
        Write-Warn "pnpm-workspace.yaml tidak ada (skip pnpm)"
    }
}
else {
    Write-Warn "Skip install dependencies (flag -SkipDeps)"
}

# =============================================
Write-Header "4. Git Init"
# =============================================

if (-not $SkipGit) {
    if (Test-Path ".git") {
        Write-Ok "Git repository sudah ada (skip init)"
    }
    else {
        Write-Step "git init..."
        $null = git init 2>&1
        $null = git add . 2>&1
        $null = git commit -m "chore: initial project structure" 2>&1
        if ($LASTEXITCODE -eq 0) {
            Write-Ok "Git initialized + first commit"
        }
        else {
            Write-Warn "Git init selesai, tapi commit gagal (mungkin email/name belum set)"
            Write-Host "         git config user.name `"Your Name`"" -ForegroundColor Gray
            Write-Host "         git config user.email `"you@example.com`"" -ForegroundColor Gray
        }
    }
}
else {
    Write-Warn "Skip git (flag -SkipGit)"
}

# =============================================
Write-Header "5. Docker Compose"
# =============================================

if (-not $SkipDocker) {
    if (Test-Path "docker-compose.yml") {
        Write-Step "docker compose up -d..."
        $prevEAP = $ErrorActionPreference
$ErrorActionPreference = "Continue"
$null = docker compose up -d 2>&1
$dockerExitCode = $LASTEXITCODE
$ErrorActionPreference = $prevEAP
if ($dockerExitCode -ne 0) {
    Write-Err "docker compose up gagal (exit $dockerExitCode)"
    exit 1
}
        if ($LASTEXITCODE -eq 0) {
            Write-Ok "docker compose up"
        }
        else {
            Write-Err "docker compose gagal. Cek log: docker compose logs"
            exit 1
        }

        # --- Wait for services ready ---
        Write-Step "Menunggu service ready..."

        $services = @(
            [PSCustomObject]@{ Name = "ClickHouse"; URL = "http://localhost:8123/ping"; Expect = "Ok."; Retry = 30 },
            [PSCustomObject]@{ Name = "VictoriaMetrics"; URL = "http://localhost:8428/health"; Expect = "OK"; Retry = 15 },
            [PSCustomObject]@{ Name = "PostgreSQL"; Cmd = "docker exec netguard-postgres-1 pg_isready -U netguard"; Retry = 20 },
            [PSCustomObject]@{ Name = "NATS"; URL = "http://localhost:8222/healthz"; Expect = "ok"; Retry = 10 },
            [PSCustomObject]@{ Name = "Grafana"; URL = "http://localhost:3000/api/health"; Expect = "ok"; Retry = 30 }
        )

        foreach ($svc in $services) {
            $ready = $false
            for ($i = 1; $i -le $svc.Retry; $i++) {
                try {
                    if ($svc.URL) {
                        $resp = Invoke-WebRequest -Uri $svc.URL -TimeoutSec 2 -UseBasicParsing -ErrorAction Stop
                        if ($resp.Content -match $svc.Expect) {
                            $ready = $true
                            break
                        }
                    }
                    elseif ($svc.Cmd) {
                        $out = Invoke-Expression $svc.Cmd 2>&1
                        if ($LASTEXITCODE -eq 0) {
                            $ready = $true
                            break
                        }
                    }
                }
                catch {
                    Start-Sleep -Seconds 1
                }
            }
            if ($ready) {
                Write-Ok "$($svc.Name) ready"
            }
            else {
                Write-Warn "$($svc.Name) belum ready setelah $($svc.Retry) detik (cek manual: docker compose logs)"
            }
        }
    }
    else {
        Write-Err "docker-compose.yml tidak ada. Skip Docker."
    }
}
else {
    Write-Warn "Skip docker (flag -SkipDocker)"
}

# =============================================
Write-Header "SELESAI"
# =============================================

$duration = (Get-Date) - $startTime

Write-Host ""
Write-Host "  Waktu setup: $($duration.TotalSeconds.ToString('0.0')) detik" -ForegroundColor Green
Write-Host ""
Write-Host "  Service URLs:" -ForegroundColor Cyan
Write-Host "    API        : http://localhost:8080" -ForegroundColor White
Write-Host "    Web        : http://localhost:5173" -ForegroundColor White
Write-Host "    ClickHouse : http://localhost:8123" -ForegroundColor White
Write-Host "    VictoriaM. : http://localhost:8428" -ForegroundColor White
Write-Host "    Grafana    : http://localhost:3000  (admin/admin)" -ForegroundColor White
Write-Host "    NATS Monit.: http://localhost:8222" -ForegroundColor White
Write-Host ""
Write-Host "  Langkah berikutnya:" -ForegroundColor Yellow
Write-Host "    .\scripts\dev.ps1        # start API + Web" -ForegroundColor White
Write-Host "    .\scripts\stop.ps1       # stop semua" -ForegroundColor White
Write-Host ""