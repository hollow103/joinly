# Cold start y onboarding del piloto

## Estado y objetivo

Este documento define la estrategia de activacion inicial y primera experiencia
de Joinly para el piloto. Complementa `docs/04-requisitos.md`,
`docs/10-alcance-mvp.md`, `docs/18-implementacion-frontend-movil.md` y
`docs/19-diseno-radar-movil.md`.

No cambia el contrato API ni las reglas de privacidad, visibilidad,
participacion o bloqueo. Si existe conflicto, prevalecen `openapi.yaml`,
`docs/11-contrato-api.md` y `docs/12-autorizacion-y-permisos.md`.

El objetivo es que una persona nueva entienda el valor de Joinly, complete el
alta sin sorpresas y encuentre una primera accion util. El objetivo de cold
start es reducir la probabilidad de un Radar vacio concentrando una oferta
real y limitada antes de abrir el registro.

## Ambito del piloto

- La primera zona es Vigo y su area central. No se abre una segunda ciudad
  hasta revisar la actividad, calidad y seguridad de la primera.
- Antes de abrir el registro debe haber al menos 10 planes reales publicados
  para los siguientes 7 dias.
- La oferta debe distribuirse en horarios y categorias suficientes para que el
  usuario no vea un unico bloque de actividades equivalentes.
- La persona usuaria solo ve eventos dentro del radio de la busqueda activa.
  Si no encuentra resultados, la unica accion de recuperacion del piloto es
  ampliar el radio. No se solicita consentimiento para avisar despues ni se
  guarda interes de busqueda.
- Joinly no promete que existan planes para toda fecha, categoria o radio.

## Modelo de oferta inicial

La oferta de inicio procede de actividades externas. Joinly actua como curador,
no como organizador ni coorganizador.

- La ficha identifica al organizador real mediante su nombre o alias
  autorizado. Joinly no aparece como creador para sugerir una responsabilidad
  que no asume.
- Durante el piloto estas actividades son solo informativas: Joinly no acepta
  solicitudes, participaciones, pagos ni confirmaciones para ellas.
- La ficha debe dejar claro que la actividad la organiza un tercero y que
  Joinly la muestra como seleccion editorial. No debe afirmar que Joinly
  verifico, garantiza o respalda su celebracion.
- El enlace, contacto o instruccion para asistir pertenece al organizador. Si
  no existe una fuente de consulta segura, la actividad no se publica.
- La ubicacion exacta sigue siendo un dato delicado. Solo se publica si el
  organizador la ha hecho publica de forma inequivoca; de otro modo se muestra
  una zona aproximada.

### Riesgo aceptado: revision posterior

Se acepta publicar actividades externas antes de revisarlas. Esta decision
implica riesgo de informacion incorrecta, cancelaciones, cambios de horario o
uso no autorizado de datos del organizador.

Para limitar el riesgo sin convertir esta fase en una operacion de moderacion
completa:

- No se presentan como actividades verificadas.
- No se habilita participacion dentro de Joinly.
- Cada ficha informa de su organizador y fuente o canal de consulta.
- Joinly debe retirar o corregir de inmediato una actividad reportada como
  falsa, cancelada, desactualizada o publicada sin autorizacion.
- La apertura publica queda bloqueada hasta reevaluar esta politica con los
  textos legales definitivos y el proceso de moderacion operativo.

## Principios del onboarding

- La promesa principal es: encontrar actividades cerca.
- El onboarding explica el producto sin prometer amistades, plazas,
  disponibilidad ni resultados.
- La persona puede elegir entre explorar y crear despues de completar el
  perfil. La eleccion solo orienta el primer destino; ambas acciones siguen
  accesibles en la navegacion principal.
- La ubicacion se pide de forma contextual, nunca al abrir la aplicacion ni en
  el registro. Se explica que se usa para la busqueda activa y no se conserva
  como historial.
- El flujo no solicita foto, telefono, intereses, contactos ni otros datos no
  necesarios para el MVP.
- Los acuerdos y la declaracion de mayoria de edad siguen siendo obligatorios
  antes de crear la cuenta.

## Flujo de primera experiencia

### 1. Bienvenida

Antes del inicio de sesion se muestran dos pantallas breves y omitibles solo
mediante el acceso visible a iniciar sesion o crear cuenta.

1. **Planes cerca de ti.** Explica que Joinly permite descubrir actividades
   locales, con ejemplos neutrales de categorias, sin afirmar que siempre haya
   resultados.
2. **Privacidad desde el principio.** Explica que la aplicacion no muestra ni
   retiene ubicacion precisa como historial de busqueda, y que solo solicitara
   permiso cuando la persona elija buscar con su ubicacion actual.

La bienvenida conduce a dos acciones equivalentes: `Crear cuenta` e `Iniciar
sesion`.

### 2. Registro y perfil

El registro se mantiene alineado con las reglas ya aprobadas:

1. Alias, correo, contrasena y confirmacion de contrasena.
2. Declaracion de mayoria de edad.
3. Aceptacion de terminos, privacidad y normas de convivencia, con acceso a
   cada texto antes de aceptar.
4. Creacion de cuenta mediante Supabase Auth.
5. Alta del perfil interno con alias y versiones de acuerdos aceptadas.

