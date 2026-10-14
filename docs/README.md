# 🎱 Bandaro — Documentación Técnica y Guía de Incorporación (Onboarding)

Bienvenido a la documentación oficial del repositorio **Bandaro**. Este compendio está diseñado para que cualquier nuevo desarrollador de software, científico de datos o especialista en diseño pueda comprender de inmediato la arquitectura, el modelo de datos, la física y las reglas de negocio de la plataforma.

---

## 📚 Índice de la Documentación

| Documento | Descripción |
|---|---|
| [**ARCHITECTURE.md**](file:///c:/Projects/React/Billard-app/bandaro-monorepo/docs/ARCHITECTURE.md) | **Arquitectura Global del Sistema**: Diagramas de capas Mermaid, grafo de dependencias de paquetes, pipeline de visión por computadora y sintetizador de audio procedural. |
| [**DATABASE_SCHEMA.md**](file:///c:/Projects/React/Billard-app/bandaro-monorepo/docs/DATABASE_SCHEMA.md) | **Estructura de Base de Datos y Modelo ER**: Diagrama Entidad-Relación interactivo, diccionario exhaustivo de tablas, tipos de datos, índices y relaciones con Drizzle ORM y PostgreSQL. |
| [**BUSINESS_RULES.md**](file:///c:/Projects/React/Billard-app/bandaro-monorepo/docs/BUSINESS_RULES.md) | **Reglas de Negocio y Dominio**: Reglamento oficial UMB de 3 bandas, validación de carambolas válidas, retruques, taxonomía de jugadas, pedagogía Quetglas y parámetros de mesa canónica. |
| [**physics_and_guides.md**](file:///c:/Projects/React/Billard-app/bandaro-monorepo/docs/physics_and_guides.md) | **Calibración Física y Guías Vectoriales**: Mapeo 1:1 de efectos (reloj a cartesiano), potencia en Largos de Mesa, validación cinemática y sistema de doble guía de tiro Photoshop-style. |
| [**theory/**](file:///c:/Projects/React/Billard-app/bandaro-monorepo/docs/theory) | **Tratados Teóricos y Biomecánica**: Cuaderno Maestro de Billar a Tres Bandas y Fundamentos Biomecánicos de José María Quetglas. |

---

## ⚡ Guía de Inicio Rápido (Quickstart)

### 1. Requisitos Previos
* **Node.js:** Versión 20.x o superior.
* **Gestor de Paquetes:** `pnpm` (versión 9.x o superior).
* **Base de Datos:** PostgreSQL 16 (local vía Docker o remoto en Neon).
* **Python (Opcional para Visión por Computadora):** Python 3.10+ con librerías `opencv-python` y `numpy`.

### 2. Instalación de Dependencias
Ejecuta en la raíz del repositorio:
```bash
pnpm install
```

### 3. Configuración de Variables de Entorno
Copia el archivo de ejemplo en el backend:
```bash
cp .env.example backend/.env
```
Asegúrate de configurar la cadena de conexión de base de datos en `backend/.env`:
```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/bandaro_db"
JWT_SECRET="super-secret-jwt-key"
JWT_REFRESH_SECRET="super-secret-refresh-key"
PORT=3000
```

### 4. Inicialización y Semillado de la Base de Datos
Crea las tablas en PostgreSQL e inserta los niveles de Quetglas, sistemas de billar y carambolas maestras:
```bash
# Empujar el esquema a la base de datos
pnpm --filter @bandaro/backend db:push

# Poblar con datos iniciales (niveles, sistemas, 180+ carambolas trilingües)
pnpm --filter @bandaro/backend db:seed
```

### 5. Ejecución del Entorno de Desarrollo
Para levantar los servicios en simultáneo o de forma independiente:

```bash
# Iniciar ambos (Backend API en puerto 3000 + Mobile Web en puerto 8081)
pnpm dev

# O iniciar individualmente:
pnpm dev:api   # Levanta el backend Express en http://localhost:3000
pnpm dev:web   # Levanta la app Expo en Web en http://localhost:8081
```

---

## 🧩 Estructura del Monorepo

```
bandaro-monorepo/
├── apps/
│   └── mobile/                   # App móvil multiplataforma (iOS, Android, Web)
│       ├── src/
│       │   ├── app/              # Enrutador basado en archivos (Expo Router)
│       │   └── presentation/     # UI, pantallas, componentes táctiles y audio
│       └── package.json
├── packages/
│   ├── core/                     # Lógica de dominio pura, física y reglas UMB
│   │   ├── src/physics/          # Integrador de física, colisiones y trayectorias
│   │   ├── src/rules/            # Reglas UMB, clasificación de tiros y retruques
│   │   └── package.json
│   └── ui/                       # Tokens compartidos y componentes gráficos base
├── backend/                      # Servidor Express.js + Drizzle ORM
│   ├── src/
│   │   ├── db/                   # Esquema Drizzle y scripts de migración/seed
│   │   ├── routes/               # Endpoints REST (auth, shots, training, vision)
│   │   └── python/               # Detección OpenCV y rectificación homográfica
│   └── package.json
├── docs/                         # Documentación técnica completa y teoría
├── package.json                  # Scripts de orquestación raíz Turborepo
└── pnpm-workspace.yaml           # Configuración de espacios de trabajo
```

---

## 🧪 Pruebas Automatizadas

El motor de física y las reglas de negocio cuentan con una suite de pruebas unitarias de regresión para garantizar la consistencia cuadro a cuadro:
```bash
# Ejecutar pruebas unitarias de física y reglas UMB
pnpm --filter @bandaro/core test
```

---

## 🤝 Flujo de Contribución y Buenas Prácticas
1. **Regla de Oro en `packages/core`:** No agregues dependencias de React, DOM ni librerías de plataforma. Debe permanecer como código puro TypeScript ejecutable en cualquier runtime.
2. **Compatibilidad Web y Móvil:** Al editar componentes en `apps/mobile`, asegúrate de que los eventos de arrastre no dependan exclusivamente de eventos táctiles nativos; utiliza eventos de puntero (`onPointerDown`, `onPointerMove`, `onPointerUp`) en Web para evitar fallos del responder.
3. **Commits Convencionales:** Sigue la especificación de *Conventional Commits* (`feat:`, `fix:`, `docs:`, `refactor:`).
