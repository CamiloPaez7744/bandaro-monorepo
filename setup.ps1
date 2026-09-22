# Bandaro - Setup inicial (Windows PowerShell)
$ErrorActionPreference = "Stop"

Write-Host "🎱 Bandaro - Setup inicial" -ForegroundColor Cyan
Write-Host "==========================" -ForegroundColor Cyan

# Check if Docker is running
try {
    docker info 2>&1 | Out-Null
    if ($LASTEXITCODE -ne 0) { throw }
} catch {
    Write-Host "❌ Docker no esta corriendo. Inicia Docker Desktop primero." -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "1️⃣  Iniciando PostgreSQL..." -ForegroundColor Yellow
docker compose up -d postgres
Start-Sleep -Seconds 3

Write-Host ""
Write-Host "2️⃣  Esperando a que PostgreSQL este listo..." -ForegroundColor Yellow
$ready = $false
for ($i = 0; $i -lt 15; $i++) {
    docker compose exec postgres pg_isready -U bandaro -d bandaro 2>&1 | Out-Null
    if ($LASTEXITCODE -eq 0) {
        $ready = $true
        break
    }
    Write-Host "   Esperando..."
    Start-Sleep -Seconds 2
}

if (-not $ready) {
    Write-Host "❌ PostgreSQL no pudo iniciarse." -ForegroundColor Red
    exit 1
}
Write-Host "   ✅ PostgreSQL listo" -ForegroundColor Green

Write-Host ""
Write-Host "3️⃣  Instalando dependencias..." -ForegroundColor Yellow
pnpm install

Write-Host ""
Write-Host "4️⃣  Generando migraciones Drizzle..." -ForegroundColor Yellow
Set-Location backend
try { pnpm db:generate 2>$null } catch { }
Set-Location ..

Write-Host ""
Write-Host "5️⃣  Aplicando migraciones a la base de datos..." -ForegroundColor Yellow
Set-Location backend
pnpm db:push
Set-Location ..

Write-Host ""
Write-Host "==========================" -ForegroundColor Cyan
Write-Host "✅ Todo listo!" -ForegroundColor Green
Write-Host ""
Write-Host "📡 Backend API:  http://localhost:8181" -ForegroundColor White
Write-Host "🗄️  PostgreSQL:   localhost:5432" -ForegroundColor White
Write-Host ""
Write-Host "Para iniciar el backend:" -ForegroundColor White
Write-Host "   pnpm dev:api" -ForegroundColor Yellow
Write-Host ""
Write-Host "Para iniciar la app web:" -ForegroundColor White
Write-Host "   pnpm dev:web" -ForegroundColor Yellow
Write-Host ""
Write-Host "Para ver la base de datos:" -ForegroundColor White
Write-Host "   cd backend && pnpm db:studio" -ForegroundColor Yellow
Write-Host "==========================" -ForegroundColor Cyan
