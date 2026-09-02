# Estrategia de pruebas MVP

## Objetivo

El piloto necesita pruebas suficientes para proteger a las personas usuarias y validar el flujo principal sin retrasar el lanzamiento. La estrategia inicial es pequeña: automatizar reglas de alto riesgo y ejecutar recorridos manuales cortos antes de cada APK de prueba.

No se fijan porcentajes de cobertura, pruebas end-to-end completas, snapshots, pruebas de carga ni una plataforma de automatización durante esta fase. Se reforzarán tras validar la adopción del MVP.

## Prioridades

| Prioridad | Riesgo que cubre | Enfoque inicial |
| --- | --- | --- |
| Crítica | Filtrar ubicación o asistentes | Pruebas unitarias de proyección y autorización de API |
| Crítica | Permitir acceso, unión o visibilidad entre personas bloqueadas | Pruebas unitarias de reglas de bloqueo y pruebas de API focalizadas |
| Crítica | Superar la capacidad o confirmar tras el inicio | Pruebas de servicio y una prueba de concurrencia focalizada |
| Alta | Crear, descubrir y unirse falla en móvil | Recorrido manual en Android antes de distribuir el APK |
| Alta | Moderación o suspensión no protege el producto | Pruebas de API focalizadas y recorrido manual del panel |
| Diferida | Aspecto visual exhaustivo, rendimiento y variantes de dispositivo | Validación posterior al piloto |

## Pruebas automatizadas mínimas

Se implementarán junto con cada módulo, no como una fase separada. El conjunto inicial debe cubrir al menos:

| ID | Caso | Resultado esperado |
| --- | --- | --- |
| B-01 | Crear evento futuro con datos válidos | Evento publicado y creador dentro del límite de tres activos |
| B-02 | Crear un cuarto evento activo, incluso con dos solicitudes concurrentes desde dos eventos activos | Como máximo se crean tres; una solicitud recibe `active_event_limit_reached` |
| B-03 | Buscar o consultar un evento sin participación | Solo zona aproximada y distancia; nunca `exactLocation` ni asistentes |
| B-04 | Consultar evento como participante confirmado | Recibe `exactLocation`; no recibe lista de asistentes |
| B-05 | Consultar participantes como creador y como participante | Solo el creador recibe participantes confirmados |
| B-06 | Bloquear entre creador y posible participante | Evento oculto y participación nueva denegada en ambos sentidos |
| B-07 | Dos solicitudes simultáneas para la última plaza | Como máximo una participación queda `confirmed` |
| B-08 | Unirse a evento lleno, cancelado, oculto o iniciado | Operación rechazada sin crear participación |
| B-09 | Abandonar antes del inicio | Participación `abandoned` y plaza liberada |
| B-10 | Acceso a moderación sin rol `admin` | `403 Forbidden` |
| B-11 | Suspender una cuenta | Sus eventos dejan de descubrirse y su JWT ya no permite operaciones |
| B-12 | Cierre programado de un evento terminado | Pasa a `closed` una vez, deja de descubrirse y devuelve `404` a terceros; el creador conserva acceso y lo lista con `status=closed` |
| B-13 | Reducir capacidad por debajo de participaciones confirmadas | Rechazo con `capacity_below_confirmed`; conserva capacidad, participantes y ETag |
| B-14 | Entrega de notificaciones push | Solicitud, decisión, cambio y cancelación registran una notificación `pending` para el destinatario correcto; el proceso de despacho la envía una vez a Expo y la marca `sent`; un tipo silenciado o un dispositivo deshabilitado no envía; `DeviceNotRegistered` la marca `failed` y borra el token; una segunda ejecución no reenvía |

La prueba B-07 usa dos transacciones o peticiones concurrentes reales contra PostgreSQL. Las demás pueden empezar como pruebas de servicio y autorización con la mínima infraestructura necesaria.

B-12 se ejecuta de extremo a extremo contra PostGIS real: crea el evento por API, verifica su descubrimiento, simula que terminó, invoca el proceso programado, verifica sus proyecciones posteriores y repite el proceso para comprobar idempotencia. B-02 usa creaciones concurrentes reales para comprobar el bloqueo del creador; B-13 bloquea la fila de evento durante la edición para serializarla con participaciones.

B-14 recorre por API la unión, la resolución del creador, la edición y la cancelación, comprueba las filas registradas en `notifications` y luego invoca el proceso de despacho con un cliente Expo simulado; verifica el estado final de cada fila, el respeto de las preferencias por tipo, el borrado del token ante `DeviceNotRegistered` y que una segunda ejecución no reenvía.

## Validación manual antes del APK

Una persona del equipo ejecuta este recorrido en Android contra el entorno de preproducción:

1. Registrar dos cuentas de prueba y verificar correo.
2. Crear un evento directo con ubicación exacta y capacidad de una plaza.
3. Buscarlo desde la segunda cuenta y confirmar que solo ve zona aproximada y distancia.
4. Unirse y confirmar que la segunda cuenta ve la ubicación exacta, pero no asistentes.
5. Abandonar y comprobar que la plaza vuelve a estar disponible.
6. Crear un evento con aprobación y verificar solicitud, decisión y notificaciones configuradas.
7. Crear un evento privado, generar invitación y confirmar que el código permite participar sin exponer el evento antes de confirmar.
8. Bloquear entre las dos cuentas y comprobar que no pueden descubrir ni unirse a los eventos de la otra.
9. Enviar un reporte y resolverlo desde el panel de moderación; comprobar que ocultar un evento lo retira de descubrimiento.
10. Revisar tamaño de texto, contraste, etiquetas accesibles y controles de al menos 48 x 48 dp en las pantallas del flujo principal.

Los datos de prueba no deben usar ubicaciones de domicilios ni datos personales reales.

## Criterio de salida del MVP

Se puede distribuir un APK de prueba cuando:

- Las pruebas B-01 a B-11 pasan en preproducción.
- El recorrido manual se completa sin defectos críticos o altos abiertos en crear, descubrir, participar, bloqueo, reporte o moderación.
- No se observa ubicación exacta ni lista de asistentes en una cuenta que no esté autorizada.
- La migración de base de datos se aplica en un entorno limpio y se ha verificado la exportación previa requerida por Supabase Free.

## Refuerzo posterior

Tras el piloto se decidirá, a partir de errores y métricas reales, qué ampliar: cobertura de integración, automatización móvil, pruebas de accesibilidad, rendimiento de PostGIS, compatibilidad iOS, pruebas de notificaciones y pruebas de recuperación ante fallos.
