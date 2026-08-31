# joinly · app móvil

App Expo / React Native / TypeScript del piloto. Consume la API del backend
(`../backend`). Plan y decisiones en `../docs/18-implementacion-frontend-movil.md`.

## Requisitos

- Node 22 LTS (hay `.nvmrc`; `nvm use`).
- Backend en marcha: `docker compose up -d` en la raíz del repo.
- Emulador Android en marcha (`emulator -avd joinly_pixel7_api35`) o dispositivo
  por USB con `adb reverse tcp:8080 tcp:8080`.
- Para compilar el APK: JDK 17 (`jdk17` es un alias en `~/.zshrc`).

## Configuración

```
cp .env.example .env
# completa EXPO_PUBLIC_SUPABASE_ANON_KEY
```

La app no arranca si falta alguna variable (`src/config/env.ts`). El emulador
alcanza el backend del host por `10.0.2.2`.

## Comandos

| Comando             | Efecto                                                   |
| ------------------- | -------------------------------------------------------- |
| `npm run android`   | Metro + abre la app en el emulador/dispositivo (Expo Go) |
| `npm start`         | Metro; elige plataforma desde la CLI                     |
| `npm run typecheck` | `tsc --noEmit`                                           |
| `npm run lint`      | ESLint (config de Expo + Prettier)                       |
| `npm run format`    | Prettier `--write`                                       |
| `npm run gen:api`   | Regenera `src/api/schema.ts` desde `../openapi.yaml`     |

## Estructura

```
src/
  app/            rutas de Expo Router
    (auth)/       sign-in y flujo de acceso
    (app)/        pantallas tras iniciar sesión
  api/            cliente fetch, tipos generados, problem+json
  auth/           estado de sesión (zustand)
  config/         lectura y validación de entorno
  i18n/           textos (español)
  lib/            QueryClient y utilidades
  ui/             componentes propios + tokens
```

## Estado

Hito M0 (andamiaje) completo: la app arranca en el emulador, resuelve el
entorno y `GET /me` sin sesión responde 401, mostrado como estado esperado en la
pantalla de acceso. Siguiente: M1 (identidad y perfil con Supabase Auth).
