# Implementación del frontend móvil

## Objetivo y alcance

Este documento define cómo se construye la aplicación móvil del piloto: una app
Expo / React Native / TypeScript para Android que consume la API REST ya
implementada y verificada del backend. Corresponde a la parte móvil de la Fase 5
de `docs/16-plan-implementacion-mvp.md`.

Queda **fuera de este documento** el panel de moderación (React + Vite). El panel
depende de los endpoints `/admin/*` y `POST /reports`, que pertenecen a la Fase 4
del backend y todavía no existen; se documentará por separado cuando esa fase se
aborde.

## Estado del que parte

- El contrato versionado `openapi.yaml` y `docs/11-contrato-api.md` están
  aprobados y son la fuente de verdad para tipos, rutas, cabeceras y errores.
- El núcleo del backend (crear, descubrir, participar, invitar, bloquear) está
  implementado y verificado en vivo contra Docker Compose. La app puede
  desarrollarse contra un backend real desde el primer día.
- Autenticación: Supabase Auth (proyecto de desarrollo
  `https://ulxrjlmpzaeouqbjbnjc.supabase.co`) con correo y contraseña y
  validación de correo. El backend valida los JWT y nunca recibe contraseñas.
- No están implementados en el backend: `POST /reports`, `/admin/*` y la entrega
  de notificaciones push (Fase 4). La app deja preparada la pantalla de
  preferencias de notificaciones y el registro de token, pero no cablea la
  recepción hasta que exista el emisor.

## Estado de avance

Fecha de corte: 2026-09-01. El avance se mide por hitos funcionales verificables,
no por numero de archivos, lineas de codigo ni artefactos de diseno.

| Dimension | Avance | Estado |
| --- | --- | --- |
| Andamiaje tecnico M0 | 100% | Expo SDK 57, TypeScript estricto, Router, cliente API, tipos generados, tokens, i18n y herramientas de calidad estan implementados y verificados |
| Contrato visual | 100% | El patron Radar de planes, sus pantallas, estados, tokens y criterios de aceptacion estan fijados en `docs/19-diseno-radar-movil.md` y `mobile/design/radar-prototype.html` |
| Aplicacion movil funcional M0-M6 | ~55% | M0 y M1 completados y verificados en el emulador contra el backend real. M2 (descubrimiento) implementado, pendiente de recorrido manual completo. M3 (crear y gestionar) implementado y verificado a nivel de contrato de API (create 201, `GET /me/events`, `PATCH` con `If-Match` 200, conflicto 412, cancelacion 204). M4 (participar) implementado y verificado contra el backend (union directa/aprobacion/privada, reintento idempotente sin duplicar, aprobar con `If-Match`, abandonar, invitaciones crear/revocar) y con el recorrido union directa → confirmada → ubicacion exacta → abandonar caminado en la app |
| Integracion Supabase real | 100% | El 2026-09-01 se ejecuto el flujo completo en el emulador: registro de una cuenta nueva con Supabase, alta de perfil (`PUT /me`) y entrada al Radar; el perfil persiste (comprobado en la base de datos). El proyecto Supabase de desarrollo tiene la confirmacion por correo desactivada, por lo que el registro devuelve sesion directa; la ruta "cuenta sin verificar no puede continuar" existe en codigo pero no es ejercitable con esa configuracion |
| Flujo central crear, descubrir y participar | ~65% | Crear y gestionar (M3) y participar (M4) implementados y verificados contra el backend; descubrir (M2) implementado y pendiente del recorrido manual |
| Ubicacion en el emulador | Parcial | El manejo en la app se endurecio (`src/lib/location.ts`: cache primero, `getCurrentPositionAsync` con timeout de 15 s y mensajes claros); ya no se cuelga. El emulador `joinly_pixel7_api35` no propaga la posicion via `adb emu geo fix` en la imagen API 35 con Google APIs: hay que fijarla desde Extended Controls → Location del emulador |
| Accesibilidad final y APK | 0% | Corresponden a M6, despues de completar los flujos funcionales |

El porcentaje funcional global sube a **~55%**: dos de siete hitos (M0, M1)
completados y verificados, M3 y M4 implementados y verificados contra el backend
(pendientes del recorrido manual completo de docs/14), y M2 implementado a la
espera de su recorrido. El diseno sigue siendo criterio de implementacion y no
cuenta por si mismo: cada pantalla debe estar en React Native, conectada a sus
endpoints y superar su verificacion para contar como hito terminado.

