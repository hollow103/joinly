# Despliegue del piloto: APK Android + backend gratuito

Guía operativa para poner el backend en un servidor gratuito accesible por internet
y generar un APK que se instale en un móvil Android real y se conecte a ese backend.
Complementa `docs/09-despliegue-y-cicd.md` (que fija Cloud Run + Supabase como
plataforma prevista) con pasos concretos y una alternativa sin tarjeta de crédito.

**Estado actual del piloto:** backend desplegado en Render Free desde
`feature/mvp-integration` vía `render.yaml`, en
`https://joinly-backend-v3xz.onrender.com` (base de datos y Auth en el proyecto
Supabase `ulxrjlmpzaeouqbjbnjc`, Session pooler `aws-0-eu-central-1`). Verificado:
`readiness` UP, migraciones `V1..V9` aplicadas, validación de JWT y consulta a la
base correctas (`GET /me` con token real devuelve `profile_required` porque la
base está vacía). Pendiente: generar el APK y el recorrido de aceptación.

## 0. Cómo encajan las piezas (orquestación)

```
  Móvil Android (APK)                Servidor gratuito              Supabase Free
  ───────────────────                ────────────────              ─────────────
  1. Login correo/contraseña  ──────────────────────────────────▶  Supabase Auth
     recibe JWT (ES256)        ◀──────────────────────────────────  (proyecto X)
                                                                        │ JWKS
  2. Llamadas API con           ──▶  Backend Spring Boot  ──────────────┘ valida firma
     Authorization: Bearer <JWT>      (contenedor Docker)
                                          │  JDBC + SSL
                                          ▼
                                      PostgreSQL + PostGIS (Supabase, proyecto X)
```

Reglas que hacen que haya conexión:

- **URL del backend horneada en el APK.** `EXPO_PUBLIC_API_BASE_URL` se fija en el
  momento de compilar. Si cambia la URL del backend, hay que **volver a generar el APK**.
- **Mismo proyecto Supabase en los dos lados.** El `EXPO_PUBLIC_SUPABASE_URL` del APK
  y el `SUPABASE_ISSUER` del backend deben apuntar al mismo proyecto; si no, el backend
  rechaza los JWT.
- **HTTPS obligatorio.** Android bloquea el tráfico HTTP en claro por defecto (API 28+).
  Render y Cloud Run sirven HTTPS automáticamente; no se añade excepción de cleartext.
- **Sin CORS.** La app nativa no es un navegador. (El panel `admin/` sí necesitaría
  CORS o mismo origen en producción; aquí no aplica.)
- **Migraciones automáticas.** Flyway aplica `V1..V9` al arrancar el backend contra la
  base de datos vacía de Supabase. El primer despliegue crea el esquema.
- **Arranque en frío.** En Render Free el backend se duerme tras 15 min inactivo; la
  primera petición puede tardar 30–90 s. La app debe tener timeouts holgados.

Orden de ejecución: **Supabase → backend → APK**. No se puede compilar un APK útil
sin conocer la URL final del backend.

---

## 1. Base de datos y autenticación: Supabase Free

1. Crea un proyecto en <https://supabase.com> (región europea, p. ej. `eu-west-1`).
   Puedes reutilizar el proyecto de desarrollo actual (`ulxrjlmpzaeouqbjbnjc`) para
   las primeras pruebas o crear uno nuevo dedicado al piloto.
2. **PostGIS**: en *SQL Editor* ejecuta `create extension if not exists postgis;`
   (la migración `V1` también lo intenta, pero dejarlo hecho evita sorpresas de permisos).
3. Reúne estos datos de *Project Settings*:
   - *API* → `Project URL` (`https://<ref>.supabase.co`) y `anon public` key.
   - *Database* → *Connection string* → pestaña **Session pooler** (IPv4, puerto 5432).
     Da un host tipo `aws-0-eu-west-1.pooler.supabase.com`, usuario `postgres.<ref>`
     y la contraseña del proyecto.
4. *Authentication → Providers → Email*: activa *Confirm email* según quieras (el
   proyecto de desarrollo lo tiene desactivado y por eso el registro entra directo).

Variables que salen de aquí (se usan en el backend):

| Variable backend | Valor |
| --- | --- |
| `DB_URL` | `jdbc:postgresql://aws-0-<region>.pooler.supabase.com:5432/postgres?sslmode=require` |
| `DB_USERNAME` | `postgres.<ref>` |
| `DB_PASSWORD` | contraseña del proyecto |
| `SUPABASE_ISSUER` | `https://<ref>.supabase.co/auth/v1` |
| `SUPABASE_JWK_SET_URI` | `https://<ref>.supabase.co/auth/v1/.well-known/jwks.json` |
| `SUPABASE_AUDIENCE` | `authenticated` |
| `SUPABASE_API_KEY` | `anon public` key |
| `SUPABASE_USER_INFO_URI` | `https://<ref>.supabase.co/auth/v1/user` |

