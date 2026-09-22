FROM node:20-alpine

WORKDIR /app

RUN corepack enable && corepack prepare pnpm@10.32.1 --activate

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json tsconfig.base.json ./
COPY apps/mobile/package.json ./apps/mobile/
COPY packages/core/package.json ./packages/core/
COPY packages/ui/package.json ./packages/ui/
COPY packages/config/package.json ./packages/config/
COPY backend/package.json ./backend/

RUN pnpm install --frozen-lockfile

COPY apps/mobile/tsconfig.json ./apps/mobile/
COPY packages/core/tsconfig.json ./packages/core/
COPY packages/ui/tsconfig.json ./packages/ui/
COPY packages/config/tailwind.config.js ./packages/config/
COPY backend/tsconfig.json ./backend/
COPY backend/drizzle.config.ts ./backend/
COPY backend/src ./backend/src
COPY packages/core/src ./packages/core/src
COPY packages/ui/src ./packages/ui/src

WORKDIR /app/backend

EXPOSE 8181

CMD ["pnpm", "dev"]