## Decisiones de implementación

| Área | Decisión | Motivo |
| --- | --- | --- |
| Framework | Expo SDK gestionado (managed), TypeScript en modo `strict` | Flujo Android reproducible sin tocar código nativo salvo en el `prebuild` del APK |
| Navegación | Expo Router (rutas por ficheros) | Estándar actual de Expo; deep links listos para las notificaciones de Fase 4 |
| Estado de servidor | TanStack Query v5 | Caché, reintentos, paginación por cursor y revalidación alineadas con el contrato |
| Estado de aplicación | `zustand` (store mínimo) | Sesión, preferencias de búsqueda y radio; sin Redux |
| Cliente Supabase | `@supabase/supabase-js` con almacenamiento en `expo-secure-store` | Persistencia y refresco de sesión seguros en el dispositivo |
| Formularios | `react-hook-form` + `zod` | Validación declarativa que refleja las reglas del contrato antes de llamar a la API |
| Tipos de API | `openapi-typescript` genera `src/api/schema.d.ts` desde `openapi.yaml` | El contrato del repo dirige los tipos; no se escriben a mano |
| Interfaz | Componentes propios de React Native + `StyleSheet` y una librería atómica interna (`src/ui/`) con tokens | La referencia visual vinculante es `docs/19-diseno-radar-movil.md`; cumple la guía de `AGENTS.md` y el objetivo WCAG 2.1 AA sin dependencia pesada |
| Descubrimiento | Patrón "Radar de planes": radar abstracto de proximidad, filtros temporales y lista de eventos con distancia y zona aproximada textual; **sin mapa** | El radar no representa ni solicita coordenadas exactas y conserva una lista accesible como resultado principal; cero claves de API y cero cuenta de facturación. Un mapa se evalúa tras el piloto |
| i18n | `i18next` + `react-i18next`, español por defecto (`expo-localization` cuando se detecte el idioma del dispositivo) | Requisito no funcional de soporte multiidioma posterior |
| Ubicación | `expo-location`, permiso contextual | Solo se pide al elegir "buscar con mi ubicación"; nunca se guarda historial |
| Fechas | `date-fns` con locale `es` | Formato y cálculo de "empieza en / ha terminado" |
| Pruebas | `jest-expo` + `@testing-library/react-native` + `msw`; recorrido manual Android de `docs/14` | Unitarias y de componente con API simulada; E2E manual en el piloto |
| Calidad | `eslint-config-expo` + Prettier + `tsc --noEmit` + `expo-doctor` | Mismas puertas que el backend, adaptadas |
| Distribución | `expo prebuild` + Gradle local con Android SDK; **sin EAS ni cuenta Expo** | Igual que `docs/09` y `docs/16`: APK de pruebas compilado en el equipo |

## Requisitos del sistema

Estado comprobado en el equipo de desarrollo (macOS, Apple Silicon) y lo que
falta instalar. El backend sigue usando Java dentro de su contenedor; nada de lo
siguiente lo altera.

| Herramienta | Requerido | Estado actual | Acción |
| --- | --- | --- | --- |
| Node.js | 22.x LTS (Expo SDK admite 20.19+ o 22.x) | `v23.7.0` (no LTS) | Instalar `nvm` y fijar Node 22 LTS (`.nvmrc` en `mobile/`) |
| Gestor de paquetes | npm ≥ 10 | `npm 10.9.2` | Ninguna. `pnpm` opcional |
| Watchman | Recomendado para Metro en macOS | No instalado | `brew install watchman` |
| JDK 17 | Para el build Android con Gradle | instalado con `brew install openjdk@17` (fórmula sin sudo, keg-only en `/opt/homebrew/opt/openjdk@17`) | Alias `jdk17` en `~/.zshrc` exporta `JAVA_HOME` solo para el build del APK; el backend conserva la JDK del sistema |
| Android Studio | Sí (SDK + emulador) | No instalado | Instalar Android Studio |
| Android SDK Platform | API 35 (Android 15) | No instalado | Desde Android Studio: SDK Platform 35 |
| Android SDK Build-Tools | 35.x | No instalado | Android Studio |
| Platform-Tools (`adb`) | Sí | No instalado (`adb` ausente) | Android Studio |
| Android Emulator + imagen de sistema | Pixel, API 35, `arm64` | No instalado | Android Studio |
| Command-line Tools (latest) | Sí (para `sdkmanager` y `prebuild`) | No instalado | Android Studio |
| Variables de entorno | `ANDROID_HOME=$HOME/Library/Android/sdk`; `platform-tools` y `emulator` en `PATH` | Sin definir | Añadir al perfil del shell |
| Xcode / CocoaPods | No (iOS diferido) | Ausente | Ninguna |
| Cuenta Expo / EAS | No (build local) | — | Ninguna |
| Espacio en disco | ~15 GB (Studio, SDK, imagen, `node_modules`, cachés de Gradle) | — | Reservar |
| RAM | 16 GB recomendado (emulador + Metro + contenedores del backend) | — | — |

