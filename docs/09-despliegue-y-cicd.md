# Despliegue y CI/CD

## Entornos

- Desarrollo: integracion y pruebas del equipo.
- Preproduccion: validacion antes de publicar cambios.
- Produccion: piloto de Vigo, dimensionado inicialmente para 1.000 usuarios registrados, 100 eventos activos y 100 usuarios simultaneos.

## Repositorio

Se utilizara un monorepo GitHub con `mobile/`, `backend/`, `admin/` y `docs/`. Los flujos de GitHub Actions ejecutaran validaciones solo para los componentes modificados cuando se implemente el proyecto.

## Pipeline candidato

1. Cada pull request ejecutara validacion de formato, analisis estatico, pruebas unitarias y pruebas de integracion.
2. Al fusionar cambios en `main`, se generaran los artefactos y se desplegara automaticamente en preproduccion.
3. El despliegue en produccion requerira aprobacion manual desde GitHub Actions.
4. Las migraciones de base de datos estaran versionadas y se ejecutaran automaticamente durante el despliegue controlado.

## Plataforma pendiente de seleccion

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
