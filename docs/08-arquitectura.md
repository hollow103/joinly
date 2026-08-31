# Arquitectura

## Decisiones iniciales

- Repositorio: monorepo GitHub con `mobile/`, `backend/`, `admin/` y `docs/`.
- Cliente movil: React Native con Expo y TypeScript para iOS y Android.
- Panel de moderacion: React, TypeScript y Vite, protegido mediante rol de administrador.
- Backend: monolito modular en Java y Spring Boot, con modulos de autenticacion, usuarios, eventos, participaciones, moderacion y notificaciones.
- API: REST documentada con OpenAPI.
- Base de datos: PostgreSQL con PostGIS para consultas geograficas.
- Internacionalizacion: interfaz inicial en espanol, preparada para soportar varios idiomas.
- Dimensionamiento inicial: hasta 1.000 usuarios registrados, 100 eventos activos y 100 usuarios simultaneos.
- Backend del piloto: contenedor Docker de Spring Boot en Google Cloud Run, en region europea y con escalado a cero.
- Base de datos: Supabase Free con PostgreSQL y PostGIS en region europea.
- Autenticacion: Supabase Auth mediante correo y contrasena con validacion de correo en el primer APK. Spring Boot validara sus JWT y no almacenara contrasenas; Google y Facebook se difieren.
- Panel de moderacion: sitio estatico en Render, con autorizacion aplicada siempre por la API.
- Notificaciones push: Expo Push Service.
- Correo transaccional: Brevo Free, limitado a validacion de cuenta y recuperacion de contrasena.
- Distribucion inicial: APK de pruebas para Android, sin publicacion en tiendas. iOS se difiere hasta disponer de cuenta Apple Developer.

## Evolucion a microservicios

Los modulos tendran limites de dominio claros y se comunicaran mediante contratos internos definidos. Se evitara compartir directamente logica o modelos de persistencia entre modulos. Esto permitira extraer un modulo cuando exista una necesidad demostrada de escala, autonomia de despliegue o carga independiente, sin incorporar microservicios en el MVP.

## Decisiones pendientes

- Observabilidad y gestion de errores.

## Restricciones de coste

- El MVP debe operar sin gasto recurrente, aceptando limites de cuota, posibles arranques en frio y ausencia de SLA.
- Google Cloud Run requiere una cuenta de facturacion aunque el uso se mantenga dentro de su nivel gratuito. Se configuraran presupuestos y alertas para evitar sobrecostes.
- Supabase Free tiene limites de capacidad, no incluye SLA ni copias de seguridad administradas y puede pausar proyectos inactivos. Se realizara exportacion periodica de PostgreSQL antes de cualquier hito relevante.
- La publicacion oficial en App Store no puede ser gratuita: requiere membresia de Apple Developer. Esta decision se difiere hasta validar el piloto.
- La distribucion inicial sera mediante APK de pruebas para Android, sin publicacion en tiendas.
