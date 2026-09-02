# Resultados de pruebas de ciclo backend

## Ejecución

Fecha: 2026-09-02

Objetivo: validar el ciclo automatizado disponible del backend, desde las migraciones en una base PostGIS vacía hasta las reglas de eventos, participación, bloqueo, moderación, retención y cierre programado.

| Comprobación | Comando | Resultado |
| --- | --- | --- |
| Suite backend | `./backend/mvnw -f backend/pom.xml test` | Correcta: 44 pruebas ejecutadas, 43 correctas, 0 fallos, 0 errores y 1 omitida |
| Formato Java | `./backend/mvnw -f backend/pom.xml spotless:check` | Correcto: 65 archivos Java cumplen el formato |
| Contrato API | `npx --yes @redocly/cli lint openapi.yaml` | Correcto: contrato OpenAPI valido |
| Artefacto ejecutable | `docker compose up --build --detach` | Correcto: imagen `joinly-backend` reconstruida |
| Disponibilidad local | `curl --fail --silent --show-error http://localhost:8080/actuator/health/readiness` | Correcto: `{"status":"UP"}` |

La suite usa Testcontainers con `postgis/postgis:16-3.4`. Cada clase de integracion inicia una base limpia, Flyway aplica las migraciones V1 a V9 y Supabase se sustituye por un cliente simulado. Por tanto, las reglas API y SQL se comprueban contra PostgreSQL/PostGIS real sin depender de red ni de datos externos.

## Cobertura del ciclo

| Area | Prueba o pruebas | Resultado comprobado |
| --- | --- | --- |
| Arranque y migraciones | `BackendBootstrapIntegrationTest` | La aplicacion inicia y Flyway migra una base PostGIS vacia |
| Perfil y validacion | `ProfileRequestTest` | La validacion del payload de perfil rechaza entradas invalidas |
| Eventos y descubrimiento | `EventApiIntegrationTest` | Creacion concurrente con limite de tres activos, capacidad nunca inferior a participantes confirmados, edicion con ETag, cancelacion, horario futuro y proyeccion privada de ubicacion y participantes |
| Participacion | `ParticipationApiIntegrationTest` | Union directa, aprobacion, invitaciones privadas, abandono e idempotencia de solicitudes |
| Capacidad concurrente | `ParticipationApiIntegrationTest` | Dos solicitudes simultaneas por la ultima plaza producen exactamente una confirmacion |
| Bloqueos | `ParticipationApiIntegrationTest` | El bloqueo reciproco oculta el evento, impide unirse y sus operaciones son idempotentes; tras confirmar, permite abandonar sin volver a revelar el evento |
| Moderacion y suspension | `EventApiIntegrationTest` | Solo administracion resuelve reportes; ocultar y suspender retiran eventos y bloquean operaciones |
| Retencion y ajustes push | `EventApiIntegrationTest` | Solicitud de eliminacion, anonimizado tras el periodo de gracia y persistencia de preferencias push |
| Cierre programado | `EventApiIntegrationTest` B-12 | Un evento descubierto pasa a `closed` al terminar, desaparece para terceros, el creador conserva acceso y una segunda ejecucion no altera su version |
| Entrega de notificaciones | `NotificationDeliveryIntegrationTest` B-14 | Solicitud, decision, cambio y cancelacion registran una notificacion `pending` para el destinatario correcto; el despacho la envia una vez por Expo y la marca `sent`; la union directa no notifica al creador; un tipo silenciado o un dispositivo deshabilitado no envia; `DeviceNotRegistered` la marca `failed` y borra el token; una segunda ejecucion no reenvia |

El escenario B-12 recorre por API la creacion y el descubrimiento, modifica el tiempo solo para simular el final del evento, invoca el servicio de cierre y comprueba las proyecciones resultantes. La consulta SQL condicional se valida mediante la version persistida: pasa de `0` a `1` en el primer cierre y se mantiene en `1` al repetirlo.

## Matriz de endpoints

Los 23 endpoints declarados en `openapi.yaml` tienen al menos un recorrido principal automatizado. Las pruebas HTTP usan `MockMvc`, JWT sinteticos y PostGIS real mediante Testcontainers; comprueban respuesta, proyeccion y estado persistido cuando aplica.