Dispositivo físico como alternativa al emulador: Android con depuración USB
activada y `adb reverse tcp:8080 tcp:8080` para que el dispositivo alcance el
backend del equipo.

## Configuración de entorno y conectividad

La URL base se suministra por configuración y **nunca se codifica** en pantallas
o servicios (`docs/15`).

| Cliente | `EXPO_PUBLIC_API_BASE_URL` |
| --- | --- |
| Emulador Android estándar | `http://10.0.2.2:8080/api/v1` |
| Dispositivo Android por USB | `http://127.0.0.1:8080/api/v1` con `adb reverse` del puerto 8080 |
| Simulador iOS (futuro) | `http://127.0.0.1:8080/api/v1` |

Variables (`mobile/.env`, con plantilla `mobile/.env.example` versionada):

```
EXPO_PUBLIC_API_BASE_URL=http://10.0.2.2:8080/api/v1
EXPO_PUBLIC_SUPABASE_URL=https://ulxrjlmpzaeouqbjbnjc.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=<clave anon/publishable del proyecto de desarrollo>
```

La clave `anon` de Supabase es pública por diseño y puede vivir en `.env`. No se
incluye ninguna clave de servicio ni secreto del backend. No se habilita CORS
permisivo ni se expone la base de datos.

`app.config.ts` lee estas variables mediante `expo-constants`; la app no arranca
si falta alguna.

## Estructura del proyecto

La plantilla de Expo (SDK 57) sitúa las rutas en `src/app/`; todo el código vive
bajo `src/`.

```
mobile/
  src/
    app/                            # rutas de Expo Router
      _layout.tsx                   # providers: SafeArea, Query, i18n, gestos
      index.tsx                     # redirección según sesión
      +not-found.tsx
      (auth)/
        _layout.tsx
        sign-in.tsx                 # M0: acceso + estado del sistema
        (M1) sign-up, agreements, verify-email
      (app)/
        _layout.tsx                 # guard de sesión; (M2) pestañas
        home.tsx                    # (M2) pasa a discover / events / profile
    api/            # client fetch, endpoints tipados, schema.ts generado, problem+json
    auth/           # store de sesión (zustand); (M1) cliente Supabase y hooks
    config/         # lectura y validación de entorno
    i18n/           # textos en español
    lib/            # QueryClient; (M2+) location, idempotency, format
    ui/             # Button, Card, Screen, Text, EmptyState, tokens.ts, theme.ts
    features/       # (M2+) events/, participation/, blocks/, profile/
  assets/
  app.json
  eslint.config.js
  .prettierrc.json  .prettierignore
  package.json  tsconfig.json
  .env.example  .nvmrc
```

Las pruebas se colocan junto al código (`*.test.tsx`).

Dependencias nativas diferidas a su hito para no inflar el andamiaje:
`expo-secure-store`, `@react-native-async-storage/async-storage` y
`@supabase/supabase-js` en M1; `expo-location` en M2; `expo-clipboard` en M4;
`expo-localization`, `expo-notifications` y `expo-device` cuando se necesiten.
Ya instaladas: `@tanstack/react-query`, `zustand`, `zod`, `i18next`,
`react-i18next`, `date-fns`; dev: `openapi-typescript`, `prettier`, `eslint`.

## Capa de API y contrato

- **Tipos**: `npm run gen:api` ejecuta `openapi-typescript ../openapi.yaml -o
  src/api/schema.ts`. Los endpoints tipados de `src/api/` consumen
  `components['schemas'][…]`; cualquier cambio del contrato se propaga
  regenerando.
