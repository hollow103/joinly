# Modelo físico y migraciones iniciales

## Objetivo

Este modelo físico permite lanzar un MVP pequeño: crear eventos, descubrirlos por distancia y participar. Usa PostgreSQL con PostGIS y evita introducir tablas, procesos o integraciones que no sean necesarios para esos flujos.

Las migraciones serán SQL versionado con Flyway. El backend aplica reglas de autorización y ciclo de vida; las restricciones de base de datos protegen identidad, cardinalidad, capacidad y consistencia básica.

## Convenciones de persistencia

- Todas las tablas usan UUID como clave primaria, `created_at` y `updated_at` en UTC cuando el registro sea mutable.
- Las ubicaciones se guardan como `geography(Point, 4326)`. PostGIS recibe y devuelve GeoJSON en la capa de API.
- La ubicación de búsqueda actual no se persiste. Una zona manual solo se almacena como preferencia explícita.
- Los valores de estado se restringen con tipos `enum` o `check`; no se eliminan físicamente registros de producto durante el flujo normal del MVP.
- Los identificadores de Supabase Auth se guardan como referencia externa; no hay tabla de contraseñas ni credenciales.

## Tablas del MVP

### `users`

Perfil interno vinculado a Supabase Auth.

| Columna | Tipo | Restricción y propósito |
| --- | --- | --- |
| `id` | `uuid` | Clave interna |
| `auth_subject` | `uuid` | `unique`, identificador `sub` de Supabase Auth |
| `alias` | `varchar(40)` | Visible públicamente |
| `alias_normalized` | `varchar(40)` | `unique`, minúsculas para impedir alias equivalentes |
| `photo_url` | `text` | Reservado para una fase posterior; el piloto no recibe ni devuelve fotos |
| `status` | `user_status` | `active`, `suspended` o `deletion_requested` |
| `deletion_requested_at` | `timestamptz` opcional | Instante de solicitud de supresión; revoca acceso antes de la eliminación física |
| `email_verified` | `boolean` | Sincronizado desde Supabase Auth |
| `terms_version`, `privacy_version`, `guidelines_version` | `varchar(32)` | Versiones aceptadas |
| `terms_accepted_at`, `privacy_accepted_at`, `guidelines_accepted_at` | `timestamptz` | Obligatorios al activar el perfil |
| `preferred_search_point` | `geography(Point,4326)` | Opcional; solo zona manual guardada explícitamente |
| `preferred_search_label` | `varchar(160)` | Opcional |
| `role` | `user_role` | `user` o `admin`; asignación manual fuera de API |
| `created_at`, `updated_at` | `timestamptz` | Auditoría y control de actualización del perfil |

### `events`

| Columna | Tipo | Restricción y propósito |
| --- | --- | --- |
| `id`, `creator_id` | `uuid` | Clave y FK a `users` |
| `title`, `description`, `notes` | `varchar(120)`, `text`, `text` | `notes` opcional |
| `category` | `event_category` | Una de las seis categorías del MVP |
| `starts_at`, `duration_minutes` | `timestamptz`, `integer` | Duración positiva; la aplicación exige inicio futuro al crear |
| `location` | `geography(Point,4326)` | Ubicación exacta privada |
| `approximate_area` | `varchar(160)` | Zona derivada por backend, visible antes de confirmar |
| `capacity` | `integer` | `null` significa sin límite; si existe, positiva |
| `access_mode` | `event_access_mode` | `direct`, `approval` o `private_invitation` |
| `status` | `event_status` | `published`, `cancelled` o `closed` |
| `is_hidden` | `boolean` | `false` por defecto; lo usa moderación sin duplicar estado |
| `version` | `bigint` | Incrementa en cada actualización y genera el `ETag` |
| `created_at`, `updated_at`, `cancelled_at` | `timestamptz` | Auditoría mínima del ciclo de vida |

No se almacena una dirección pública ni una segunda geometría aproximada. El backend genera `approximate_area` a partir de la ubicación exacta y controla qué campos se proyectan en cada respuesta.

### `participations`

| Columna | Tipo | Restricción y propósito |
| --- | --- | --- |
| `id`, `event_id`, `user_id` | `uuid` | Clave y FKs a evento y usuario |
| `status` | `participation_status` | `pending`, `confirmed`, `rejected` o `abandoned` |
| `requested_at`, `resolved_at`, `abandoned_at` | `timestamptz` | Historial mínimo de estado |
| `version` | `bigint` | Control de concurrencia para aprobar o rechazar |
| `created_at`, `updated_at` | `timestamptz` | Auditoría y cambios de estado |

