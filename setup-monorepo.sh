#!/bin/bash
# Setup script for Bandaro Monorepo
# Run: chmod +x setup-monorepo.sh && ./setup-monorepo.sh

set -e

echo "Setting up Bandaro monorepo..."

echo "Creating directory structure..."
mkdir -p bandaro
cd bandaro

echo "Initializing pnpm workspace..."
cat > pnpm-workspace.yaml << 'EOF'
packages:
  - 'apps/*'
  - 'packages/*'
  - 'backend'
EOF

echo "Creating root package.json..."
cat > package.json << 'EOF'
{
  "name": "bandaro",
  "version": "1.0.0",
  "private": true,
  "workspaces": [
    "apps/*",
    "packages/*",
    "backend"
  ],
  "scripts": {
    "dev": "turbo run dev",
    "dev:mobile": "turbo run dev --filter=@bandaro/mobile",
    "dev:web": "turbo run dev --filter=@bandaro/mobile -- --web",
    "dev:api": "turbo run dev --filter=@bandaro/backend",
    "build": "turbo run build",
    "build:mobile": "turbo run build --filter=@bandaro/mobile",
    "build:web": "turbo run build:web --filter=@bandaro/mobile",
    "lint": "turbo run lint",
    "type-check": "turbo run type-check",
    "test": "turbo run test",
    "clean": "turbo run clean && rm -rf node_modules",
    "format": "prettier --write \"**/*.{ts,tsx,js,jsx,json,md}\""
  },
  "devDependencies": {
    "@turbo/gen": "^2.3.3",
    "turbo": "^2.3.3",
    "prettier": "^3.4.2",
    "typescript": "^5.6.3"
  },
  "engines": {
    "node": ">=20.0.0",
    "pnpm": ">=9.0.0"
  },
  "packageManager": "pnpm@9.15.0"
}
EOF

echo "Creating Turborepo config..."
cat > turbo.json << 'EOF'
{
  "$schema": "https://turbo.build/schema.json",
  "globalDependencies": ["**/.env.*local"],
  "pipeline": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": ["dist/**", ".expo/**", "web-build/**"]
    },
    "build:web": {
      "dependsOn": ["^build"],
      "outputs": ["web-build/**"]
    },
    "dev": {
      "cache": false,
      "persistent": true
    },
    "lint": {
      "dependsOn": ["^lint"]
    },
    "type-check": {
      "dependsOn": ["^type-check"]
    },
    "test": {
      "dependsOn": ["^build"],
      "outputs": ["coverage/**"]
    },
    "clean": {
      "cache": false
    }
  }
}
EOF

echo "Creating .gitignore..."
cat > .gitignore << 'EOF'
# Dependencies
node_modules/
.pnp
.pnp.js

# Expo
.expo/
.expo-shared/
dist/
web-build/

# Next.js
.next/
out/

# Production
build/
*.log

# Environment
.env*.local
.env

# IDE
.vscode/
.idea/
*.swp
*.swo
*~

# OS
.DS_Store
Thumbs.db

# Turbo
.turbo/

# Python
__pycache__/
*.py[cod]
*$py.class
.Python
venv/
.pytest_cache/

# Misc
*.pem
.vercel
EOF

echo "Creating .prettierrc..."
cat > .prettierrc << 'EOF'
{
  "semi": true,
  "trailingComma": "es5",
  "singleQuote": true,
  "printWidth": 100,
  "tabWidth": 2,
  "useTabs": false
}
EOF

echo "Creating environment template..."
cat > .env.example << 'EOF'
# API Configuration
API_URL=http://localhost:8000
EXPO_PUBLIC_API_URL=http://localhost:8000

# Supabase
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_ANON_KEY=your-anon-key
EXPO_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key

# Backend
DATABASE_URL=postgresql://user:password@localhost:5432/bandaro
REDIS_URL=redis://localhost:6379

# Development
NODE_ENV=development
EOF

echo "Creating README..."
cat > README.md << 'EOF'
# Bandaro

Sistema de entrenamiento para billar a tres bandas.

## Project structure

bandaro/
  apps/
    mobile/
  packages/
    core/
    ui/
    config/
  backend/
  docs/

## Quick start

1. npm install -g pnpm
2. pnpm install
3. pnpm dev

## Useful commands

- pnpm dev
- pnpm dev:mobile
- pnpm dev:web
- pnpm dev:api
- pnpm build
- pnpm test
- pnpm lint
- pnpm type-check

EOF

echo "Monorepo structure created."
echo "Next steps:"
echo "1. cd bandaro"
echo "2. pnpm install"
echo "3. Continue with app creation"
