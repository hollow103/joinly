# Contrato visual movil: Radar de planes

## Estado y autoridad

Este documento fija el diseno de interfaz de Joinly para la aplicacion Expo del
piloto. Complementa `docs/18-implementacion-frontend-movil.md`: el contrato API
(`openapi.yaml` y `docs/11-contrato-api.md`) sigue siendo la autoridad para
datos, rutas, errores y permisos; este documento es la autoridad para estructura
visual, navegacion y comportamiento de las pantallas.

La referencia interactiva es `mobile/design/radar-prototype.html`. La imagen de
cabecera del patron es `mobile/design/02-radar-de-planes.svg`. Son artefactos de
diseno, no codigo que se deba incrustar ni ejecutar en la aplicacion. Cualquier
implementacion posterior debe reproducir este contrato en componentes React
Native y `StyleSheet`, no mediante WebView ni copiando HTML/CSS.

## Principios invariables

- La aplicacion se llama Joinly y su patron principal de descubrimiento es
  "Radar de planes".
- El radar es una metafora visual abstracta. Nunca es un mapa, nunca dibuja
  calles ni pines geograficos reales, y no revela ubicaciones precisas.
- Antes de confirmar una participacion solo se muestran categoria, fecha y hora,
  zona aproximada, distancia y disponibilidad. La ficha no puede inferir ni
  solicitar una direccion exacta antes de que el backend la proyecte.
- El radar siempre se acompana de una lista vertical accesible de resultados.
  Los blips del radar son accesos equivalentes a tarjetas de esa lista, nunca la
  unica forma de descubrir un evento.
- No se muestran listas de asistentes a participantes. Solo la persona creadora
  obtiene la pantalla de solicitudes y participantes.
- No hay mapas, chat, pagos, lista de espera, valoraciones, recomendaciones
  automaticas ni reportes en esta fase.
- No se usan emojis como iconos de produccion. Se usara una unica familia de
  iconos vectoriales de trazo consistente. Los iconos sin texto deben tener una
  etiqueta de accesibilidad.

## Tokens visuales

Estos valores extienden los tokens existentes de `mobile/src/ui/tokens.ts`.
Cuando M2 implemente el patron, los nombres semanticos se anaden al sistema de
tokens; las pantallas no escriben hexadecimales locales.

| Token semantico | Valor | Uso |
| --- | --- | --- |
| `color.brandNavy` | `#101D40` | Fondo del radar y cabeceras inmersivas |
| `color.primary` | `#3157C9` | Accion principal, seleccion y enlaces |
| `color.primarySoft` | `#EAF0FF` | Botones secundarios y seleccion suave |
| `color.accent` | `#FF9E3D` | Punto de ubicacion abstracto y boton Crear |
| `color.success` | `#267D61` | Participacion confirmada |
| `color.successSoft` | `#E5F5EE` | Avisos de confirmacion |
| `color.purple` | `#7951A7` | Categoria cultura y ocio |
| `color.background` | `#F5F7FC` | Fondo de pantallas claras |
| `color.surface` | `#FFFFFF` | Tarjetas y barras fijas |
| `color.text` | `#14213D` | Texto principal |
| `color.textMuted` | `#65708F` | Texto secundario |
| `color.border` | `#E2E7F3` | Separadores y bordes |
| `color.danger` | `#B9344B` | Acciones destructivas |

- Reticula: espaciado de 4 y 8 dp; gutters de 16 dp; separacion entre bloques
  de 24 dp; tarjetas con radio de 20 dp; controles internos con radio de 12 a
  15 dp.
- Tipografia: sans serif del sistema. Titulo de pantalla 26 dp, semibold/bold,
  con interlineado compacto; titulo de tarjeta 16 dp; cuerpo 15 dp; metadatos
  11-12 dp; etiquetas 9-10 dp en mayusculas. Se respeta el escalado del sistema.
- Controles: objetivo tactil minimo de 48 x 48 dp. La accion primaria mide al
  menos 48 dp de alto. Ningun estado se comunica solo por color: las etiquetas
  incluyen texto como "Confirmado" o "Pendiente".
- Movimiento: transiciones de opacidad o elevacion de 150-250 ms; sin saltos de
  layout. Con reducir movimiento, la pantalla muestra directamente el estado
  final sin transicion no esencial.

## Estructura de navegacion

La navegacion autenticada usa cuatro destinos estables en una barra inferior:

