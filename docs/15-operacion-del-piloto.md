# Operación del piloto

## Alcance actual

La primera configuración operativa cubre exclusivamente desarrollo local. El objetivo es que una sola configuración Docker Compose levante el monolito y su base de datos geoespacial, sin coste y sin depender de infraestructura remota.

Preproducción, producción, CI/CD, secretos gestionados, despliegue en Cloud Run y panel estático se concretarán cuando exista la implementación y se vaya a preparar el piloto.

## Entorno local acordado

La futura configuración `compose.yaml` contiene exactamente dos servicios:

| Servicio | Imagen o construcción | Responsabilidad | Exposición |
| --- | --- | --- | --- |
| `backend` | Imagen local construida desde `backend/` con Java 21 LTS | API Spring Boot, validación de JWT, reglas de negocio y Flyway | Puerto host `8080` hacia el puerto HTTP del contenedor |
| `db` | `postgis/postgis:16-3.4` | PostgreSQL 16, PostGIS y datos locales persistentes | Accesible por `backend` mediante `db:5432`; publicación opcional al host para diagnóstico local |

Ambos servicios comparten la red interna predeterminada de Compose. El backend no usa `localhost` para la base de datos: usa el nombre de servicio `db`. La base de datos persiste en un volumen con nombre gestionado por Compose para que reiniciar contenedores no borre datos de desarrollo.

El backend arranca con un perfil `local`, aplica Flyway al iniciar y recibe URL, usuario y contraseña de PostgreSQL mediante variables de entorno locales. Las credenciales no se escriben en el repositorio: la futura plantilla `.env.example` solo contendrá nombres de variables y valores no secretos.

## Herramientas locales sin coste

- Java 21 LTS se usa dentro del contenedor del backend para asegurar una versión reproducible. La instalación actual de Java 24 de la máquina no define el runtime del servicio.
- PostgreSQL y PostGIS se ejecutan en Compose; no se instala ni administra una base de datos nativa en cada equipo.
- En macOS, Docker Desktop es el runtime de contenedores acordado para Compose local.
- Android Studio y Android SDK se instalan en la máquina para ejecutar el emulador. Actualmente el SDK no está configurado en este equipo; se hará al iniciar la aplicación móvil.

No se introduce Supabase CLI local. Al implementar autenticación se usará un proyecto Supabase Free de desarrollo, separado de cualquier entorno posterior y sin datos personales reales; no se añadirá un bypass de autenticación distinto del que defina explícitamente el contrato de pruebas.

## Conectividad de aplicaciones móviles

La aplicación Expo/React Native se ejecuta nativamente, no dentro de Compose. El backend expone su puerto HTTP en la máquina anfitriona.

| Cliente | URL base de desarrollo |
| --- | --- |
| Emulador Android estándar | `http://10.0.2.2:8080/api/v1` |
| Dispositivo Android por USB | `http://127.0.0.1:8080/api/v1` mediante redirección ADB del puerto 8080 |
| Simulador iOS futuro | `http://127.0.0.1:8080/api/v1` |

La URL base se suministrará mediante configuración de entorno de la aplicación móvil y nunca se codificará en pantallas o servicios. Si se prueba desde un dispositivo por red local, se usará una URL HTTPS controlada o una configuración de desarrollo explícita; no se habilita CORS permisivo ni se expone la base de datos a una red pública.

## Datos y migraciones locales

- Flyway es el único mecanismo para crear o evolucionar el esquema; no se modifican tablas manualmente.
- Reiniciar contenedores mantiene el volumen. Reiniciar el entorno desde cero elimina solo datos locales y vuelve a aplicar las migraciones.
- Se usan únicamente cuentas de prueba y ubicaciones no residenciales.
- La configuración local no conecta a una base de datos Supabase de producción ni contiene claves de producción.

## Flujo de trabajo previsto

Cuando el plan de implementación esté aprobado y se creen los módulos, el flujo será:

1. Construir y levantar `backend` y `db` mediante la configuración Compose del repositorio.
2. Esperar a que Flyway complete las migraciones y al endpoint de salud del backend.
3. Ejecutar los casos críticos de backend de `docs/14-estrategia-pruebas.md` con datos locales.
4. Solo tras validar el backend, iniciar la aplicación móvil nativa apuntando a la URL correspondiente al emulador o dispositivo.

No hay comandos ejecutables todavía porque no existe `compose.yaml`, backend, migraciones ni aplicación móvil. Se añadirán al implementar la estructura aprobada y se documentarán entonces junto con sus requisitos reales.

## Límites deliberados del MVP

- No hay servicios locales para panel de moderación, notificaciones push, correo, observabilidad, colas ni caché.
- No se incluye Supabase local hasta necesitar validar el flujo de JWT real.
- No se crean entornos de preproducción o producción en esta fase.
- La estrategia de backup, alertas, presupuestos y gestión de secretos de despliegue queda pendiente para la definición de infraestructura.

## Criterios para materializar Compose

Antes de crear los archivos de contenedor deben estar aprobados el contrato API, autorización, modelo físico, pruebas mínimas y plan de implementación. La configuración resultante debe:

- Arrancar backend y PostGIS sin servicios externos obligatorios.
- Aplicar migraciones versionadas contra una base de datos vacía.
- Mantener la base de datos en un volumen local.
- Permitir al emulador Android llamar a la API por `10.0.2.2:8080`.
- No incluir secretos, datos personales reales ni conexiones a producción.
