<#
.SYNOPSIS
    Seed development data.
#>
$ErrorActionPreference = "Continue"
$Root = Split-Path -Parent $PSScriptRoot
Set-Location $Root

Write-Host ""
Write-Host "=== SEED DATA ===" -ForegroundColor Cyan
Write-Host ""

# --- Devices (PostgreSQL) ---
Write-Host "  [PG] Devices..." -ForegroundColor Yellow -NoNewline
$devicesSql = @"
INSERT INTO devices (name, ip, type, site, status, cpu, memory, uptime, last_seen) VALUES
  ('sw-core-01',   '10.0.0.1',   'switch',   'DC-1', 'up',      23, 41, '45d 12h', '10:42'),
  ('sw-core-02',   '10.0.0.2',   'switch',   'DC-1', 'up',      19, 38, '45d 12h', '10:42'),
  ('router-edge',  '10.0.0.254', 'router',   'DC-1', 'up',      67, 72, '12d 3h',  '10:42'),
  ('fw-perimeter', '10.0.0.253', 'firewall', 'DC-1', 'up',      45, 55, '30d 8h',  '10:42'),
  ('sw-access-03', '10.0.1.3',   'switch',   'HQ',   'down',    0,  0,  '-',       '2h ago'),
  ('ap-lobby',     '10.0.2.10',  'ap',       'HQ',   'warning', 88, 91, '2d 1h',   '10:42'),
  ('srv-db',       '10.0.5.20',  'server',   'DC-1', 'up',      34, 61, '8d 4h',   '10:42')
ON CONFLICT (ip) DO UPDATE SET
  status = EXCLUDED.status,
  cpu = EXCLUDED.cpu,
  memory = EXCLUDED.memory,
  uptime = EXCLUDED.uptime,
  last_seen = EXCLUDED.last_seen,
  updated_at = NOW();
"@
$out = $devicesSql | docker exec -i netguard-postgres psql -U netguard -d netguard 2>&1 | Out-String
if ($LASTEXITCODE -eq 0) { Write-Host " OK" -ForegroundColor Green }
else { Write-Host " FAIL" -ForegroundColor Red; Write-Host $out -ForegroundColor DarkRed }

# --- Alerts (PostgreSQL) ---
Write-Host "  [PG] Alerts..." -ForegroundColor Yellow -NoNewline
$alertsSql = @"
INSERT INTO alerts (id, severity, title, description, source, status, created_at) VALUES
  ('A-8842', 'critical', 'Brute Force + Anomaly Traffic', 'Terdeteksi 47 auth_failure dalam 5 menit', '192.168.1.45', 'open', NOW() - INTERVAL '2 minutes'),
  ('A-8841', 'critical', 'Malware Hash Detected', 'File /tmp/.x8f2 cocok dengan signature malware', 'srv-db', 'open', NOW() - INTERVAL '8 minutes'),
  ('A-8840', 'warning', 'Interface Down + Log Error', 'Gi0/2 down di sw-core-01', 'sw-core-01', 'open', NOW() - INTERVAL '5 minutes'),
  ('A-8839', 'info', 'Config Change Detected', 'Konfigurasi router-edge berubah oleh admin', 'router-edge', 'acked', NOW() - INTERVAL '12 minutes')
ON CONFLICT (id) DO NOTHING;
"@
$out = $alertsSql | docker exec -i netguard-postgres psql -U netguard -d netguard 2>&1 | Out-String
if ($LASTEXITCODE -eq 0) { Write-Host " OK" -ForegroundColor Green }
else { Write-Host " FAIL" -ForegroundColor Red; Write-Host $out -ForegroundColor DarkRed }

# --- Logs (ClickHouse) ---
Write-Host "  [CH] Logs..." -ForegroundColor Yellow -NoNewline
$logsSql = @"
INSERT INTO netguard.logs (level, type, source, message) VALUES
  ('critical', 'auth_failure',   '192.168.1.45', 'user=admin method=ssh reason=invalid_password'),
  ('critical', 'auth_failure',   '192.168.1.45', 'user=root method=ssh reason=invalid_password'),
  ('warning',  'interface_down', 'sw-core-01',   'interface=Gi0/2 reason=link_failure'),
  ('info',     'log',            'srv-db',       'service=postgres message=connection pool exhausted'),
  ('info',     'log',            'srv-web',      'service=nginx message=GET /api/health 200'),
  ('warning',  'high_cpu',       'ap-lobby',     'cpu usage 88 percent sustained');
"@
$out = $logsSql | docker exec -i netguard-clickhouse clickhouse-client --multiquery 2>&1 | Out-String
if ($LASTEXITCODE -eq 0) { Write-Host " OK" -ForegroundColor Green }
else { Write-Host " FAIL" -ForegroundColor Red; Write-Host $out -ForegroundColor DarkRed }

# --- Metrics (ClickHouse) ---
Write-Host "  [CH] Metrics..." -ForegroundColor Yellow -NoNewline
$metricsSql = @"
INSERT INTO netguard.metrics (metric_name, timestamp, value)
SELECT 'traffic_in', now() - INTERVAL (24 - number) HOUR, 1000 + rand() % 5000
FROM numbers(24);
"@
$out = $metricsSql | docker exec -i netguard-clickhouse clickhouse-client --multiquery 2>&1 | Out-String
if ($LASTEXITCODE -eq 0) { Write-Host " OK" -ForegroundColor Green }
else { Write-Host " FAIL" -ForegroundColor Red; Write-Host $out -ForegroundColor DarkRed }

# --- Verifikasi ---
Write-Host ""
Write-Host "=== VERIFIKASI ===" -ForegroundColor Cyan
$deviceCount = (docker exec netguard-postgres psql -U netguard -d netguard -t -c "SELECT COUNT(*) FROM devices;" 2>&1 | Out-String).Trim()
$alertCount = (docker exec netguard-postgres psql -U netguard -d netguard -t -c "SELECT COUNT(*) FROM alerts;" 2>&1 | Out-String).Trim()
$logCount = (docker exec netguard-clickhouse clickhouse-client --query "SELECT COUNT(*) FROM netguard.logs" 2>&1 | Out-String).Trim()
$metricCount = (docker exec netguard-clickhouse clickhouse-client --query "SELECT COUNT(*) FROM netguard.metrics" 2>&1 | Out-String).Trim()

Write-Host "  Devices : $deviceCount" -ForegroundColor Green
Write-Host "  Alerts  : $alertCount" -ForegroundColor Green
Write-Host "  Logs    : $logCount" -ForegroundColor Green
Write-Host "  Metrics : $metricCount" -ForegroundColor Green

Write-Host ""
Write-Host "=== DONE ===" -ForegroundColor Cyan