El CTA de registro permanece desactivado y explica el requisito pendiente si
falta un campo, la declaracion de edad o un acuerdo. Los textos legales actuales
son provisionales y solo permiten un MVP controlado; deben sustituirse antes de
una apertura publica.

### 3. Correo pendiente de verificar

Una persona con perfil creado pero correo pendiente puede explorar el Radar.
La interfaz muestra un banner persistente, no bloqueante, que explica que debe
verificar el correo para crear o participar.

- Al pulsar crear o unirse, se repite el motivo y se dirige a la pantalla de
  verificacion, sin perder el contexto del evento cuando sea posible.
- La pantalla de verificacion permite actualizar el estado y reenviar el
  correo cuando Supabase lo permita.
- La aplicacion no presenta el rechazo del backend como un error inesperado.

### 4. Eleccion inicial

Despues de completar el perfil, la app presenta una unica eleccion:

- **Explorar actividades**: lleva al Radar.
- **Crear un plan**: lleva al flujo de creacion de eventos propios.

No se guarda esta eleccion como preferencia obligatoria. La barra inferior
mantiene accesibles Radar y Crear en todo momento.

### 5. Primer Radar y permiso de ubicacion

El primer acceso al Radar muestra una explicacion corta: la ubicacion se usa
solo para buscar actividades cercanas y no se guarda como historial.

- El permiso nativo se solicita exclusivamente cuando la persona pulsa `Usar mi
  ubicacion actual`.
- Si lo concede, se ejecuta la busqueda con el radio inicial configurado.
- Si lo rechaza o falla, se muestra una explicacion clara y una accion para
  reintentar. El piloto Android no ofrece zona manual como alternativa.
- El Radar conserva la lista vertical accesible como resultado principal y no
  revela ubicaciones exactas.

### 6. Sin resultados

Cuando la busqueda no encuentra planes en el radio activo, se muestra un estado
vacio claro que no atribuye la ausencia a toda la ciudad ni a todas las fechas.

- Mensaje: no hay actividades en el rango actual.
- Accion unica: `Ampliar a X km`.
- No se ofrece lista de espera, alerta futura, captura de correo ni formulario
  de interes.
- Tras ampliar el radio, se conservan los filtros temporales y de categoria.

## Estados y mensajes de confianza

- La interfaz debe distinguir actividades creadas en Joinly de actividades
  externas seleccionadas editorialmente.
- Las actividades externas deben incluir una etiqueta textual, no solo color,
  como `Actividad externa` o `Informacion del organizador`.
- Un evento propio de Joinly conserva las reglas existentes: ubicacion exacta
  solo tras participacion confirmada, listas de asistentes solo para el creador
  y bloqueo reciproco sin explicar la causa de un `404`.
- Las actividades externas no deben simular plazas, participantes, solicitudes
  ni estados de confirmacion dentro de Joinly.
- Los errores de carga o el arranque lento del backend deben ofrecer reintento
  y explicar que la consulta puede tardar, sin exponer detalles tecnicos.

## Criterios de activacion

Antes de abrir el registro para Vigo, se comprueba:

- Hay al menos 10 actividades reales en los proximos 7 dias.
- Cada actividad externa muestra organizador y fuente o canal de consulta.
- Ninguna actividad externa permite participar dentro de Joinly.
- El Radar devuelve resultados en el area central con la ubicacion de prueba.
- El estado vacio y la ampliacion de radio funcionan correctamente.
- El flujo de bienvenida, registro, perfil, correo pendiente y permiso de
  ubicacion se ha recorrido en un dispositivo real o emulador representativo.
- Los textos legales definitivos y la politica de actividades externas han sido
  revisados antes de una apertura publica.

## Metricas del piloto

Estas metricas sirven para decidir si ampliar el piloto, no para perfilar ni
vender datos de personas usuarias.

- Porcentaje de nuevas cuentas que completan perfil.
- Porcentaje que llega al Radar y ejecuta una primera busqueda.
- Porcentaje de busquedas sin resultados antes y despues de ampliar radio.
- Distribucion entre primera accion `Explorar` y `Crear`.
- Numero de actividades externas retiradas o corregidas tras publicarse.
- Incidencias de informacion incorrecta, cancelacion o publicacion no
  autorizada.

Las metricas se agregan para la operacion del piloto. Cualquier implementacion
de analitica debe respetar `docs/06-privacidad-y-seguridad.md` y no se incorpora
sin una decision especifica de privacidad.

## Fuera de alcance

- Alertas de disponibilidad o recontacto tras una busqueda vacia.
- Recomendaciones personalizadas, intereses, importacion de contactos o
  captacion por referidos.
- Participaciones, pagos, reservas o mensajeria para actividades externas.
- Expansion a otra ciudad antes de evaluar Vigo.
- Verificacion formal de identidad u organizadores.

## Revision posterior al piloto

La estrategia se reevalua cuando exista evidencia suficiente de Vigo. La
revision decide si se mantiene la curacion posterior, si se exige autorizacion
previa para actividades externas, si se habilita algun tipo de participacion
externa y si se abre una segunda ciudad.

## Impacto de implementacion diferido

El contrato actual solo modela eventos creados dentro de Joinly y sus
participaciones. Diferenciar una actividad externa informativa requerira una
decision posterior sobre el modelo, API y pantallas; no se debe simular mediante
un evento ordinario ni reutilizar participaciones para ese fin. Este documento
define la politica de producto, no autoriza ese cambio tecnico.
