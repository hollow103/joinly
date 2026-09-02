# Contrato API

## Objetivo y alcance

Este documento define el contrato REST del MVP. Es la fuente para elaborar el documento OpenAPI y para alinear los clientes `mobile`, `admin` y el backend. No prescribe tablas ni clases.

La API cubre el perfil de Joinly, descubrimiento y gestión de eventos, participaciones, invitaciones, bloqueos, reportes, moderación y preferencias de notificaciones. Chat, pagos, valoraciones, verificación de identidad, grupos recurrentes y exportación automatizada de datos quedan fuera de este contrato.

## Convenciones

- Base URL: `/api/v1`.
- Transporte: HTTPS; cuerpos y respuestas JSON con nombres en `camelCase`.
- Identificadores: UUID en formato canónico.
- Fechas y horas: RFC 3339 en UTC; la hora local solo se presenta en los clientes.
- Geometrías: GeoJSON WGS 84 (`EPSG:4326`), con coordenadas en orden `[longitud, latitud]`.
- El backend valida el JWT Bearer de Supabase Auth. No recibe ni almacena contraseñas.
- `Idempotency-Key` es obligatorio en `POST /events/{eventId}/participations` y recomendable en las demás operaciones POST que creen recursos. La misma clave, usuario y cuerpo devuelve el resultado inicial durante 24 horas.
- Los recursos editables devuelven `ETag`; una mutación que sustituya datos requiere `If-Match`. Sin este encabezado se responde `428 Precondition Required`; si no coincide, `412 Precondition Failed`.

## Autenticación y autorización

| Situación | Resultado |
| --- | --- |
| Sin JWT válido | `401 Unauthorized` |
| Cuenta suspendida | `403 Forbidden` para cualquier operación de producto |
| Correo no validado o acuerdos no aceptados | `403 Forbidden` para crear eventos o participar; la respuesta identifica el requisito pendiente mediante `code` |
| Recurso inexistente o no visible por bloqueo, privacidad o moderación | `404 Not Found` |
| Rol interno de administrador ausente | `403 Forbidden` en rutas `/admin` |

Supabase Auth es la fuente de identidad. El backend consulta su propia base de datos para conocer el perfil, estado de cuenta y rol de moderación; el rol no se confía como claim de autorización del JWT.

## Visibilidad y privacidad

- Una consulta de descubrimiento o detalle nunca expone `exactLocation` salvo al creador o a quien tenga una participación `confirmed`.
- En eventos privados, solo el creador y participantes confirmados que usaron una invitación válida reciben `exactLocation`.
- Las respuestas públicas incluyen `approximateArea` y `distanceMeters`, nunca dirección, coordenadas precisas ni contacto del creador.
- `confirmedParticipants` solo se devuelve al creador del evento. Una persona participante no puede enumerar a otros asistentes.
- Un bloqueo aplica a ambos sentidos: oculta eventos, detalles y perfiles relacionados, e impide crear o confirmar participaciones.
- Los resultados de búsqueda no persisten la geometría de origen recibida. Solo una preferencia de zona manual guardada explícitamente puede persistirse.

## Modelos compartidos

### Perfil público

```json
{
  "id": "uuid",
  "alias": "senderistaVigo"
}
```

El piloto no admite fotos de perfil. Correo, nombre real, teléfono, identificador de Supabase y perfiles sociales nunca se devuelven como perfil público.

### Evento de descubrimiento

```json
{
  "id": "uuid",
  "title": "Ruta por el Castro",
  "description": "Paseo tranquilo al atardecer.",
  "category": "sportWellbeing",
  "startsAt": "2026-09-12T17:00:00Z",
  "durationMinutes": 120,
  "accessMode": "direct",
  "capacity": 12,
  "confirmedCount": 5,
  "availability": "available",
  "approximateArea": "Monte do Castro, Vigo",
  "distanceMeters": 1350,
  "creator": { "id": "uuid", "alias": "senderistaVigo" }
}
```

Valores: `category` es `sportWellbeing`, `cultureLeisure`, `learning`, `communityVolunteering`, `pets` o `networking`; `accessMode` es `direct`, `approval` o `privateInvitation`; `capacity` es entero positivo o `null`; `availability` es `available` o `full`.

### Evento de detalle

Incluye todos los campos del evento de descubrimiento, `notes`, `updatedAt`, `myParticipation` y, solo cuando la regla de visibilidad lo permite, `exactLocation`:

```json
{
  "exactLocation": {
    "type": "Point",
    "coordinates": [-8.7207, 42.2383]
  }
}
```

El creador recibe además `confirmedParticipants`; ningún otro rol recibe ese campo.

### Participación

