#!/bin/bash
# Setup script for Bandaro monorepo
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
    "clean": "turbo run clean",
    "format": "prettier --write \"**/*.{ts,tsx,js,jsx,json,md,yml,yaml}\""
  },
  "devDependencies": {
    "@turbo/gen": "^2.3.3",
    "turbo": "^2.3.3",
    "prettier": "^3.4.2",
    "typescript": "~5.9.3"
  },
  "engines": {
    "node": ">=20.0.0",
    "pnpm": ">=9.0.0"
  },
  "packageManager": "pnpm@10.32.1"
}
EOF

echo "Creating Turborepo config..."
cat > turbo.json << 'EOF'
{
  "$schema": "https://turbo.build/schema.json",
  "globalDependencies": ["**/.env.*local"],
  "tasks": {
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

echo "Monorepo structure created."
echo "Next steps:"
echo "1. cd bandaro"
echo "2. pnpm install"
echo "3. Continue with app creation"