- **Cliente**: un envoltorio de `fetch` que añade `Authorization: Bearer <jwt>`,
  `Content-Type`, `Accept`, y adjunta `Idempotency-Key` / `If-Match` cuando el
  endpoint lo requiere. La app **no** envía la cabecera `apikey`: esa es solo
  para la llamada interna backend → Supabase.
- **Errores RFC 9457**: `src/lib/problem.ts` interpreta el cuerpo
  `application/problem+json` (`type`, `title`, `detail`, `fields`) y lo traduce a
  mensajes de interfaz: `fields` alimenta errores por campo en los formularios;
  el resto se muestra como aviso. Nunca se muestran `type` ni `detail` crudos si
  hay traducción disponible.
- **ETag / `If-Match`**: las lecturas de evento y perfil guardan el `ETag`
  devuelto. Las ediciones (`PATCH`) lo reenvían en `If-Match`. Un `428
  if_match_required` es un error de programación; un `412 concurrent_update`
  muestra "el recurso cambió mientras editabas" y refresca los datos.
- **`Idempotency-Key`**: `src/lib/idempotency.ts` genera un UUID por intento de
  unión y lo persiste por evento hasta que la unión tiene éxito, de modo que un
  reintento reutiliza la misma clave. Un cuerpo distinto con la misma clave
  produce `409 idempotency_key_conflict`, que se trata como conflicto no
  recuperable y se pide reiniciar la acción.
- **Paginación por cursor**: `useInfiniteQuery` de TanStack Query; el `cursor`
  es opaco y se pasa tal cual. El descubrimiento sin resultados muestra la
  acción "ampliar el radio" (`docs/04`).

## Autenticación y sesión

1. **Registro** (`sign-up`): confirmación de mayoría de edad y aceptación de
   términos, privacidad y normas antes de crear la cuenta en Supabase
   (`docs/04`). Supabase envía el correo de validación.
2. **Verificación de correo** (`verify-email`): la app consulta `GET /me`; el
   backend expone `emailVerified`. Crear eventos y participar exige correo
   verificado y acuerdos aceptados (el backend responde `403` si no).
3. **Alta de perfil**: tras el primer inicio de sesión, `PUT /me` con `alias` y
   las versiones y fechas de aceptación de los tres acuerdos. Las
   actualizaciones posteriores requieren `If-Match`.
4. **Sesión**: `@supabase/supabase-js` con adaptador `expo-secure-store`;
   refresco automático del token. El store `zustand` expone el estado de sesión
   a la navegación (rutas `(auth)` vs `(app)`).
5. **Estado `suspended`**: cualquier respuesta `403` por cuenta suspendida
   cierra la sesión y lleva a una pantalla informativa.
6. **Borrado de cuenta**: `DELETE /me` desde Perfil; la app cierra sesión y
   explica el plazo de supresión (`docs/04`).

## Inventario de pantallas y mapeo a endpoints

| Pantalla | Endpoints | Notas de producto |
| --- | --- | --- |
| Bienvenida / registro / inicio de sesión | Supabase Auth | Aceptación de acuerdos previa a la cuenta |
| Verificar correo | `GET /me` | Bloquea creación y participación hasta verificar |
| Perfil (ver / editar) | `GET /me`, `PUT /me` (`If-Match`), `DELETE /me` | Alias obligatorio; sin foto en el piloto |
| Ajustes · Notificaciones | `PUT /me/push-settings` | Solo preferencias y token; recepción diferida a Fase 4 |
| Ajustes · Normas de convivencia | — (texto local / enlace) | Requisito de `docs/04` |
| Descubrir (Radar de planes + lista) | `POST /events/search` | Radar abstracto de proximidad, ubicación actual (permiso contextual) o zona manual, radio elegible y "ampliar radio" si vacío; sin mapa ni coordenadas exactas |
| Ficha de evento | `GET /events/{eventId}` | Zona aproximada y distancia antes de confirmar; ubicación exacta solo tras confirmar; alias del creador |
| Crear evento | `POST /events` | Categorías fijas, solo futuro, capacidad o sin límite, acceso directo/aprobación/invitación, máx. 3 activos |
| Mis eventos | `GET /me/events` | Creados y participaciones, con estado |
| Editar / cancelar evento | `PATCH /events/{eventId}` (`If-Match`), `POST /events/{eventId}/cancellation` | Campos principales solo antes del inicio; `notes` hasta el fin |
| Unirse a un evento | `POST /events/{eventId}/participations` (`Idempotency-Key`) | Directo → confirmada; aprobación → pendiente; privado → exige `invitationCode` |
| Abandonar | `DELETE /events/{eventId}/participation` | Solo confirmado y antes del inicio; libera plaza |
| Participantes (creador) | `GET /events/{eventId}/participations?status=confirmed\|pending` | Solo el creador ve la lista; `pending` para localizar solicitudes |
| Resolver solicitud (creador) | `PATCH /events/{eventId}/participations/{participationId}` (`If-Match`) | `confirmed` o `rejected`; una rechazada puede volver a solicitar |
| Invitaciones (creador, evento privado) | `POST /events/{eventId}/invitations`, `DELETE .../{invitationId}` | El código en claro se muestra una sola vez; compartir vía `expo-clipboard` |
| Bloqueos | `POST /blocks`, `DELETE /blocks/{blockedUserId}`, `GET /blocks` | Bloquear desde perfil o ficha de evento; recíproco e idempotente |
| Reportar | `POST /reports` | **Diferido**: el endpoint llega en Fase 4. La entrada de UI se añade entonces |

