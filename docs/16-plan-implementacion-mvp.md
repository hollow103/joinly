# Plan de implementación MVP

## Objetivo

Implementar un piloto pequeño que permita crear, descubrir y participar en eventos locales de forma privada y segura. El plan evita construir funciones diferidas o infraestructura de producción antes de demostrar que el flujo central funciona en Android.

La implementación comienza solo tras aprobar este documento. Cada fase entrega una porción verificable y mantiene el repositorio ejecutable mediante el entorno local descrito en `docs/15-operacion-del-piloto.md`.

**Estado:** Fase 0 completada el 2026-08-31. Fase 1 en curso: pendiente de la prueba con un JWT temporal real y de los textos legales antes de cerrarla. Fase 2 (eventos y descubrimiento) y Fase 3 (participaciones, invitaciones y bloqueos) implementadas el 2026-08-31 con pruebas herméticas de API contra PostGIS que cubren B-01 a B-09, incluida la concurrente B-07. Las notificaciones (registro y entrega push) quedan para la Fase 4.

## Decisiones de implementación

- Backend: Java 21, Spring Boot, Maven Wrapper, Spring Security, Flyway y PostgreSQL/PostGIS.
- Mobile: Expo gestionado, React Native y TypeScript para Android; iOS se mantiene fuera de la distribución inicial.
- Panel: React, TypeScript y Vite, limitado a moderación interna.
- Desarrollo local: Docker Desktop y Compose para `backend` y `db`; mobile y panel se ejecutan nativamente.
- API: `openapi.yaml` es la fuente de verdad; controladores, clientes y pruebas se ajustan a `docs/11-contrato-api.md` y al contrato versionado.
- Autenticación del primer APK: correo y contraseña mediante un proyecto Supabase Free de desarrollo separado. Google y Facebook se difieren.
- Distribución inicial: APK compilado localmente con Android SDK y Gradle; no requiere cuenta Expo ni EAS Build.
- Se usan módulos de dominio aislados: autenticación, usuarios, eventos, participaciones, moderación y notificaciones. Ninguno accede directamente a modelos de persistencia de otro módulo.

## Fase 0: base ejecutable local

1. Crear el proyecto mínimo de `backend/`, `compose.yaml` y plantillas de variables no secretas. `mobile/` y `admin/` permanecen sin implementación.
2. Configurar Compose con Spring Boot y `postgis/postgis:16-3.4`, volumen persistente, perfil backend `local` y endpoint de salud.
3. Añadir Maven Wrapper, `openapi.yaml`, configuración de formato y pruebas del backend.
4. Crear migraciones Flyway `V1` a `V5` conforme a `docs/13-modelo-fisico-y-migraciones.md`.
5. Verificar que una base vacía recibe las migraciones, que el contrato OpenAPI valida y que el backend responde por el puerto publicado.

**Salida:** backend saludable, base local migrada y herramientas reproducibles documentadas con comandos reales.

## Fase 1: identidad y perfil

1. Configurar un proyecto Supabase Free exclusivo de desarrollo y validar sus JWT en Spring Security; resolver el perfil interno por `sub`.
2. Implementar creación y actualización de perfil, estado de correo validado, aceptación versionada de acuerdos, preferencias de búsqueda manual y solicitud asíncrona de supresión de cuenta.
3. Implementar el estado `suspended`, su comprobación por petición y la integración necesaria para revocar sesiones en Supabase.
4. Implementar el rol interno `admin` y el proceso manual de asignación documentado, sin endpoint público de roles.
**Verificación:** `GET /me` y `PUT /me` contra JWT válidos e inválidos, además de la denegación de operaciones de una cuenta con estado `suspended`.

## Fase 2: eventos y descubrimiento

1. Implementar creación, consulta, edición y cancelación de eventos con ETag; el cierre programado se trata por filtro temporal en las consultas y su job se implementa en la Fase 6.
2. Aplicar límite de tres eventos activos, horarios futuros, categorías, capacidad y estados.
3. Implementar búsqueda PostGIS por radio con cursor opaco, orden estable `(distancia, startsAt, id)` y proyección de zona aproximada y distancia redondeada.
4. Centralizar la política de visibilidad en `EventVisibility` para que ninguna consulta exponga ubicación exacta antes de una participación confirmada.
**Verificación:** B-01 a B-03 mediante pruebas de API herméticas contra PostGIS (JWT sintético y Supabase simulado).

**Estado:** completada el 2026-08-31. Módulo `com.joinly.backend.events` (`EventController`, `EventService`, `EventRepository`, `EventVisibility`, `ApproximateArea`, `PageCursor`). `approximateArea` se deriva por rejilla de ~1,1 km sin geocodificación externa. `confirmedCount`, `availability` y el filtro de eventos completos dependen de participaciones y se completan en la Fase 3.

## Fase 3: participaciones, invitaciones y bloqueos