| Destino | Icono vectorial | Contenido |
| --- | --- | --- |
| Radar | Radar | Descubrimiento, filtros y resultados |
| Mis planes | Calendario | Participaciones, solicitudes y eventos propios |
| Crear | Mas, accion destacada circular naranja | Flujo de publicacion |
| Perfil | Persona | Perfil, bloqueos y ajustes |

La barra inferior respeta la safe area y no tapa listas ni CTA. En fichas y
formularios se usa una cabecera con volver. Las acciones de participacion,
abandono y guardado se fijan sobre la barra inferior cuando sea necesario y el
contenido desplazable reserva espacio inferior suficiente.

## Especificacion de pantallas

### 1. Acceso, registro y verificacion

| Pantalla | Composicion | Acciones y estados |
| --- | --- | --- |
| Inicio de sesion | Cabecera azul marino con marca y mensaje corto; tarjeta blanca inferior con correo, contrasena, CTA azul y enlace de registro | Permite pegar desde gestor de contrasenas; errores de Supabase aparecen junto al campo o como aviso claro |
| Registro | Misma cabecera; formulario con alias, correo, contrasena, confirmacion de mayoria de edad y tres acuerdos obligatorios | El CTA permanece desactivado y explicado hasta aceptar lo requerido; enlaza los textos legales cuando existan |
| Verificar correo | Estado centrado, icono vectorial, titulo, explicacion y acciones "Ya he verificado" y reenviar | Bloquea crear y participar hasta que `GET /me` confirme `emailVerified` |
| Zona inicial | Titulo, breve explicacion de privacidad y campo de zona manual; opcion explicita para guardarla como preferencia | No solicita ubicacion del dispositivo en esta pantalla |

### 2. Radar y busqueda

La pantalla Radar es la pantalla principal tras iniciar sesion.

- Cabecera azul marino: marca, acceso a perfil, eyebrow "Descubre a tu
  alrededor" y titulo "Tu radar de planes".
- Selector de contexto de 48 dp: punto naranja, zona manual o actual, radio y
  accion "Cambiar". El permiso de ubicacion se pide solo despues de tocar
  "Usar mi ubicacion actual" dentro de Buscar.
- Radar de 180 dp formado por tres anillos de baja opacidad y un punto naranja
  central. Los blips son tarjetas blancas con titulo y distancia aproximada.
  Se alimentan de los mismos resultados que la lista y no tienen posicion real.
- Filtros temporales horizontales: Ahora, Esta tarde, Manana y Este finde. El
  seleccionado es azul solido; los demas son superficies blancas.
- Seccion "En tu radar": tarjetas verticales con ilustracion geometrica por
  categoria, etiqueta, titulo, hora, zona aproximada, distancia o disponibilidad
  y chevron. No hay fotografias de perfil ni direcciones exactas.
- Buscar: pantalla clara con alternancia "Zona manual" / "Usar ubicacion actual",
  campo de zona, selector de radio y chips de categoria. "Actualizar radar"
  vuelve al Radar y conserva la consulta activa.
- Sin resultados: icono de radar, mensaje claro de que no hay planes en el rango
  y CTA "Ampliar a X km". No afirma que no haya eventos en otras zonas.

### 3. Ficha y participacion

| Pantalla o variante | Composicion | CTA y regla |
| --- | --- | --- |
| Ficha publica | Hero azul con categoria, titulo y descripcion; chips de fecha/hora, zona, distancia y plazas; aviso azul de privacidad; alias del creador | Acceso directo: "Unirme al plan" en barra fija |
| Ficha con aprobacion | Misma jerarquia; el chip indica "Con aprobacion" y el aviso aclara que solo el creador ve solicitudes | CTA "Solicitar plaza"; exito lleva a estado Pendiente |
| Ficha privada | Hero y metadatos sin plaza ni direccion; aviso naranja de acceso privado | CTA "Tengo un codigo" abre hoja para introducirlo; no se muestra codigo ni direccion antes de confirmar |
| Hoja de confirmacion | Scrim y hoja inferior con asa, titulo, explicacion, Volver y CTA | Reutilizable para unirse, solicitar, abandonar, publicar, cancelar, bloquear y eliminar; no se cierra por una accion accidental |
| Confirmada | Hero del evento, etiqueta "Participacion confirmada", aviso verde y accion destructiva separada | Solo aqui se presenta la ubicacion exacta que devuelve la API; no se inventa si falta |
| Pendiente | Estado centrado con etiqueta "Solicitud enviada" y explicacion | No muestra asistentes, direccion exacta ni boton de abandono |