## Reglas de producto que la interfaz debe respetar

- La ubicación exacta no se muestra ni se solicita al backend antes de una
  participación confirmada; en eventos privados, solo a invitados confirmados.
  La app confía en la proyección del backend y no infiere coordenadas.
- El permiso de ubicación se pide solo al elegir "buscar con mi ubicación". No se
  guarda historial; una zona manual solo se persiste si la persona la marca como
  preferencia.
- Los participantes confirmados no ven la lista de asistentes; esa lista es solo
  para el creador.
- Los bloqueos son recíprocos: si el backend devuelve `404`, la app trata el
  recurso como inexistente y no revela el motivo.
- Límites del MVP visibles en la interfaz: solo eventos futuros, máximo tres
  eventos activos por creador, sin lista de espera, y no unirse tras el inicio.
- No se muestran identificadores internos, SQL, motivos de autorización ni datos
  de asistentes fuera de los casos permitidos. No se registran tokens, códigos
  de invitación ni ubicaciones precisas.

## Accesibilidad e internacionalización

- Objetivo WCAG 2.1 AA: contraste suficiente en los tokens de color, texto
  escalable (respeta el tamaño de fuente del sistema), objetivos táctiles de al
  menos 48 × 48 dp, etiquetas y roles para lectores de pantalla, orden de foco
  coherente y respeto de "reducir movimiento".
- Espaciado en incrementos de 4 u 8 dp. Acciones primarias en la zona inferior
  alcanzable con el pulgar. `SafeAreaView` / `react-native-safe-area-context`
  para muescas y barras del sistema.
- Todo el texto visible pasa por `i18next`; español por defecto, claves
  organizadas por dominio para añadir idiomas después sin refactor.

## Notificaciones (alcance de esta fase)

- Pantalla de preferencias con conmutadores por tipo (solicitudes, decisiones,
  cambios y cancelaciones) y registro opcional del `expoPushToken` mediante
  `PUT /me/push-settings`.
- `expo-notifications` y `expo-device` se instalan y se registra el token, pero
  **no se cablean** los handlers de recepción ni los deep links hasta que el
  backend (Fase 4) entregue notificaciones. El correo solo se usa para
  validación de cuenta y recuperación de contraseña.

## Pruebas

- **Unitarias y de componente**: `jest-expo` + `@testing-library/react-native`.
  La API se simula con `msw` usando los tipos generados del contrato, de modo
  que un cambio incompatible de `openapi.yaml` rompe las pruebas.
- **Casos mínimos**: gating de correo verificado y acuerdos; unión directa /
  aprobación / privada y sus errores (`event_full`, `invitation_invalid`,
  `participation_exists`); reintento con la misma `Idempotency-Key`; edición con
  `If-Match` y conflicto `412`; descubrimiento sin resultados y paginación por
  cursor; ocultación por bloqueo (`404`).
- **E2E manual**: recorrido Android de `docs/14-estrategia-pruebas.md` contra el
  backend en Compose, antes del APK.
- **Calidad en cada cambio**: `tsc --noEmit`, `eslint`, `prettier --check`,
  `expo-doctor`. GitHub Actions ejecuta estas validaciones para `mobile/` cuando
  el flujo se active (`docs/09`).

## Hitos

