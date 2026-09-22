#!/bin/bash
set -e

echo "🎱 Bandaro - Setup inicial"
echo "=========================="

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker no esta corriendo. Inicia Docker Desktop primero."
    exit 1
fi

echo ""
echo "1️⃣  Iniciando PostgreSQL..."
docker compose up -d postgres
sleep 3

echo ""
echo "2️⃣  Esperando a que PostgreSQL este listo..."
until docker compose exec postgres pg_isready -U bandaro -d bandaro > /dev/null 2>&1; do
    echo "   Esperando..."
    sleep 2
done
echo "   ✅ PostgreSQL listo"

echo ""
echo "3️⃣  Instalando dependencias..."
pnpm install

echo ""
echo "4️⃣  Generando migraciones Drizzle..."
cd backend
pnpm db:generate 2>/dev/null || true

echo ""
echo "5️⃣  Aplicando migraciones a la base de datos..."
pnpm db:push

echo ""
echo "6️⃣  Iniciando Backend..."
pnpm dev &
BACKEND_PID=$!
sleep 3

echo ""
echo "=========================="
echo "✅ Todo listo!"
echo ""
echo "📡 Backend API:  http://localhost:8181"
echo "🗄️  PostgreSQL:   localhost:5432"
echo ""
echo "Para iniciar la app web:"
echo "   pnpm dev:web"
echo ""
echo "Para ver la base de datos:"
echo "   cd backend && pnpm db:studio"
echo ""
echo "Presiona Ctrl+C para detener todo"
echo "=========================="

# Wait for backend
wait $BACKEND_PID
