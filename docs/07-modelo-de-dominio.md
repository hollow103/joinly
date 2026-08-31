# Modelo de dominio

Este modelo describe conceptos y reglas de negocio. No prescribe todavia tablas, clases o endpoints.

## Usuario

- Identificador de autenticacion externo, gestionado por Supabase Auth.
- Alias publico obligatorio y foto de perfil opcional.
- Correo y datos de autenticacion privados.
- Estado: activo o suspendido.
- Fecha de aceptacion de terminos, politica de privacidad y normas de convivencia.

Un usuario puede crear eventos, participar en eventos, emitir reportes y bloquear a otros usuarios. Un administrador es un usuario con permiso interno de moderacion.

## Evento

- Creador.
- Titulo, descripcion y categoria.
- Horario futuro de inicio y duracion.
- Ubicacion exacta privada y zona aproximada visible antes de participar.
- Capacidad maxima opcional.
- Modalidad de acceso: directo, con aprobacion o privado por invitacion.
- Observaciones actualizables del creador.
- Estado: publicado, cancelado o cerrado.

Un evento publicado esta activo hasta que empieza, se cancela o se cierra segun su ciclo de vida. Cada creador puede tener como maximo tres eventos activos.

## Participacion

- Usuario participante y evento.
- Estado: pendiente, confirmada, rechazada o abandonada.
- Fecha de solicitud y fecha de resolucion cuando proceda.

Una participacion confirmada revela la ubicacion exacta del evento. El creador puede consultar participaciones confirmadas; los demas participantes no ven esta lista. El abandono previo al inicio libera capacidad.

## Invitacion

- Evento privado.
- Codigo o identificador de invitacion valido.
- Estado de uso y fecha de expiracion si se define durante el diseno tecnico.

Una invitacion permite solicitar o confirmar participacion segun las reglas concretas del evento privado. Los detalles tecnicos del formato se definiran en la especificacion API.

## Bloqueo

- Usuario que bloquea y usuario bloqueado.
- Fecha de creacion.

El bloqueo es efectivo en ambos sentidos: ambas personas dejan de ver los eventos de la otra y no pueden unirse a ellos.

## Reporte y decision de moderacion

- Persona que reporta.
- Recurso reportado: usuario o evento.
- Motivo obligatorio y descripcion opcional.
- Estado: pendiente, archivado o resuelto.
- Decision: ocultar evento, advertir usuario o suspender cuenta, cuando aplique.
- Administrador responsable y fecha de decision.

Los reportes y decisiones de moderacion se conservan durante 12 meses.

## Notificacion

- Persona destinataria.
- Tipo: nueva solicitud, solicitud aceptada, solicitud rechazada, cambio de evento o cancelacion.
- Referencia al evento o participacion relacionada.
- Estado de entrega y lectura si se implementa en el MVP.

Las notificaciones se envian por push de acuerdo con las preferencias de la persona usuaria. El correo se reserva para validacion y recuperacion de contrasena.

## Relaciones principales

- Un usuario crea cero o muchos eventos; cada evento tiene un creador.
- Un evento tiene cero o muchas participaciones; cada participacion corresponde a un usuario y un evento.
- Un evento privado puede tener cero o muchas invitaciones.
- Un usuario puede bloquear y ser bloqueado por otros usuarios.
- Un usuario puede emitir reportes; un reporte se dirige a un usuario o evento.
- Un administrador resuelve cero o muchos reportes.
