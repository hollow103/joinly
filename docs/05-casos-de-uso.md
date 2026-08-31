# Casos de uso

Cada caso define actor, precondiciones, flujo principal, excepciones y criterios de aceptacion.

## CU-01 Crear y publicar evento

**Actor principal:** creador de eventos.

**Precondiciones:** cuenta activa, correo validado, aceptacion de terminos de uso, politica de privacidad y normas de convivencia. El creador tiene menos de tres eventos activos.

**Flujo principal:**

1. El creador inicia la creacion de un evento.
2. Introduce titulo, descripcion, horario futuro, duracion y ubicacion.
3. Selecciona una categoria: deporte y bienestar, cultura y ocio, aprendizaje, comunidad y voluntariado, mascotas o networking.
4. Define capacidad maxima o sin limite de plazas.
5. Elige acceso directo, con aprobacion o por invitacion privada.
6. Puede incluir observaciones que podra actualizar hasta el fin del evento.
7. El sistema valida los datos y publica el evento.

**Excepciones:**

- Si el horario no es futuro, el sistema no publica el evento.
- Si faltan datos obligatorios, el sistema identifica los campos pendientes.
- Si el creador tiene tres eventos activos, el sistema impide publicar otro hasta que uno empiece o se cancele.

**Criterios de aceptacion:**

- Un evento publicado aparece para las personas que cumplan sus reglas de visibilidad y distancia.
- La ubicacion exacta se almacena para el evento, pero no se expone antes de confirmar participacion.
- El creador puede editar o cancelar el evento antes de su inicio y se notifica a participantes confirmados.
- El evento se cierra automaticamente al finalizar su duracion y deja de aparecer en descubrimiento.

## CU-02 Descubrir eventos cercanos

**Actor principal:** persona usuaria registrada.

**Precondiciones:** cuenta activa. Para buscar por posicion actual, la persona concede permiso de ubicacion; alternativamente puede introducir una zona manual.

**Flujo principal:**

1. La persona selecciona ubicacion actual o una zona manual y define un rango de distancia.
2. El sistema muestra eventos disponibles mediante lista o rejilla.
3. Cada evento muestra informacion publica, zona aproximada, distancia y alias y foto opcional del creador.
4. La persona abre el detalle de un evento y decide si desea participar.

**Excepciones:**

- Si no hay resultados, el sistema propone ampliar el rango de distancia.
- Los eventos cerrados, cancelados, completos o de personas bloqueadas no se muestran como disponibles.
- El sistema no conserva un historial de ubicaciones del dispositivo.

**Criterios de aceptacion:**

- Nunca se muestra la direccion o punto exacto antes de confirmar la participacion.
- La busqueda manual funciona aunque se deniegue el permiso de ubicacion.
- Los eventos de usuarios bloqueados no son visibles entre si.

## CU-03 Unirse o abandonar un evento

**Actor principal:** persona usuaria registrada.

**Precondiciones:** cuenta activa, evento futuro, disponible y no bloqueado. La persona no participa ya en el evento.

**Flujo principal:**

1. La persona abre un evento disponible.
2. Para acceso directo, el sistema confirma su participacion si hay plaza.
3. Para acceso con aprobacion, el sistema registra una solicitud y notifica al creador.
4. Para acceso privado, el sistema requiere una invitacion valida.
5. El creador acepta o rechaza solicitudes; el sistema notifica la decision al solicitante.
6. Tras confirmarse la participacion, el sistema revela la ubicacion exacta.
7. Antes del inicio, la persona puede abandonar libremente el evento.

**Excepciones:**

- Si el evento alcanza su capacidad maxima, no admite nuevas uniones ni solicitudes y no hay lista de espera.
- Si empieza, finaliza o se cancela el evento, no admite nuevas participaciones.
- Si la persona bloquea al creador o es bloqueada por este, no puede unirse.

**Criterios de aceptacion:**

- El abandono libera la plaza cuando existe capacidad maxima.
- Solo el creador consulta la lista de participantes confirmados.
- Las personas participantes no ven automaticamente la identidad de otros asistentes.

## CU-04 Reportar usuario o evento

**Actor principal:** persona usuaria registrada.

**Precondiciones:** cuenta activa y acceso al usuario o evento que se desea reportar.

**Flujo principal:**

1. La persona selecciona reportar un usuario o evento.
2. Elige un motivo: contenido inapropiado, comportamiento abusivo, evento fraudulento, ubicacion enganosa u otro.
3. Puede anadir una descripcion opcional.
4. El sistema registra el reporte para su moderacion.

**Criterios de aceptacion:**

- Todo reporte contiene un motivo y fecha de creacion.
- Los reportes y sus decisiones se conservan durante 12 meses.
- La persona que reporta no recibe datos personales de la persona reportada.

## CU-05 Bloquear usuario

**Actor principal:** persona usuaria registrada.

**Precondiciones:** cuenta activa y acceso al perfil o evento de la otra persona.

**Flujo principal:**

1. La persona selecciona bloquear a otra persona.
2. El sistema registra el bloqueo.
3. El sistema deja de mostrar los eventos de una persona a la otra e impide unirse a ellos.

**Criterios de aceptacion:**

- El bloqueo afecta a la visibilidad e interaccion en ambos sentidos.
- Bloquear no revela informacion adicional a ninguna de las dos personas.

## CU-06 Moderar reporte

**Actor principal:** administrador interno.

**Precondiciones:** cuenta con rol de administrador y acceso al panel interno de moderacion.

**Flujo principal:**

1. El administrador consulta los reportes pendientes.
2. Revisa el motivo, la descripcion opcional y el recurso reportado.
3. Decide archivar el reporte, ocultar un evento, advertir a una persona o suspender una cuenta.
4. El sistema registra la decision de moderacion.

**Criterios de aceptacion:**

- Solo administradores autorizados acceden al panel y a los reportes.
- Una cuenta suspendida no puede crear, descubrir ni participar en eventos.
- Un evento oculto no aparece en descubrimiento ni admite participaciones.