```json
{
  "id": "uuid",
  "eventId": "uuid",
  "status": "confirmed",
  "requestedAt": "2026-09-01T12:00:00Z",
  "resolvedAt": "2026-09-01T12:00:01Z"
}
```

Estados: `pending`, `confirmed`, `rejected` y `abandoned`. Solo `pending` puede transitar a `confirmed` o `rejected`; solo `confirmed` puede transitar a `abandoned` antes del inicio.

### Paginación por cursor

Las colecciones paginadas responden:

```json
{
  "items": [],
  "page": { "nextCursor": "opaque-cursor-or-null" }
}
```

El cursor es opaco, solo válido con los mismos filtros y orden, y no debe ser construido por clientes.

### Error

Los errores siguen RFC 9457 y añaden un código estable de producto:

```json
{
  "type": "https://api.joinly.example/problems/event-full",
  "title": "Event is full",
  "status": 409,
  "code": "event_full",
  "detail": "No places are available for this event.",
  "fields": { "startsAt": "must be in the future" }
}
```

`fields` solo aparece para errores de validación. Códigos previstos: `validation_error`, `not_found`, `email_not_verified`, `agreements_not_accepted`, `event_full`, `event_not_joinable`, `event_not_editable`, `event_not_cancellable`, `event_not_approval`, `event_not_private`, `event_started`, `active_event_limit_reached`, `capacity_below_confirmed`, `cannot_join_own_event`, `participation_exists`, `participation_not_confirmed`, `participation_not_pending`, `if_match_required`, `idempotency_key_conflict`, `invitation_invalid`, `cannot_block_self` y `concurrent_update`.

## Recursos de la persona usuaria

| Método y ruta | Autorización | Solicitud | Respuesta |
| --- | --- | --- | --- |
| `GET /me` | Persona autenticada | - | `200` perfil privado y estado de requisitos |
| `PUT /me` | Persona autenticada | `alias`, acuerdos y `manualSearchArea` opcional | `200` perfil creado o actualizado; `If-Match` solo si ya existía |
| `DELETE /me` | Persona autenticada | - | `202` solicitud de supresión aceptada |
| `PUT /me/push-settings` | Persona autenticada | `enabled`, preferencias por tipo, `expoPushToken` opcional | `200` preferencias |

`GET /me` devuelve las fechas de aceptación de términos, privacidad y normas, y los indicadores `emailVerified` y `status`. La creación inicial del perfil se realiza mediante `PUT /me` tras el registro en Supabase e incluye obligatoriamente las versiones y fechas de aceptación de los tres acuerdos; las actualizaciones posteriores requieren `If-Match`.

La eliminación de cuenta es asíncrona e idempotente. `DELETE /me` registra la solicitud, revoca el acceso de producto de inmediato y deja la supresión física para el proceso de retención, con un máximo de 30 días salvo retención legal aplicable.

En una actualización, `manualSearchArea` ausente conserva la preferencia actual y `null` la elimina. La aceptación de un documento solo actualiza su versión y fecha si cambia la versión aceptada.

## Eventos y descubrimiento

| Método y ruta | Autorización | Solicitud | Respuesta |
| --- | --- | --- | --- |
| `POST /events/search` | Persona activa | Filtros geográficos y de descubrimiento | `200` colección de eventos de descubrimiento |
| `POST /events` | Persona activa, correo validado y acuerdos aceptados | Datos de creación | `201` evento publicado y `ETag` |
| `GET /events/{eventId}` | Persona activa con visibilidad | - | `200` detalle condicionado por visibilidad y `ETag` |
| `PATCH /events/{eventId}` | Creador; campos principales antes del inicio y `notes` hasta el fin | Campos editables | `200` evento actualizado y `ETag` |
| `POST /events/{eventId}/cancellation` | Creador antes del inicio | `reason` opcional | `204` |
| `GET /me/events` | Persona activa | `cursor`, `limit`, `status` opcional | `200` colección de eventos propios |

`POST /events/search` evita enviar geometrías en una URL y no almacena su cuerpo:

```json
{
  "origin": { "type": "Point", "coordinates": [-8.7207, 42.2383] },
  "radiusMeters": 5000,
  "categories": ["sportWellbeing", "cultureLeisure"],
  "cursor": null,
  "limit": 20
}
```

`radiusMeters` admite de 100 a 50000 metros y `limit` de 1 a 50 (por defecto 20); el orden es distancia ascendente y, a igual distancia, `startsAt` ascendente e `id`. El cursor es opaco, va ligado a los filtros y al orden de la petición y se rechaza con `400 validation_error` si se altera o se reutiliza con otros filtros. `distanceMeters` se redondea a la centena de metros para dificultar la trilateración. Una colección vacía en la primera página incluye `suggestedRadiusMeters` (el doble del radio, hasta 50000) cuando es razonable ampliar el radio. Los eventos `privateInvitation` y los ya finalizados (`startsAt + durationMinutes` en el pasado) no aparecen en descubrimiento.