Existe una restricción `unique(event_id, user_id)`. Evita duplicar solicitudes o plazas, incluso tras un abandono. La capacidad se calcula solo sobre filas `confirmed`.

### `invitations`

| Columna | Tipo | Restricción y propósito |
| --- | --- | --- |
| `id`, `event_id`, `created_by` | `uuid` | Clave y FKs |
| `code_hash` | `varchar(128)` | `unique`; nunca se persiste el código secreto en claro |
| `max_uses`, `used_count` | `integer` | Positivos; `max_uses` puede ser `null` |
| `expires_at`, `revoked_at` | `timestamptz` | Opcionales |
| `created_at`, `updated_at` | `timestamptz` | Auditoría y cambios de uso o revocación |

Una invitación solo es válida para un evento privado publicado y futuro. El aumento de `used_count` y la confirmación de participación se realizan en la misma transacción.

### `blocks`

| Columna | Tipo | Restricción y propósito |
| --- | --- | --- |
| `id`, `blocker_id`, `blocked_id` | `uuid` | Clave y FKs a `users` |
| `created_at` | `timestamptz` | Auditoría |

La restricción `unique(blocker_id, blocked_id)` y una comprobación `blocker_id <> blocked_id` impiden duplicados y autobloqueos. El efecto recíproco se aplica en las consultas con ambas direcciones; no se duplica una fila inversa.

### `reports`

| Columna | Tipo | Restricción y propósito |
| --- | --- | --- |
| `id`, `reporter_id` | `uuid` | Clave y FK |
| `reported_user_id`, `reported_event_id` | `uuid` | Exactamente uno es no nulo |
| `reason`, `description` | `report_reason`, `text` | Motivo obligatorio y descripción opcional |
| `status` | `report_status` | `pending`, `archived` o `resolved` |
| `decision_action`, `decision_note` | `moderation_action`, `text` | Decisión opcional |
| `decided_by`, `decided_at` | `uuid`, `timestamptz` | Administrador y momento de resolución |
| `created_at`, `updated_at`, `version` | `timestamptz`, `bigint` | Auditoría y `ETag` |

Para no retrasar el MVP, la decisión se mantiene en el reporte en lugar de crear un agregado separado. Una restricción asegura que la decisión solo exista cuando el reporte esté archivado o resuelto.

### `moderation_audit`

Registro mínimo e inmutable de acceso a datos privados y medidas de moderación.

| Columna | Tipo | Propósito |
| --- | --- | --- |
| `id`, `report_id`, `actor_id` | `uuid` | Recurso y administrador; `actor_id` es nulo para un proceso del sistema |
| `action`, `fields_accessed`, `note` | `varchar(64)`, `jsonb`, `text` | Acción, datos sensibles consultados y motivo |
| `created_at` | `timestamptz` | Instante |

### `push_devices` y `notifications`

Se mantienen porque las notificaciones configurables pertenecen al MVP, pero se limitan a entrega básica.

- `push_devices`: `id`, `user_id`, `expo_push_token` único, `enabled`, `preferences` JSONB, `created_at`, `updated_at`.
- `notifications`: `id`, `recipient_id`, `event_id` opcional, `participation_id` opcional, `type`, `delivery_status`, `created_at`, `sent_at` opcional.

No se implementa un centro de notificaciones complejo, reintentos avanzados ni historial de ubicación.

## Tipos y restricciones

Los tipos iniciales son: `user_status`, `user_role`, `event_category`, `event_access_mode`, `event_status`, `participation_status`, `report_reason`, `report_status` y `moderation_action`.

Las restricciones esenciales son:

- `duration_minutes > 0`, `capacity is null or capacity > 0`, `max_uses is null or max_uses > 0` y `used_count >= 0`.
- `resolved_at` se fija al pasar a `confirmed` o `rejected`; una participación `abandoned` conserva el `resolved_at` de cuando se confirmó y solo exige además `abandoned_at`. `pending` no tiene ninguna de las dos fechas. La restricción `participations_dates_match_status` de `V3` era más estricta y la corrige `V7`.
- Un reporte tiene exactamente un objetivo: usuario o evento.
- Las FKs impiden referencias a usuarios o eventos inexistentes. No se aplican borrados en cascada sobre datos de moderación.