| Endpoint | Caso de uso validado | Prueba |
| --- | --- | --- |
| `GET /me` | Lee el perfil privado recien creado y su ETag | `ProfileApiIntegrationTest.createsReadsAndUpdatesTheProfileWithOptimisticConcurrency` |
| `PUT /me` | Crea, actualiza con ETag, conserva una zona ausente, elimina una zona `null` y rechaza acuerdos obsoletos | `ProfileApiIntegrationTest.createsReadsAndUpdatesTheProfileWithOptimisticConcurrency`; `rejectsAProfileThatDoesNotAcceptCurrentAgreementVersions` |
| `DELETE /me` | Solicita borrado, revoca acceso y admite repeticion | `EventApiIntegrationTest.acceptsAccountDeletionAndRevokesProductAccessImmediately` |
| `PUT /me/push-settings` | Guarda preferencias sin token de dispositivo | `EventApiIntegrationTest.persistsPushSettingsWithoutADeviceToken` |
| `GET /me/events` | Lista eventos propios publicados y cerrados | `EventApiIntegrationTest.createsPublishedEventAndReturnsItAmongOwnEvents`; `closesEndedPublishedEventsIdempotently` |
| `POST /events` | Publica un evento con ETag; impone fecha futura, correo validado y limite de activos incluso bajo concurrencia | `EventApiIntegrationTest.createsPublishedEventAndReturnsItAmongOwnEvents`; `rejectsAFourthActiveEvent`; `concurrentCreatesCannotExceedThreeActiveEvents`; `rejectsAnEventThatStartsInThePast`; `refusesEventCreationWhenTheEmailIsNotVerified` |
| `POST /events/search` | Descubre, pagina, limita datos privados y excluye cancelados, privados, bloqueados, suspendidos y cerrados | `EventApiIntegrationTest.neverExposesExactLocationOrParticipantsToANonParticipant`; `paginatesDiscoveryByAStableCursor`; `closesEndedPublishedEventsIdempotently`; `ParticipationApiIntegrationTest.reciprocalBlockHidesTheEventAndDeniesJoining` |
| `GET /events/{eventId}` | Proyecta detalle para creador, participante y tercero; oculta recursos cancelados, privados, bloqueados y cerrados, incluido un bloqueo posterior a confirmar | `EventApiIntegrationTest.neverExposesExactLocationOrParticipantsToANonParticipant`; `keepsPrivateInvitationEventsOutOfDiscoveryAndOtherUsersDetail`; `closesEndedPublishedEventsIdempotently`; `ParticipationApiIntegrationTest.directJoinConfirmsAndRevealsExactLocationToTheParticipantOnly`; `blockingAfterConfirmationHidesTheEventButStillAllowsAbandonment` |
| `PATCH /events/{eventId}` | Edita con ETag y rechaza version ausente, obsoleta, evento ya iniciado o capacidad inferior a participantes confirmados | `EventApiIntegrationTest.enforcesTheIfMatchContractOnEdits`; `refusesMainFieldEditsAndCancellationOnceTheEventHasStarted`; `rejectsReducingCapacityBelowConfirmedParticipants` |
| `POST /events/{eventId}/cancellation` | Cancela y retira de descubrimiento; rechaza tras el inicio | `EventApiIntegrationTest.cancellationRemovesTheEventFromDiscoveryAndDetail`; `refusesMainFieldEditsAndCancellationOnceTheEventHasStarted` |
| `GET /events/{eventId}/participations` | Creador lista confirmados y solicitudes; participante no enumera asistentes | `ParticipationApiIntegrationTest.directJoinConfirmsAndRevealsExactLocationToTheParticipantOnly`; `approvalFlowLetsTheCreatorConfirmOrRejectAndReRequest` |
| `POST /events/{eventId}/participations` | Union directa, solicitud, invitacion privada, idempotencia, bloqueo y carrera por la ultima plaza | `ParticipationApiIntegrationTest.directJoinConfirmsAndRevealsExactLocationToTheParticipantOnly`; `approvalFlowLetsTheCreatorConfirmOrRejectAndReRequest`; `privateInvitationJoinConsumesTheCodeAndRejectsRevokedOrExhaustedOnes`; `idempotencyKeyReplaysTheParticipationAndConflictsOnAReusedKey`; `concurrentJoinsToTheLastPlaceConfirmAtMostOne` |
| `DELETE /events/{eventId}/participation` | Abandona de forma idempotente y libera capacidad, tambien tras bloquear al creador | `ParticipationApiIntegrationTest.abandoningBeforeStartFreesThePlace`; `blockingAfterConfirmationHidesTheEventButStillAllowsAbandonment` |
| `PATCH /events/{eventId}/participations/{participationId}` | Creador confirma o rechaza solicitudes con ETag | `ParticipationApiIntegrationTest.approvalFlowLetsTheCreatorConfirmOrRejectAndReRequest` |
| `POST /events/{eventId}/invitations` | Creador genera codigo privado de un solo uso | `ParticipationApiIntegrationTest.privateInvitationJoinConsumesTheCodeAndRejectsRevokedOrExhaustedOnes` |
| `DELETE /events/{eventId}/invitations/{invitationId}` | Creador revoca una invitacion y bloquea su uso posterior | `ParticipationApiIntegrationTest.privateInvitationJoinConsumesTheCodeAndRejectsRevokedOrExhaustedOnes` |
| `GET /blocks` | Lista solo bloqueos propios | `ParticipationApiIntegrationTest.blocksAreIdempotentListableAndRemovable` |
| `POST /blocks` | Crea bloqueo reciproco, rechaza autobloqueo y oculta eventos | `ParticipationApiIntegrationTest.blocksAreIdempotentListableAndRemovable`; `reciprocalBlockHidesTheEventAndDeniesJoining` |
| `DELETE /blocks/{blockedUserId}` | Elimina bloqueo de forma idempotente | `ParticipationApiIntegrationTest.blocksAreIdempotentListableAndRemovable` |
| `POST /reports` | Crea reportes visibles de evento y usuario con ETag | `EventApiIntegrationTest.allowsAdminToResolveAnEventReportByHidingTheEvent`; `suspensionHidesCreatorsEventsAndPreventsNewParticipations` |
| `GET /admin/reports` | Administrador lista la cola filtrada por pendientes | `EventApiIntegrationTest.listsPendingReportsForAnAdmin` |
| `GET /admin/reports/{reportId}` | Administrador consulta detalle con ETag; usuario no administrador recibe `403` | `EventApiIntegrationTest.allowsAdminToResolveAnEventReportByHidingTheEvent` |
| `PATCH /admin/reports/{reportId}` | Administrador resuelve y aplica ocultacion o suspension auditada | `EventApiIntegrationTest.allowsAdminToResolveAnEventReportByHidingTheEvent`; `suspensionHidesCreatorsEventsAndPreventsNewParticipations` |

