<#
.SYNOPSIS
    Seed development data (mock devices, alerts, logs).
#>
$ErrorActionPreference = "Stop"

Write-Host ""
Write-Host "Seeding dev data..." -ForegroundColor Cyan
Write-Host ""

# --- Devices (PostgreSQL) ---
$devices = @"
INSERT INTO devices (name, ip, type, site, status) VALUES
  ('sw-core-01',   '10.0.0.1',   'switch', 'DC-1', 'up'),
  ('sw-core-02',   '10.0.0.2',   'switch', 'DC-1', 'up'),
  ('router-edge',  '10.0.0.254', 'router', 'DC-1', 'up'),
  ('fw-perimeter', '10.0.0.253', 'firewall', 'DC-1', 'up'),
  ('sw-access-03', '10.0.1.3',   'switch', 'HQ',   'down'),
  ('ap-lobby',     '10.0.2.10',  'ap',     'HQ',   'warning'),
  ('srv-db',       '10.0.5.20',  'server', 'DC-1', 'up')
ON CONFLICT (ip) DO NOTHING;
"@

Write-Host "  -> Insert devices..." -ForegroundColor Yellow
$devices | docker exec -i netguard-postgres-1 psql -U netguard -d netguard
if ($LASTEXITCODE -eq 0) {
    Write-Host "  [OK] Devices seeded" -ForegroundColor Green
}
else {
    Write-Host "  [WARN] Devices seed gagal (mungkin tabel belum ada, jalankan 'make migrate')" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "Done." -ForegroundColor Cyan