## Índices iniciales

| Tabla | Índice | Motivo |
| --- | --- | --- |
| `events` | GiST sobre `location` | Consultas PostGIS por radio y distancia |
| `events` | B-tree parcial sobre `starts_at` donde `status = 'published' and not is_hidden` | Descubrimiento de eventos futuros |
| `events` | B-tree sobre `(creator_id, status, starts_at)` | Límite de tres eventos activos y eventos propios |
| `participations` | B-tree sobre `(event_id, status)` | Capacidad y lista del creador |
| `participations` | B-tree sobre `(user_id, status)` | Participaciones propias |
| `blocks` | B-tree sobre `(blocker_id, blocked_id)` y el índice inverso | Filtro recíproco de visibilidad |
| `reports` | B-tree sobre `(status, created_at)` | Cola de moderación |
| `invitations` | B-tree sobre `code_hash` | Validación de invitación |

No se introducen índices de texto completo, cachés geoespaciales, particionado ni réplicas durante el MVP. Se medirán antes de añadirlos.

## Plan de migraciones Flyway

| Versión | Contenido |
| --- | --- |
| `V1__extensions_and_types.sql` | Activa `postgis` y `pgcrypto` para `gen_random_uuid()`; crea los tipos enumerados. |
| `V2__users_and_events.sql` | Crea `users`, `events`, restricciones e índices geoespaciales y de descubrimiento. |
| `V3__participations_and_idempotency.sql` | Crea participaciones, sus restricciones de plazas y registros de idempotencia. |
| `V4__invitations_trust_and_moderation.sql` | Crea invitaciones, bloqueos, reportes y auditoría de moderación. |
| `V5__notifications.sql` | Crea dispositivos push y el registro básico de notificaciones. |
| `V6__user_profile_preferences_and_audit.sql` | Añade versión del perfil, preferencia de búsqueda manual y auditoría de cambios de rol. |
| `V7__fix_participation_date_constraint.sql` | Relaja `participations_dates_match_status`: `abandoned` solo exige `abandoned_at`. |
| `V8__account_deletion_requests.sql` | Añade estado `deletion_requested`, fecha de solicitud e índice para el proceso asíncrono de supresión. |
| `V9__push_settings_and_account_retention.sql` | Permite preferencias push sin token, limita el piloto a un dispositivo por cuenta y audita la anonimización tras retención. |

Las migraciones se aplican de forma automática en un despliegue controlado y nunca se editan después de ejecutarse. Un cambio posterior se expresa en una nueva versión. Antes de aplicar migraciones en Supabase Free se realiza una exportación de PostgreSQL.

## Operaciones transaccionales críticas

- Crear o confirmar una participación bloquea el evento o actualiza su capacidad de forma condicional, valida plazas y crea la participación en una única transacción.
- Consumir una invitación incrementa su contador dentro de esa misma transacción.
- Abandonar una participación cambia su estado sin borrarla y libera la plaza en la misma transacción.
- La versión de evento, participación y reporte se incrementa atómicamente para respaldar los `ETag` del contrato.
- Cerrar, ocultar, cancelar o suspender nunca elimina inmediatamente los datos necesarios para moderación, retención o auditoría.

## Elementos diferidos

- El job diario anonimiza cuentas en `deletion_requested` después de 30 días: sustituye el sujeto de Auth y el alias, elimina token push y preferencia de zona, oculta eventos futuros y conserva relaciones, reportes y auditorías obligatorias.
- No hay agenda de trabajos, outbox, cola, analítica de producto, auditoría general de todas las lecturas ni proyecciones de lectura separadas.
- No se persisten búsquedas por ubicación actual, mapas, rutas ni historial de asistentes.
- Si el piloto exige mayor complejidad, se añadirá mediante migraciones nuevas y una actualización previa del contrato API.

## Criterios de aceptación

- El esquema permite crear, descubrir por distancia y participar sin exponer la ubicación exacta antes de confirmar.
- Las restricciones, índices y transacciones del backend permiten cumplir los límites de capacidad, unicidad de participación y tres eventos activos sin depender solo del cliente.
- Las tablas de moderación, bloqueos y notificaciones no introducen flujos adicionales para el usuario del MVP.
- Cada migración es pequeña, reversible mediante una migración posterior y aplicable en orden en desarrollo y despliegue.
