# Bandaro (Expo + Clean Architecture)

Aplicacion movil para registrar partidas de billar a 3 bandas y evaluar el rendimiento por partida.

## Stack

- React Native + Expo
- TypeScript
- Expo Router
- AsyncStorage (persistencia local)
- Clean Architecture por capas

## Estructura

- `src/domain`: entidades, value objects, contratos
- `src/application`: casos de uso y DTOs
- `src/infrastructure`: repositorio local + mappers
- `src/presentation`: hooks, componentes, screens
- `app`: rutas con Expo Router

## Reglas implementadas

- Promedio general: total carambolas / total entradas
- Promedio por jugador (A/B)
- Serie mayor por jugador y global
- Distancia de partida validada entre 5 y 60
- Shot clock visual de 40 segundos

## Ejecutar local

1. `npm install`
2. `npm run android` (o `npm run web`)

## Generar APK instalable (Android)

### Requisitos

1. Tener cuenta Expo (gratis): https://expo.dev/signup
2. Instalar EAS CLI:
   - `npm install -g eas-cli`
3. Login:
   - `eas login`

### Build APK

1. Desde la carpeta del proyecto:
   - `cd bandaro-monorepo`
2. Configurar proyecto EAS (primera vez):
   - `eas build:configure`
3. Generar APK:
   - `eas build --platform android --profile preview`
4. Al finalizar, Expo te entrega un enlace para descargar el APK en tu celular.

## Notas importantes

- Este entorno tiene Node `20.12.0`; Expo 55 recomienda Node `>=20.19.4`.
- Para evitar errores en build, actualiza Node a la version recomendada.