Cada hito deja la app ejecutable en el emulador contra el backend real y aporta
una porción verificable, siguiendo el mismo principio que las fases del backend.

| Hito | Contenido | Verificación |
| --- | --- | --- |
| **M0 · Andamiaje** ✅ | Proyecto Expo SDK 57, Expo Router en `src/app/`, `src/ui/` con tokens, ESLint + Prettier + TS strict, `src/config/env.ts` (validación con zod), cliente de API con parser problem+json, `src/api/schema.ts` generado, `QueryClientProvider`, i18n español, `.env.example`, `.nvmrc` | Hecho el 2026-08-31: la app arranca en el emulador `joinly_pixel7_api35`, resuelve el entorno y `GET /me` sin sesión responde `401`, mostrado en la pantalla de acceso como "Sin iniciar (401)". `typecheck` y `lint` en verde |
| **M1 · Identidad y perfil** ✅ | Registro y sesión con Supabase, verificación de correo, aceptación de acuerdos, `PUT /me` de alta, `GET /me`, editar perfil, borrar cuenta | Verificado el 2026-09-01 en el emulador: registro de cuenta nueva → alta de perfil (`PUT /me`) → Radar; el perfil persiste (comprobado en la base de datos: alias, acuerdos `v1`, `email_verified`, `status active`). El guard enruta `(auth)` ↔ `(app)` por `profile_required`, `emailVerified` y `agreementsAccepted`. La confirmación por correo está desactivada en el proyecto Supabase de desarrollo, por lo que el registro devuelve sesión directa; el bloqueo por correo no verificado está en código pero no es ejercitable con esa configuración |
| **M2 · Descubrimiento** | Patrón Radar de planes de `docs/19`: formulario de búsqueda (ubicación actual, radio), radar abstracto, lista con distancia y zona aproximada, "ampliar radio", scroll infinito por cursor y ficha `GET /events/{id}` condicionada por visibilidad | Implementado; pendiente del recorrido manual: listar eventos sembrados, acción de ampliar radio sin resultados, ficha sin ubicación exacta antes de participar |
| **M3 · Crear y gestionar** 🟡 | `POST /events` con validación (categorías, futuro, capacidad, acceso), `GET /me/events` con filtro de estado, `PATCH` con `If-Match`, `POST /cancellation`, edición de `notes`; entrada desde el botón circular naranja del Radar y enlace "Mis planes" | Implementado. Verificado contra el backend real con la cuenta de prueba: `POST /events` → `201`, `GET /me/events` lista el evento, `PATCH` con `If-Match` → `200`, `If-Match` obsoleto → `412`, `POST /cancellation` → `204` y el evento pasa al filtro "Cancelados". El formulario de tres bloques y la lista "Mis planes" renderizan en la app. Pendiente: recorrido manual completo de creación desde la interfaz y el rechazo del cuarto evento activo (`409`) |
| **M4 · Participar** 🟡 | Uniones directa/aprobación/privada con `Idempotency-Key` persistida por evento, abandonar, lista de solicitudes y participantes del creador, aprobar/rechazar con `If-Match`, crear/copiar (`expo-clipboard`)/revocar invitaciones | Implementado. Verificado contra el backend real con dos cuentas: unión directa → `201 confirmed`; reintento con la misma `Idempotency-Key` → misma participación, sin duplicar; ficha muestra la ubicación exacta solo tras confirmar; abandono → `204`; solicitud de aprobación → `pending` → el creador la aprueba con `If-Match` → `confirmed`; evento privado sin código → `404`; invitación creada, unión con código → `201`, invitación revocada → `204`. En la app se caminó unión directa → confirmada → ubicación exacta → abandonar. Pendiente: recorrido manual completo B-04/B-05/B-08/B-09 de `docs/14` desde la interfaz con el teclado y la ubicación del emulador |
| **M5 · Bloqueos y ajustes** | `POST/DELETE/GET /blocks`, bloquear desde perfil y ficha, pantalla de preferencias de notificaciones (`PUT /me/push-settings`), pantalla de normas de convivencia | Tras bloquear, los eventos de la otra persona desaparecen del descubrimiento y la ficha da `404` (B-06) |
| **M6 · Accesibilidad, pulido y APK** | Auditoría WCAG AA, barrido de i18n, estados de error y vacío, recorrido manual Android completo de `docs/14`, compilación local del APK de pruebas | Recorrido de `docs/14` superado; APK instalable en un dispositivo Android que funciona contra el backend en Compose |

