# Test API endpoints (PowerShell)

Write-Host "🧪 Testing API..." -ForegroundColor Cyan
Write-Host ""

# Health check
Write-Host "1️⃣ Health Check:" -ForegroundColor Yellow
Invoke-RestMethod -Uri "http://localhost:3000/health" | ConvertTo-Json
Write-Host ""

# Servers
Write-Host "2️⃣ Servers (first 3):" -ForegroundColor Yellow
$servers = Invoke-RestMethod -Uri "http://localhost:3000/api/servers?limit=3"
$servers.data | Select-Object -First 3 | Format-Table Name, Players, ModCount
Write-Host ""

# Popular mods
Write-Host "3️⃣ Popular Mods (first 5):" -ForegroundColor Yellow
$mods = Invoke-RestMethod -Uri "http://localhost:3000/api/mods?limit=5"
$mods.data | Select-Object -First 5 | Format-Table Name, server_count, total_players
Write-Host ""

# Stats
Write-Host "4️⃣ Database Stats:" -ForegroundColor Yellow
$servers = Invoke-RestMethod -Uri "http://localhost:3000/api/servers?limit=1"
Write-Host "Servers: $($servers.meta.total)"

$mods = Invoke-RestMethod -Uri "http://localhost:3000/api/mods?limit=1"
Write-Host "Mods: $($mods.meta.total)"