---

## 2. Backend en un servidor gratuito

### Opción A (recomendada sin tarjeta): Render Free

1. Sube la rama a GitHub (ya está en `origin`).
2. En <https://render.com> → *New* → *Web Service* → conecta el repo.
3. Configuración:
   - *Runtime*: **Docker**.
   - *Dockerfile Path*: `backend/Dockerfile`.
   - *Docker Build Context Directory*: `.` (la raíz del repo; el Dockerfile copia
     `backend/` y `openapi.yaml`).
   - *Instance Type*: **Free**.
   - *Health Check Path*: `/actuator/health/readiness`.
4. *Environment* → añade todas las variables de la tabla de la sección 1, más:
   - `JOINLY_TERMS_VERSION=v1`, `JOINLY_PRIVACY_VERSION=v1`, `JOINLY_GUIDELINES_VERSION=v1`
   - `SPRING_DATASOURCE_HIKARI_MAXIMUM_POOL_SIZE=5` (Supabase Free tiene pocas
     conexiones; el valor por defecto del repo es 10)
   - opcional: `JOINLY_EXPO_ACCESS_TOKEN` para notificaciones push con Enhanced Security
   - `PORT` lo inyecta Render; el `application.yml` ya lo lee (`server.port: ${PORT:8080}`)
5. *Create Web Service*. El primer build tarda varios minutos; al arrancar, Flyway
   migra la base de Supabase.
6. Verifica:
   ```sh
   curl -s https://joinly-backend.onrender.com/actuator/health/readiness
   # {"status":"UP"}
   ```

Limitaciones del plan Free: 512 MB de RAM, se suspende tras 15 min sin tráfico
(arranque en frío ~30–90 s), 750 h/mes. Suficiente para pruebas de APK; no para el
piloto real con usuarios.

### Opción B (más rápida, requiere tarjeta con presupuesto a 0): Google Cloud Run

1. Instala `gcloud`, crea un proyecto y **asocia una cuenta de facturación**; define
   un presupuesto con alerta a 0 € (*Billing → Budgets & alerts*).
2. Desde la raíz del repo:
   ```sh
   gcloud run deploy joinly-backend \
     --source . \
     --region europe-west1 \
     --allow-unauthenticated \
     --port 8080 \
     --memory 512Mi \
     --set-env-vars "DB_URL=...,DB_USERNAME=...,SUPABASE_ISSUER=...,SUPABASE_JWK_SET_URI=...,SUPABASE_AUDIENCE=authenticated,SUPABASE_API_KEY=...,SUPABASE_USER_INFO_URI=...,JOINLY_TERMS_VERSION=v1,JOINLY_PRIVACY_VERSION=v1,JOINLY_GUIDELINES_VERSION=v1" \
     --set-secrets "DB_PASSWORD=joinly-db-password:latest"
   ```
   (`gcloud` usa `backend/Dockerfile` si está en la raíz vía Cloud Build; si no,
   `--source backend` con el Dockerfile ajustado, o construye y sube la imagen).
3. Devuelve `https://joinly-backend-xxxxx.europe-west1.run.app`. Escala a cero;
   arranque en frío ~2–4 s.

### Nota de conexión a Supabase

Usa siempre el **Session pooler** (puerto 5432), no el Transaction pooler (6543):
Flyway y HikariCP necesitan sesiones estables con prepared statements. Añade
`?sslmode=require` al `DB_URL`.

---

## 3. Generar el APK

### Preparación común (una vez)

Añade el identificador de aplicación Android en `mobile/app.json` → `expo.android`:

```json
"android": {
  "package": "com.joinly.app",
  "adaptiveIcon": { ... }
}
```

### Opción A (recomendada): EAS Build en la nube

Ya existe `mobile/eas.json` con los perfiles `development`, `preview` (APK) y
`production`. Free tier: número limitado de builds al mes, cola compartida.

1. `cd mobile`
2. `npx eas-cli login` (cuenta Expo gratuita)
3. `npx eas-cli init` → crea el proyecto en expo.dev y añade `owner` +
   `extra.eas.projectId` a `app.json`.
4. Edita el bloque `env` del perfil `preview` en `eas.json` con los valores reales:
   ```json
   "preview": {
     "distribution": "internal",
     "android": { "buildType": "apk" },
     "env": {
       "EXPO_PUBLIC_API_BASE_URL": "https://joinly-backend.onrender.com/api/v1",
       "EXPO_PUBLIC_SUPABASE_URL": "https://<ref>.supabase.co",
       "EXPO_PUBLIC_SUPABASE_ANON_KEY": "<anon key>"
     }
   }
   ```