## Prueba omitida

`SupabaseProfileIntegrationTest` se omitio en esta ejecucion porque requiere un JWT real y configuracion de Supabase. Es una integracion externa deliberadamente separada de la suite hermetica; no es un fallo de la ejecucion. El ciclo de perfil y los permisos de `GET` y `PUT /me` quedan cubiertos tambien de forma hermetica por `ProfileApiIntegrationTest`. La integracion con Supabase se valido previamente para el MVP controlado, como consta en `docs/16-plan-implementacion-mvp.md`.

## Limites de esta ejecucion

- No sustituye el recorrido manual Android contra preproduccion definido en `docs/14-estrategia-pruebas.md`.
- B-14 valida el registro y el despacho de notificaciones con un cliente Expo simulado; no ejercita la llamada HTTP real a Expo Push Service ni la recepcion en un dispositivo.
- No cubre el panel de moderacion, que todavia no esta implementado.
- El readiness confirma que el backend local reconstruido esta disponible; no equivale a una prueba de despliegue productivo.

## Conclusion

El ciclo automatizado backend disponible es correcto: no hay fallos de pruebas, formato ni contrato, y el backend reconstruido queda operativo con PostGIS local. Los limites indicados siguen siendo trabajo pendiente de las fases de endurecimiento, preproduccion y cliente.