1. Implementar uniones directas, solicitudes con aprobación, invitaciones privadas de código secreto y abandono idempotente.
2. Resolver capacidad y uso de invitaciones dentro de una transacción, con `Idempotency-Key` para crear participaciones.
3. Implementar bloqueos recíprocos en las consultas y operaciones, incluido el comportamiento posterior a una participación confirmada definido en `docs/12-autorizacion-y-permisos.md`.
4. Añadir la gestión del creador para aprobar o rechazar solicitudes y consultar participantes confirmados.
**Verificación:** B-04 a B-09, incluida la prueba concurrente B-07 contra PostgreSQL real.

**Estado:** completada el 2026-08-31. Módulos `com.joinly.backend.participation` y `com.joinly.backend.blocks`; puerto `EventParticipation` (implementado por `ParticipationDirectory`) mantiene la dependencia unidireccional `participation → events`. Concurrencia B-07 por `SELECT ... FOR UPDATE` sobre la fila del evento. Migración `V7` correctora de `V3`. `GET /events/{id}/participations` admite `status=pending` para que el creador localice solicitudes sin la notificación de Fase 4. Cerrados los huecos de Fase 2: `confirmedCount`/`availability` reales y filtro de eventos completos en `search`. Las notificaciones y `POST /reports` quedan para la Fase 4.

## Fase 4: reportes y moderación mínima

1. Implementar creación de reportes y persistencia de decisiones, auditoría y retención definida.
2. Implementar acciones de administrador: archivar o resolver, ocultar evento, advertir y suspender usuario.
3. Implementar los ajustes API de notificaciones push y registrar los eventos de entrega; el envío inicial cubre solicitudes, decisiones, cambios y cancelaciones.
4. Limitar la información privada de las respuestas administrativas al contexto estrictamente necesario y registrar cada acceso a esos datos.

**Verificación:** reporte y ocultación mediante pruebas de API; acceso no administrador con B-10 y suspensión con B-11.

## Puerta de verificación backend

Antes de crear interfaces, el backend debe ejecutarse en Compose contra PostGIS y superar B-01 a B-11. La prueba B-07 usa PostgreSQL real y las pruebas de autorización validan las proyecciones de datos, no solo los códigos HTTP. Los defectos críticos o altos de privacidad, capacidad, bloqueos o autorización se corrigen antes de continuar.

## Fase 5: interfaces tras backend validado

1. Crear el proyecto Expo, la configuración de entorno y los scripts reales para Android.
2. Implementar registro, sesión y perfil con Supabase Auth.
3. Implementar en mobile crear, descubrir, consultar, unirse, abandonar, bloquear y reportar, usando `SafeAreaView`, controles de 48 dp y proyección de datos del backend.
4. Crear el panel Vite mínimo con inicio de sesión, cola de reportes, detalle y acciones de moderación.
5. Implementar registro de dispositivo y preferencias para notificaciones push críticas.

**Verificación:** recorrido manual Android de `docs/14-estrategia-pruebas.md` y moderación manual del panel contra el backend ya validado.

## Fase 6: endurecimiento y APK de prueba

1. Implementar tareas simples y repetibles para cerrar eventos, programar retención y entregar notificaciones, sin introducir colas ni outbox.
2. Añadir manejo uniforme de errores RFC 9457, registro estructurado mínimo y límites de petición básicos en los endpoints expuestos.
3. Ejecutar B-01 a B-11 y el recorrido completo de Android en preproducción cuando ese entorno se defina.
4. Corregir defectos críticos o altos del flujo central, accesibilidad, privacidad o autorización.
5. Compilar localmente y distribuir el APK de pruebas Android mediante Android SDK y Gradle.

**Salida:** piloto verificable conforme a los criterios de salida de `docs/14-estrategia-pruebas.md`.

## Orden de implementación por componente

| Orden | Backend | Mobile | Admin |
| --- | --- | --- | --- |
| 1 | Base, migraciones y salud | - | - |
| 2 | Identidad y perfiles | - | - |
| 3 | Eventos y búsqueda | - | - |
| 4 | Participaciones, invitaciones, bloqueos y moderación | - | - |
| 5 | Corrección tras pruebas B-01 a B-11 | Proyecto Expo y flujo móvil | Proyecto Vite y moderación |
| 6 | Tareas mínimas y endurecimiento | Validación manual y APK | Validación de moderación |

## Fuera de este plan

- Chat, pagos, ratings, verificación de identidad, grupos recurrentes, lista de espera, recomendaciones y exportación automática de datos.
- Microservicios, colas, outbox, caché distribuida, búsqueda de texto completo, analítica avanzada y observabilidad compleja.
- Distribución en tiendas, despliegue productivo, infraestructura completa y soporte iOS de lanzamiento.

## Puertas de aprobación

Antes de iniciar la Fase 0 se confirma que:

- El contrato API, autorización, modelo físico, pruebas mínimas y operación local son aceptados.
- El objetivo sigue siendo el piloto Android y no se incorporaron capacidades diferidas.
- Se acepta Compose como único punto de inicio local de backend y base de datos.

Antes del APK se confirma que:

- Se cumplieron los criterios de salida de `docs/14-estrategia-pruebas.md`.
- La configuración de secretos y el entorno de preproducción están definidos para el alcance del piloto.
- Los documentos legales y de privacidad requeridos para abrir el piloto están revisados.