## Siguientes pasos de implementacion

El orden es obligatorio para conservar una aplicacion ejecutable y validar cada
porcion contra servicios reales antes de abrir el siguiente flujo.

1. **M1 · Identidad y perfil.** Instalar `expo-secure-store`,
   `@react-native-async-storage/async-storage` y `@supabase/supabase-js`;
   implementar las pantallas Radar de acceso, registro, verificacion y perfil;
   conectar Supabase Auth, `GET`/`PUT`/`DELETE /me`, acuerdos versionados y el
   manejo de `If-Match`. Verificar una cuenta nueva y una cuenta sin correo
   verificado. Los textos legales reales siguen siendo un bloqueo para cerrar M1.
2. **M2 · Descubrimiento.** Instalar `expo-location`; implementar la pantalla
   Radar, busqueda por zona o permiso contextual, filtros, lista paginada,
   estado vacio y fichas publicas conforme a `docs/19`. Conectar
   `POST /events/search` y `GET /events/{id}` sin mapas ni coordenadas exactas.
3. **M3 · Crear y gestionar.** Construir el formulario de tres bloques, Mis
   planes y gestion del creador; conectar creacion, listado propio, edicion y
   cancelacion con ETag, limite de tres eventos y validacion local.
4. **M4 · Participar.** Implementar hojas de confirmacion, acceso directo,
   solicitud, codigo privado, abandono, solicitudes del creador e invitaciones.
   Persistir la `Idempotency-Key` por evento y probar reintentos.
5. **M5 · Bloqueos y ajustes.** Conectar bloqueos desde las superficies previstas
   por el contrato visual, preferencias de notificacion y normas. No implementar
   recepcion de push ni reportes hasta que exista Fase 4.
6. **M6 · Cierre.** Ejecutar auditoria WCAG AA, pruebas de componente, recorrido
   Android completo, gestion de errores y compilacion local del APK.

Cada paso requiere `npm run typecheck` y `npm run lint` en `mobile/`; los hitos
M1-M5 se verifican tambien contra el backend en Docker Compose antes de marcarse
como completados.

## Compilación del APK de pruebas

Sin EAS ni cuenta Expo (`docs/09`, `docs/16`):

1. `jdk17` (alias que apunta `JAVA_HOME` a `openjdk@17`) solo para esta operación.
2. `npx expo prebuild -p android` genera el proyecto nativo.
3. `cd android && ./gradlew assembleRelease` produce el APK.
4. Instalación con `adb install` en el dispositivo de pruebas.

Para desarrollo diario se usa `npx expo run:android` (build de depuración) o
Expo Go cuando ninguna dependencia nativa lo impida.

## Fuera del alcance de este documento

- Panel de moderación React/Vite y endpoints `/admin/*` (Fase 4 del backend).
- `POST /reports` y la entrada de "reportar" en la app (se añade al cerrar la
  Fase 4).
- Entrega y recepción real de notificaciones push.
- Publicación en tiendas, soporte de lanzamiento iOS, mapas y geocodificación.
- Chat, pagos, valoraciones, verificación de identidad, grupos recurrentes y
  descarga automatizada de datos (fuera del MVP en `docs/04` y `docs/10`).

## Riesgos y decisiones abiertas

- **Textos legales**: términos, privacidad y normas siguen sin redactar; la
  versión `v1` es un marcador de desarrollo. El piloto no puede abrir sin ellos
  (`docs/16`). La app ya soporta versionado de acuerdos.
- **Node 22 LTS** vía `nvm` y `.nvmrc` (el equipo tenía Node 23, no soportado por
  Expo). Resuelto en M0.
- **openapi-typescript ↔ TypeScript 6**: la plantilla trae TS 6 y
  `openapi-typescript@7` declara `peer typescript@^5`; se instaló con
  `--legacy-peer-deps`. Solo es un desfase de rango del peer; la generación
  funciona. Revisar al actualizar cualquiera de los dos.
- **Sin mapa**: si el piloto revela que la lista es insuficiente para situar los
  eventos, se evalúa añadir `react-native-maps`, con la clave de Google Maps y
  la cuenta de facturación que ello implica.
- **Observabilidad del cliente**: la gestión de errores y su registro siguen sin
  decidir para todo el sistema (`docs/08`); la app se limita a estados de error
  claros y sin telemetría en el piloto.