5. `npx eas-cli build -p android --profile preview`
6. Al terminar da una URL de descarga del `.apk` (firmado por EAS). Descárgalo y:
   ```sh
   adb install -r ~/Downloads/joinly-preview.apk
   ```
   o abre el enlace desde el propio móvil.

### Opción B (sin cuenta Expo): Gradle local

Requiere el Android SDK ya instalado (`ANDROID_HOME=~/Library/Android/sdk`).

```sh
cd mobile
EXPO_PUBLIC_API_BASE_URL=https://joinly-backend.onrender.com/api/v1 \
EXPO_PUBLIC_SUPABASE_URL=https://<ref>.supabase.co \
EXPO_PUBLIC_SUPABASE_ANON_KEY=<anon key> \
  npx expo prebuild -p android --clean

cd android
./gradlew assembleDebug        # APK firmado con la debug keystore, instalable
# -> android/app/build/outputs/apk/debug/app-debug.apk

adb install -r app/build/outputs/apk/debug/app-debug.apk
```

`assembleDebug` produce un APK instalable en cualquier dispositivo sin gestionar
keystore. Para un APK de release (`assembleRelease`) hay que crear una keystore
propia y un `signingConfigs.release` en `android/app/build.gradle`; se hace cuando
haga falta distribuirlo a más gente.

Las variables `EXPO_PUBLIC_*` se leen durante el paso "Bundle React Native code and
images" de Gradle, por eso se pasan al `prebuild`/build y no hace falta tocar
`mobile/.env` (que mantiene la URL local de desarrollo).

---

## 4. Orquestación y comprobación de la conexión

### Checklist de coherencia

- [ ] `EXPO_PUBLIC_API_BASE_URL` del APK == URL pública del backend + `/api/v1`.
- [ ] `EXPO_PUBLIC_SUPABASE_URL` del APK y `SUPABASE_ISSUER` del backend = **mismo** proyecto.
- [ ] `EXPO_PUBLIC_SUPABASE_ANON_KEY` = `anon public` de ese proyecto.
- [ ] Backend responde `{"status":"UP"}` en `/actuator/health/readiness`.
- [ ] La base de datos de Supabase tiene las tablas (`flyway_schema_history` con 9 filas).

### Smoke test de punta a punta

1. Instala el APK y ábrelo en el móvil.
2. Regístrate o inicia sesión (correo/contraseña de ese proyecto Supabase).
3. Completa el perfil (alias). Debe persistir: en Supabase *Table editor* o por API
   `GET /api/v1/me` con el token debe devolver el perfil.
4. Concede permiso de ubicación y busca en el Radar. Si no hay eventos, "ampliar radio".
5. Crea un evento; búscalo desde otra cuenta y comprueba que solo se ve zona
   aproximada hasta participar.
6. Reporta un evento desde su ficha → aparece en el panel de moderación.

### Problemas típicos

| Síntoma | Causa probable | Arreglo |
| --- | --- | --- |
| La app abre pero toda llamada falla | `EXPO_PUBLIC_API_BASE_URL` mal o backend dormido | Revisa la URL horneada; espera al arranque en frío y reintenta |
| Login OK pero `401` en todas las llamadas | proyecto Supabase distinto en app y backend | Alinea `SUPABASE_ISSUER`/`JWK_SET_URI` con el `EXPO_PUBLIC_SUPABASE_URL` |
| `403 profile_required` tras login | cuenta sin perfil interno | Completa el alta de perfil en la app (`PUT /me`) |
| Backend no arranca, error de Flyway/JDBC | Transaction pooler (6543) o falta SSL | Usa Session pooler (5432) y `?sslmode=require` |
| Backend se reinicia por memoria | 512 MB insuficientes con pool grande | `SPRING_DATASOURCE_HIKARI_MAXIMUM_POOL_SIZE=5` |
| `cleartext HTTP not permitted` | URL `http://` en el APK | El backend debe ser `https://`; no añadir excepción de cleartext |

### Cuando cambie algo

- Cambia la URL del backend → **rebuild del APK** (la URL va horneada).
- Cambias solo código del backend → *redeploy* en Render/Cloud Run; el APK no cambia.
- Cambias de proyecto Supabase → nuevas variables en el backend **y** rebuild del APK.

---

## 5. Ya preparado en el repositorio

- `backend/.../application.yml`: `server.port: ${PORT:8080}`.
- `mobile/eas.json`: perfiles `development` / `preview` / `production` con bloque `env`
  de marcadores `REEMPLAZAR`.
- `mobile/.env.example`: bloque comentado para builds contra el backend desplegado.
- Este documento.

Pendiente de decisión: proveedor de hosting (Render Free vs Cloud Run) y si el piloto
usa el proyecto Supabase de desarrollo o uno nuevo.
