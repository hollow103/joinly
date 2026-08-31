# Autorización y permisos

## Propósito

Este documento concreta la autorización del contrato en `docs/11-contrato-api.md`. Define qué actor puede ejecutar cada acción, qué datos puede recibir y cómo se resuelven las reglas que compiten entre sí.

## Principios

- La autenticación identifica a la persona; la autorización evalúa su estado interno, propiedad del recurso, participación, bloqueo, visibilidad y rol.
- Se deniega por defecto. El backend aplica siempre las reglas, incluidos los clientes `mobile` y `admin`.
- La respuesta no revela la existencia de recursos bloqueados, privados u ocultos: responde `404 Not Found`.
- La minimización de datos prevalece sobre el rol. Los datos privados solo se entregan si son necesarios para la acción autorizada.
- Las comprobaciones de capacidad, bloqueo y estado se realizan dentro de la misma transacción que crea, confirma o abandona una participación.

## Actores y estados

| Actor o estado | Definición |
| --- | --- |
| Anónimo | No presenta un JWT de Supabase válido. No accede a la API de producto. |
| Usuario activo | Tiene JWT válido, perfil interno activo y puede descubrir eventos. Crear o participar exige además correo verificado y aceptación de los acuerdos. |
| Creador | Usuario activo que es propietario de un evento concreto. No es un rol persistente. |
| Participante confirmado | Usuario con participación `confirmed` en un evento concreto. |
| Administrador | Usuario activo con rol interno `admin`. Es el único rol de moderación del MVP. |
| Usuario suspendido | Usuario con estado interno `suspended`; no puede usar funciones de producto ni moderación. |
| Sistema | Procesos internos de cierre, retención, supresión y notificaciones. No es una identidad de cliente. |

Solo existen los roles internos `user` y `admin`. La asignación o revocación de `admin` se realiza mediante un proceso manual y controlado fuera de la API pública; no se expone gestión de roles durante el MVP.

## Resolución de autorización

Para cada petición autenticada, el backend sigue este orden:

1. Valida firma, emisor, audiencia, caducidad y sujeto del JWT de Supabase.
2. Resuelve el perfil interno por el identificador externo `sub`.
3. Rechaza con `403` si el perfil está suspendido o no cumple un requisito conocido de la operación, como correo validado o acuerdos pendientes.
4. Carga el recurso y evalúa si es propiedad de la persona, si tiene participación aplicable y si existe un bloqueo en cualquiera de los sentidos.
5. Si el recurso queda oculto por bloqueo, privacidad, evento privado sin participación confirmada o moderación, responde `404`.
6. Evalúa la política específica de la acción y los estados del recurso.
7. Proyecta la respuesta al nivel de datos permitido para ese actor.

Un JWT válido no basta para autorizar acciones: el estado interno se consulta en cada solicitud. Esto evita que una sesión ya emitida pueda operar tras una suspensión.

## Matriz de perfiles y acuerdos

| Acción | Usuario activo | Correo validado y acuerdos aceptados | Administrador |
| --- | --- | --- | --- |
| Consultar o editar su propio perfil | Sí | No adicional | Sí |
| Buscar y consultar eventos visibles | Sí | No adicional | Sí, sujeto a la necesidad de moderación |
| Crear, editar o cancelar un evento propio | No | Sí | Solo si también es propietario; no por ser admin |
| Solicitar, confirmar o abandonar una participación propia | No | Sí | Solo como usuario normal |
| Crear o revocar invitaciones de un evento propio | No | Sí y ser creador | Solo si también es creador |
| Bloquear, desbloquear o reportar | Sí | No adicional | Sí, como usuario normal |
| Revisar reportes y aplicar medidas | No | No | Sí |

La aceptación de términos, política de privacidad y normas de convivencia se registra al crear el perfil. Si una versión obligatoria deja de estar aceptada, se bloquean creación y participación hasta renovarla.

## Permisos sobre eventos

| Acción | Regla |
| --- | --- |
| Buscar eventos | Usuario activo; solo eventos publicados, futuros, no ocultos, no completos y visibles tras aplicar bloqueos y modalidad de acceso. |
| Ver detalle | Creador, participante confirmado o usuario activo con visibilidad pública. Los eventos privados requieren participación confirmada o propiedad. |
| Ver ubicación exacta | Solo creador o participante confirmado; en privado, la participación debe proceder de una invitación válida. |
| Crear evento | Usuario activo, correo verificado, acuerdos aceptados y menos de tres eventos activos. |
| Editar campos principales | Solo creador y antes de `startsAt`; requiere `If-Match`. |
| Editar observaciones | Solo creador y hasta el fin del evento; requiere `If-Match`. |
| Cancelar evento | Solo creador y antes de `startsAt`. |
| Ver participantes confirmados | Solo creador. Las respuestas no incluyen solicitudes pendientes salvo en la gestión de solicitudes del propio creador. |
| Ocultar evento | Solo administrador, como acción vinculada a una decisión de moderación auditada. |

Las reglas de bloqueo y moderación prevalecen sobre propiedad o participación al consultar detalles del evento. La excepción es la lista de participantes confirmados, que el creador conserva para gestionar la participación ya confirmada. La propiedad no permite eludir límites de tiempo, capacidad o la ocultación del evento.

## Permisos sobre participaciones e invitaciones

