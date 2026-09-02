# Despliegue y CI/CD

## Entornos

- Desarrollo: integracion y pruebas del equipo.
- Preproduccion: validacion antes de publicar cambios.
- Produccion: piloto de Vigo, dimensionado inicialmente para 1.000 usuarios registrados, 100 eventos activos y 100 usuarios simultaneos.

## Repositorio

Se utilizara un monorepo GitHub con `mobile/`, `backend/`, `admin/` y `docs/`. Los flujos de GitHub Actions ejecutaran validaciones solo para los componentes modificados cuando se implemente el proyecto.

La estrategia de ramas es `feature/<nombre>` hacia `development` mediante pull request. `development` integra los cambios aprobados y es la base de las validaciones locales con Compose. `main` se reserva para promociones aprobadas al entorno de produccion. Cada commit y cada `push` requieren aprobacion explicita de la persona responsable.

## Pipeline candidato

1. Cada pull request hacia `development` ejecutara validacion de formato, analisis estatico, pruebas unitarias y pruebas de integracion cuando existan comandos ejecutables.
2. Tras aprobar una pull request, el entorno local se validara manualmente con Compose; GitHub Actions no puede desplegar en esta maquina sin un runner autoalojado.
3. Una pull request de `development` hacia `main` sera la promocion a produccion y requerira aprobacion manual. El despliegue solo se definira cuando existan preproduccion, secretos gestionados, exportacion de PostgreSQL y configuracion de Cloud Run.
4. Las migraciones de base de datos estaran versionadas y se ejecutaran automaticamente durante el despliegue controlado.

## Plataforma prevista

GitHub y GitHub Actions permanecen confirmados. El backend Spring Boot se desplegara como contenedor Docker en Google Cloud Run, en una region europea y con escalado a cero. PostgreSQL con PostGIS y la autenticacion se alojaran en Supabase Free, en region europea. El panel interno React se desplegara como sitio estatico en Render. Los servicios Docker, las migraciones SQL y la exportacion de PostgreSQL mantendran una futura migracion portable.

La aplicacion interna de moderacion se construira con React, TypeScript y Vite y se desplegara como aplicacion web independiente, protegida por el rol de administrador.

## Servicios externos previstos

- Supabase Auth para correo y contrasena con validacion de correo; Google y Facebook se difieren hasta despues del piloto.
- Expo Push Service para notificaciones push de iOS y Android.
- Brevo Free para correo transaccional, limitado a validacion y recuperacion de contrasena.
- Expo para compilaciones y distribucion de la aplicacion movil durante el piloto.

## Limites operativos del piloto

- Cloud Run requiere asociar una cuenta de facturacion. Se configuraran presupuestos y alertas para mantener el uso dentro del nivel gratuito.
- Supabase Free tiene limites de capacidad, puede pausar proyectos inactivos y no proporciona SLA ni copias de seguridad administradas. Se exportara la base de datos periodicamente.
- Render se usa exclusivamente para el sitio estatico del panel interno, no para el backend ni la base de datos.
- El piloto se distribuira mediante APK de pruebas para Android, sin publicacion inicial en Google Play ni App Store. iOS se difiere hasta asumir la cuota de Apple Developer.

## Preparacion para el APK de prueba (hosting del backend pendiente)

Un APK o IPA de prueba es una build de tipo release: se ejecuta sin Metro y necesita el backend en una URL publica con HTTPS. La eleccion del proveedor de hosting del backend esta **pendiente de decision**; el resto ya esta preparado en el repositorio.

### Ya preparado en el repositorio

- `backend/.../application.yml`: `server.port` toma `${PORT:8080}`, de modo que Cloud Run o Render pueden inyectar su puerto. Todas las demas opciones de configuracion ya se leen de variables de entorno.
- `mobile/eas.json`: perfiles `development`, `preview` (APK de distribucion interna) y `production` (app bundle), con un bloque `env` de marcadores `REEMPLAZAR` para las variables `EXPO_PUBLIC_*`.
- `mobile/.env.example`: bloque comentado con las variables que hay que fijar para una build de prueba y el recordatorio de que `EXPO_PUBLIC_*` se hornea en el bundle al compilar.

### Decision pendiente

| Opcion | Coste | Contrapartida |
| --- | --- | --- |
| Google Cloud Run (region europea, escala a cero) | Nivel gratuito, pero exige asociar cuenta de facturacion con presupuesto y alertas | Cold start de unos segundos |
| Render (free web service) | Gratuito sin tarjeta | Se suspende tras 15 min de inactividad; cold start de ~50 s; 512 MB de RAM |

En ambos casos la base de datos PostgreSQL/PostGIS y la autenticacion siguen en Supabase Free; el backend se conecta al pooler de sesion de Supabase.

### Independiente de la decision

- Supabase Free provee Postgres con PostGIS, Auth de correo/contrasena y el JWKS. La migracion `V1` crea la extension PostGIS.
- El backend expone HTTPS a traves del proveedor elegido; no se habilita ATS permisivo en iOS ni CORS permisivo.
- Variables de entorno del backend: `PORT` (la pone la plataforma), `DB_URL`, `DB_USERNAME`, `DB_PASSWORD`, `SUPABASE_ISSUER`, `SUPABASE_JWK_SET_URI`, `SUPABASE_AUDIENCE`, `SUPABASE_API_KEY`, `SUPABASE_USER_INFO_URI`, `JOINLY_TERMS_VERSION`, `JOINLY_PRIVACY_VERSION`, `JOINLY_GUIDELINES_VERSION` y, opcional, `JOINLY_EXPO_ACCESS_TOKEN`.
- Flyway aplica `V1..V9` al arrancar contra la base de datos vacia de Supabase.
- La app apunta al backend mediante `EXPO_PUBLIC_API_BASE_URL` (`https://<host>/api/v1`), fijado en el momento del build. `EXPO_PUBLIC_SUPABASE_URL` y `SUPABASE_ISSUER` del backend deben ser el mismo proyecto Supabase.

### Guía operativa

`docs/21-despliegue-piloto.md` tiene el paso a paso: Supabase Free, despliegue del backend en Render Free (sin tarjeta) o Cloud Run, generación del APK con EAS `preview` o Gradle local, orquestación app↔backend y checklist de smoke test. La elección de proveedor sigue pendiente; el documento cubre ambos.