El cuerpo de creación exige `title`, `description`, `category`, `startsAt`, `durationMinutes`, `exactLocation` y `accessMode`; admite `capacity` y `notes`. `startsAt` debe ser futuro, `capacity` es positiva si existe y el creador no puede tener tres eventos activos. La API calcula `approximateArea`; no acepta este valor del cliente. El piloto lo deriva redondeando la ubicación exacta a una rejilla de ~1,1 km (dos decimales) y presentándola como texto, sin geocodificación externa; se sustituirá por una etiqueta legible cuando exista un origen de datos sin coste.

Las ediciones (`PATCH`) requieren `If-Match`: sin la cabecera se responde `428 if_match_required` y si no coincide `412 concurrent_update`. Un evento ajeno o inexistente responde `404 not_found`. Los campos principales solo se editan mientras el evento no ha comenzado; después solo `notes` y hasta que finaliza. Un intento fuera de esos plazos responde `409 event_not_editable`. `POST /events/{eventId}/cancellation` responde `409 event_not_cancellable` si el evento ya comenzó, se canceló o se cerró.

Un evento se crea publicado. Sus estados son `published`, `cancelled` y `closed`. `published` deja de ser un evento activo al empezar; un proceso programado lo marca `closed` al finalizar `startsAt + durationMinutes`, lo retira del descubrimiento y agenda su eliminación o anonimización en 30 días. Cancelar un evento notifica a participantes confirmados.

Las ediciones permitidas antes del inicio son título, descripción, categoría, horario, duración, ubicación, capacidad, modalidad de acceso y observaciones. Las observaciones pueden actualizarse hasta el fin del evento. Una reducción de capacidad por debajo de participaciones confirmadas responde `409`.

## Participaciones e invitaciones

| Método y ruta | Autorización | Solicitud | Respuesta |
| --- | --- | --- | --- |
| `POST /events/{eventId}/participations` | Persona activa apta para participar | `invitationCode` solo para privados | `201` participación; confirmada o pendiente |
| `DELETE /events/{eventId}/participation` | Participante confirmado antes del inicio | - | `204` |
| `GET /events/{eventId}/participations` | Solo creador | `cursor`, `limit`, `status=confirmed` | `200` participantes confirmados paginados |
| `PATCH /events/{eventId}/participations/{participationId}` | Solo creador; evento con aprobación | `status: confirmed` o `rejected` | `200` participación resuelta; requiere `If-Match` |
| `POST /events/{eventId}/invitations` | Solo creador; evento privado | `expiresAt` opcional, `maxUses` opcional | `201` invitación con código secreto |
| `DELETE /events/{eventId}/invitations/{invitationId}` | Solo creador | - | `204` |

La creación de participación se ejecuta en una transacción que comprueba estado del evento, inicio futuro, bloqueo recíproco, invitación si corresponde y capacidad. Si el evento es directo, crea `confirmed`; si es con aprobación, crea `pending`; si es privado, el código debe ser válido y la política inicial crea `confirmed`. Reintentar la misma petición con el mismo `Idempotency-Key` devuelve la participación ya creada.

Una participación confirmada revela `exactLocation` en la respuesta y en posteriores detalles del evento. Abandonar es idempotente: si ya está `abandoned`, devuelve `204`; libera plaza en la misma transacción. No hay lista de espera ni solicitudes para eventos completos.

El código de invitación se devuelve exclusivamente al creador al crearla. No existe una ruta pública para consultar si un código corresponde a un evento, para evitar revelar eventos privados.

`GET /events/{eventId}/participations` admite `status=confirmed` (por defecto) o `status=pending`; el creador usa `pending` para localizar solicitudes a resolver mientras no exista la notificación de Fase 4. Un evento completo tampoco admite nuevas solicitudes `approval` (`409 event_full`). Reintentar `POST /events/{eventId}/participations` con la misma `Idempotency-Key` y un cuerpo distinto responde `409 idempotency_key_conflict`. Una participación `rejected` puede volver a solicitarse; `pending`, `confirmed` o `abandoned` responden `409 participation_exists`.

## Bloqueos y reportes