| Acción | Regla |
| --- | --- |
| Crear participación directa | Usuario apto; evento futuro, publicado, visible, con plaza y sin bloqueo recíproco. Crea `confirmed`. |
| Solicitar participación | Mismas reglas; solo en acceso `approval`. Crea `pending`. |
| Usar invitación privada | Mismas reglas y código no revocado, no expirado y con usos disponibles. Crea `confirmed`. |
| Aprobar o rechazar solicitud | Solo creador del evento con acceso `approval`; solo una participación `pending`. |
| Abandonar participación | Solo su participante confirmado, antes de `startsAt`. Siempre libera plaza de forma transaccional. |
| Crear o revocar invitación | Solo creador de un evento `privateInvitation` antes de su inicio. |
| Consultar códigos de invitación | Solo creador; el código se devuelve al crearlo y nunca se expone por rutas públicas. |

Una persona no puede crear otra participación para sí misma cuando ya existe una participación `pending`, `confirmed` o `abandoned` para el mismo evento. El resultado se mantiene idempotente mediante `Idempotency-Key`.

## Bloqueos

- Un bloqueo se crea y elimina únicamente por quien lo inició, pero su efecto es recíproco.
- Si existe un bloqueo entre creador y posible participante, el evento no aparece en búsqueda, su detalle responde `404` y una participación nueva se rechaza sin revelar el bloqueo.
- Si el bloqueo se crea después de una participación confirmada, esta no se abandona automáticamente y mantiene su plaza. No se puede revocar una ubicación exacta ya revelada.
- Tras ese bloqueo, las consultas de evento entre las dos personas responden `404`; el participante conserva exclusivamente el derecho de abandonar su propia participación antes del inicio.
- El creador mantiene la lista de participantes confirmados conforme a la regla del MVP. El bloqueo no habilita ninguna interacción adicional entre ambas personas.

## Reportes y moderación

| Acción | Usuario activo | Administrador |
| --- | --- | --- |
| Crear reporte de un usuario o evento visible | Sí | Sí |
| Consultar sus propios reportes | Fuera de alcance del MVP | - |
| Consultar cola y detalle de reportes | No | Sí |
| Archivar o resolver reporte | No | Sí |
| Ocultar evento, advertir o suspender usuario | No | Sí, mediante una decisión de reporte |

El administrador puede ver el motivo, descripción, objetivo y el contexto mínimo necesario para resolver un reporte. En un evento privado, la ubicación exacta y los participantes solo se revelan al administrador si son necesarios para investigar el reporte concreto. Cada acceso a esos datos y cada decisión se auditan con administrador, reporte, campos consultados, instante, acción y nota interna.

Ocultar un evento lo retira de descubrimiento y bloquea nuevas participaciones; no lo cancela. Las participaciones confirmadas se mantienen y el creador y participantes confirmados reciben una notificación de ocultación. Solo una cancelación posterior del creador, si sigue autorizada, termina el evento antes de su inicio.

## Suspensión de cuenta

- La suspensión es indefinida hasta una reactivación manual por un administrador autorizado fuera de la API pública.
- Al suspender, el sistema invalida o revoca las sesiones de Supabase y el backend rechaza cualquier solicitud posterior por el estado interno `suspended`, incluso antes de que una sesión haya caducado.
- Una cuenta suspendida no puede crear, descubrir, consultar detalles, participar, reportar, bloquear ni acceder a moderación.
- Sus eventos publicados se retiran de descubrimiento y no admiten nuevas participaciones. El tratamiento de eventos y participaciones existentes se conserva para la decisión de moderación y debe quedar auditado.
- La suspensión no elimina datos ni sustituye al proceso de supresión de cuenta.

## Respuestas y no revelación

| Caso | Respuesta |
| --- | --- |
| JWT ausente, inválido o expirado | `401 Unauthorized` |
| Cuenta suspendida, correo no verificado o acuerdos pendientes para una acción conocida | `403 Forbidden` con código de requisito |
| Falta de rol `admin` en una ruta administrativa conocida | `403 Forbidden` |
| Evento, perfil, participación o reporte oculto por bloqueo, privacidad o moderación | `404 Not Found` uniforme |
| Recurso visible pero estado de negocio incompatible, como evento lleno o iniciado | `409 Conflict` con código de negocio |
| Actualización con versión desfasada | `412 Precondition Failed` |

Un `404` por ocultación no incluye el motivo ni metadatos del recurso. Los registros internos sí conservan el motivo de autorización para diagnóstico y auditoría.

## Auditoría mínima

Las siguientes acciones generan un registro de auditoría inmutable: asignación o retirada del rol administrador, acceso de moderación a datos privados, decisión sobre un reporte, ocultación de evento, advertencia, suspensión, reactivación y ejecución de supresión de cuenta. Cada registro incluye actor o proceso, recurso, acción, instante, resultado y la razón o nota disponible.

Los reportes, decisiones y auditorías relacionadas se conservan 12 meses. El acceso a esos registros queda limitado a administradores cuando sea necesario para moderación u obligaciones aplicables.

## Criterios de aceptación

- Ser creador se determina por propiedad del evento, no por un rol adicional.
- Ninguna consulta de usuario puede revelar la existencia de un recurso bloqueado, privado u oculto.
- Una cuenta suspendida no puede operar con un JWT emitido antes de la suspensión.
- Un administrador no recibe datos privados de eventos sin relación con una investigación concreta.
- Un bloqueo posterior a una confirmación mantiene la plaza, pero no devuelve de nuevo el detalle del evento ni permite interacción adicional.
- Toda medida de moderación que modifique visibilidad o estado tiene una decisión y auditoría asociadas.
