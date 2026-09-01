# Requisitos

## Funcionales

- El sistema solo permitira el registro a personas mayores de 18 anos.
- El sistema permitira clasificar un evento en una de estas categorias: deporte y bienestar, cultura y ocio, aprendizaje, comunidad y voluntariado, mascotas y networking.
- Al crear un evento, el sistema exigira titulo, descripcion, horario, duracion y ubicacion, y permitira al creador publicar comentarios u observaciones asociados al evento.
- El creador podra definir una capacidad maxima de participantes o marcar el evento como sin limite de plazas.
- Una persona con participacion confirmada podra abandonar libremente un evento antes de su inicio; si hay limite de capacidad, el sistema liberara su plaza.
- Si un evento alcanza su capacidad maxima, el sistema no permitira nuevas uniones ni solicitudes hasta que se libere una plaza. No habra lista de espera en el MVP.
- En eventos con aprobacion, el sistema notificara al creador las nuevas solicitudes y notificara al solicitante la aceptacion o rechazo.
- El creador podra consultar la lista de participantes confirmados de su evento.
- Los participantes confirmados no veran automaticamente la lista de otros asistentes; dicha lista sera visible solo para el creador.
- El sistema enviara notificaciones push configurables para solicitudes, decisiones de aprobacion, cambios y cancelaciones de eventos. El correo se usara solo para validacion de cuenta y recuperacion de contrasena.
- El sistema solo permitira crear eventos futuros y unirse o solicitar acceso antes de su hora de inicio.
- Al finalizar la duracion del evento, el sistema lo cerrara automaticamente y dejara de mostrarlo en los resultados de descubrimiento.
- Cada creador podra tener como maximo tres eventos activos simultaneamente. Un evento activo es un evento publicado que no ha comenzado ni se ha cancelado.
- El creador podra actualizar sus comentarios u observaciones antes de que finalice el evento.
- El creador podra editar o cancelar un evento antes de su inicio. Al cancelar o modificar un evento, el sistema notificara a los participantes confirmados.
- El sistema mostrara eventos disponibles en una lista o rejilla dentro de un rango de distancia elegido por la persona usuaria.
- El permiso de ubicacion se solicitara de forma contextual, solo cuando la persona usuaria elija buscar con la ubicacion actual.
- En el piloto Android, el sistema permitira buscar exclusivamente desde la ubicacion actual, previa autorizacion explicita. La busqueda desde una zona manual queda diferida.
- El sistema no almacenara el historial de ubicaciones del dispositivo.
- La persona usuaria podra eliminar su cuenta desde la aplicacion y solicitar la supresion de sus datos personales.
- Los eventos finalizados se eliminaran o anonimizaran en un plazo de 30 dias. Los reportes y decisiones de moderacion se conservaran durante 12 meses. Los datos personales de una cuenta eliminada se suprimiran en un maximo de 30 dias, salvo obligacion legal aplicable.
- Si no hay eventos en el rango seleccionado, el sistema propondra ampliar el radio de busqueda.
- El creador podra configurar el acceso de cada evento como entrada directa, solicitud con aprobacion o invitacion privada.
- Antes de confirmar la participacion, el sistema mostrara solo una zona aproximada y la distancia al evento.
- El sistema revelara la ubicacion exacta unicamente tras confirmar la participacion; en eventos privados, solo a invitados confirmados.
- El sistema permitira registro con correo electronico y contrasena, con validacion del correo.
- El registro del piloto estara abierto y no requerira codigos de invitacion.
- Antes de crear una cuenta, la persona usuaria debera aceptar los terminos de uso, la politica de privacidad y las normas de convivencia.
- La autenticacion del primer APK sera mediante correo electronico y contrasena con validacion de correo. Google y Facebook se evaluaran tras el piloto.
- El perfil publico usara un alias obligatorio y una foto opcional. El correo electronico, nombre real, telefono y perfiles sociales no seran visibles a otras personas usuarias.
- La ficha de un evento mostrara el alias y, si existe, la foto de perfil del creador.
- El sistema permitira reportar y bloquear usuarios, y proporcionara un flujo de moderacion de reportes.
- Al reportar un usuario o evento, el sistema exigira elegir un motivo: contenido inapropiado, comportamiento abusivo, evento fraudulento, ubicacion enganosa u otro.
- El sistema permitira anadir una descripcion opcional al reporte para aportar contexto a moderacion.
- Al bloquear a otra persona, el sistema impedira que ambas vean los eventos de la otra o puedan unirse a ellos.
- El sistema proporcionara un panel web interno para administradores, que permitira revisar reportes, ocultar eventos, advertir usuarios y suspender cuentas.
- El sistema mostrara las normas de convivencia a las personas usuarias.

## No funcionales

- Aplicaciones iOS y Android.
- La interfaz del piloto estara en espanol y se diseniara para admitir varios idiomas posteriormente.
- Privacidad y proteccion de datos por defecto.
- La aplicacion cumplira como minimo WCAG 2.1 nivel AA: contraste suficiente, texto escalable, controles tactiles amplios y etiquetas compatibles con lectores de pantalla.
- Rendimiento adecuado para la consulta geografica de eventos.
- El piloto se dimensionara para hasta 1.000 usuarios registrados, 100 eventos activos y 100 usuarios simultaneos, con posibilidad de escalado posterior.
- Accesibilidad y usabilidad movil.

## Fuera de alcance

- Chat entre participantes.
- Pagos.
- Perfiles sociales avanzados.
- Valoraciones entre usuarios.
- Verificacion de identidad oficial.
- Recomendaciones inteligentes.
- Grupos recurrentes.
- Lista de espera para eventos completos.
- Descarga automatizada de datos personales.