| Método y ruta | Autorización | Solicitud | Respuesta |
| --- | --- | --- | --- |
| `POST /blocks` | Persona activa | `blockedUserId` | `201` bloqueo recíproco lógico |
| `DELETE /blocks/{blockedUserId}` | Persona activa que creó el bloqueo | - | `204` |
| `GET /blocks` | Persona activa | `cursor`, `limit` | `200` bloqueos creados por la persona |
| `POST /reports` | Persona activa con acceso al objetivo | `targetType`, `targetId`, `reason`, `description` opcional | `201` reporte |

`targetType` es `user` o `event`. `reason` es `inappropriateContent`, `abusiveBehavior`, `fraudulentEvent`, `misleadingLocation` u `other`. La respuesta de reporte no contiene datos adicionales sobre el objetivo ni el resultado de moderación.

Crear un bloqueo es idempotente. No se crea una segunda relación inversa: el modelo persiste una relación de bloqueo y todas las consultas e intentos de participación evalúan ambos sentidos.

## Moderación

| Método y ruta | Autorización | Solicitud | Respuesta |
| --- | --- | --- | --- |
| `GET /admin/reports` | Administrador interno | `status`, `cursor`, `limit` | `200` reportes y contexto permitido para moderación |
| `GET /admin/reports/{reportId}` | Administrador interno | - | `200` detalle de reporte |
| `PATCH /admin/reports/{reportId}` | Administrador interno | decisión | `200` reporte resuelto; requiere `If-Match` |

El cuerpo de decisión contiene `status` (`archived` o `resolved`), `action` (`none`, `hideEvent`, `warnUser` o `suspendUser`) y `note` opcional para auditoría interna. Una decisión `hideEvent` elimina el evento de descubrimiento y bloquea nuevas participaciones. `suspendUser` revoca sus operaciones de producto. Cada decisión registra administrador, instante y acción; reportes y decisiones se conservan 12 meses.

## Notificaciones y efectos secundarios

- El backend registra notificaciones de solicitud, aprobación, rechazo, cambio y cancelación; Expo Push Service se usa para su entrega según `push-settings`.
- El registro ocurre dentro de la transacción del caso de uso; un proceso programado (`joinly.notifications.dispatch-cron`) reclama en lote las notificaciones pendientes, resuelve el dispositivo del destinatario y las envía a Expo. Cada notificación tiene un único intento: el envío la marca `sent`, cualquier error de Expo la marca `failed` sin reintento y una respuesta `DeviceNotRegistered` además borra el token caducado.
- Se respeta la preferencia por tipo de `push-settings`: un destinatario sin dispositivo, con la entrega deshabilitada o con el tipo silenciado se completa sin enviar nada.
- La solicitud de unión solo notifica al creador en eventos con aprobación; la unión directa no genera aviso. El cambio y la cancelación de un evento notifican únicamente a los participantes confirmados; editar solo las notas u observaciones no notifica.
- La entrega de una notificación no modifica la respuesta síncrona de la operación que la originó.
- Las operaciones de cierre de eventos, retención, supresión de cuentas y envío de notificaciones son asíncronas, repetibles e idempotentes.
- El historial de notificaciones dentro de la aplicación (`GET /me/notifications`) queda diferido; la entrega del MVP es solo push y la tabla `notifications` es un registro interno.

## Estados HTTP

| Estado | Uso |
| --- | --- |
| `200 OK` | Lectura o actualización correcta |
| `201 Created` | Evento, participación, invitación, bloqueo o reporte creados |
| `202 Accepted` | Solicitud asíncrona de eliminación de cuenta |
| `204 No Content` | Cancelación, abandono, revocación o desbloqueo correctos |
| `400 Bad Request` | Sintaxis o GeoJSON inválido |
| `401 Unauthorized` | JWT ausente, inválido o expirado |
| `403 Forbidden` | Cuenta no apta, falta de rol o requisito pendiente |
| `404 Not Found` | Recurso inexistente o deliberadamente oculto |
| `409 Conflict` | Capacidad agotada, límite de eventos, estado inválido o restricción de negocio |
| `412 Precondition Failed` | `If-Match` no coincide con el `ETag` actual |
| `422 Unprocessable Content` | Campos válidos sintácticamente pero incumplen reglas de validación |
| `428 Precondition Required` | Falta `If-Match` en una mutación concurrente |

## Criterios de aceptación del contrato

- Todos los endpoints que devuelven eventos aplican la misma política de ubicación, participantes, bloqueos y moderación.
- Una operación de participación no puede sobrepasar una capacidad bajo peticiones simultáneas.
- Un cliente puede reintentar la creación de una participación sin duplicar plazas ni notificaciones.
- Una edición concurrente no sobrescribe cambios ajenos sin un `ETag` coincidente.
- El contrato permite generar una especificación OpenAPI completa sin decidir aún modelos de persistencia ni estructura interna de módulos.