### 4. Mis planes y gestion del creador

- "Mis planes" usa la barra inferior y chips "Participo", "Organizo" y
  "Pasados". Las tarjetas indican estado con texto: Confirmado, Pendiente,
  Publicado o Cancelado.
- La tarjeta de una participacion confirmada abre Confirmada; una pendiente abre
  Pendiente. La tarjeta propia abre Gestionar evento.
- Gestionar evento muestra resumen, disponibilidad, y accesos a Solicitudes e
  Invitaciones. Solo aparece para la persona creadora.
- Solicitudes lista alias y estado pendiente, con botones de 48 dp para Aprobar
  y Rechazar. Confirmadas se muestran en una seccion separada, solo para el
  creador.
- Invitaciones permite elegir usos, crear una invitacion y mostrar el codigo en
  claro una vez. La interfaz ofrece copiar y confirma que no se mostrara de
  nuevo. Las invitaciones activas permiten revocacion.
- Editar mantiene el mismo formulario y presenta conflicto `412` como aviso que
  obliga a recargar, nunca sobrescribe silenciosamente.

### 5. Crear evento

- Entrada desde el boton circular naranja de la barra inferior.
- Cabecera con volver, titulo "Crea un plan" y progreso de tres segmentos.
- Tarjeta 1: titulo, categoria, descripcion, fecha/hora y duracion.
- Tarjeta 2: zona o ubicacion requerida para publicar, capacidad o sin limite y
  acceso Directo / Con aprobacion / Privado. Cada opcion explica su efecto.
- Tarjeta 3: comentarios u observaciones y revision final antes de publicar.
- La ubicacion exacta se manda al backend para crear el evento, pero la propia
  pantalla de publicacion explica que los participantes no la veran hasta
  confirmarse. Validaciones junto al campo; limite de tres eventos y errores del
  contrato como avisos claros.

### 6. Perfil y ajustes

| Pantalla | Composicion | Regla |
| --- | --- | --- |
| Perfil | Avatar opcional o iniciales, alias y lista de Editar perfil, Bloqueos y Normas | No muestra correo, telefono ni identificadores internos |
| Editar perfil | Alias y zona manual preferida | Actualiza con `If-Match`; un 412 exige refrescar |
| Ajustes | Enlaces a Notificaciones, Normas y fila destructiva de eliminar cuenta | Cerrar sesion es una accion secundaria separada |
| Notificaciones | Interruptores con titulo y explicacion para solicitudes, decisiones y cambios/cancelaciones | Solo preferencias y registro de token; no simular entrega push hasta Fase 4 |
| Bloqueos | Aviso de reciprocidad y lista de alias bloqueados con Desbloquear | Tras bloquear desde una ficha o perfil, el recurso se trata como inexistente si el backend devuelve 404 |
| Normas | Texto local o enlace aprobado, de lectura clara | Los textos legales definitivos siguen siendo requisito previo al piloto |

## Estados transversales

- Carga: skeleton de tarjetas y anillos estaticos; no spinner que bloquee toda la
  pantalla salvo el primer arranque.
- Error recuperable: aviso dentro del contenido con reintento. Errores de campo
  se muestran bajo su campo. No se exponen detalles RFC 9457 sin traducir.
- Error de no divulgacion: un 404 de evento, bloqueo o participacion vuelve a la
  lista con el mensaje generico "Este plan ya no esta disponible".
- Cuenta suspendida: cierra la sesion y presenta la pantalla informativa definida
  en `docs/18`.
- Acciones asincronas: el CTA muestra progreso y se desactiva durante el envio;
  una accion de union reutiliza la misma `Idempotency-Key` en un reintento.

## Criterios de aceptacion visual

1. Cada pantalla de esta especificacion se puede recorrer desde el prototipo y
   tiene una ruta equivalente de Expo Router antes de declararse implementada.
2. El Radar funciona a 375 dp de ancho, con texto ampliado y con reducir
   movimiento; la lista sigue siendo completa y utilizable.
3. Todas las acciones tactiles miden 48 dp o mas, tienen etiqueta accesible y
   respuesta de pulsacion sin modificar el layout.
4. La aplicacion conserva contraste WCAG 2.1 AA y no depende del color para
   representar categoria, seleccion, error o estado de participacion.
5. Ninguna pantalla vulnera las reglas de privacidad, capacidad, bloqueo o
   visibilidad del contrato de API y de `docs/18`.
