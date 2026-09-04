# Estrategias de monetización de Joinly

Este documento evalúa posibles modelos de ingresos para Joinly y recomienda un
orden de adopción. No modifica el alcance actual: el MVP es gratuito, no muestra
publicidad, no procesa pagos y debe validar primero que exista una comunidad
local activa y segura.

Las decisiones de producto, privacidad, pagos, fiscalidad y responsabilidad de
plataforma necesitan revisión específica antes de implementar cualquier modelo.
El documento no autoriza cobrar, mostrar promociones ni procesar transacciones.

## 1. Punto de partida

Joinly quiere facilitar planes locales entre personas adultas, con privacidad,
seguridad y simplicidad como principios. El piloto empieza en Vigo y necesita
concentrar suficiente actividad real antes de expandirse. En esta fase, cobrar a
quien crea o se une a un plan perjudicaría el efecto de red que todavía se está
validando.

Restricciones que condicionan la monetización:

- La ubicación y la identidad son datos sensibles para la confianza del
  producto. No se venden ni se usan para publicidad comportamental.
- La ubicación exacta permanece privada hasta confirmar la participación.
- Los eventos son contenido generado por usuarios y requieren bloqueo, reporte y
  moderación. Un incentivo económico no puede debilitar esas reglas.
- Pagos, reservas y entradas están fuera del MVP. Añadirlos transforma Joinly en
  parte de una transacción entre asistentes y organizadores, con obligaciones de
  soporte, fraude, reembolsos y cumplimiento más exigentes.
- La aplicación se distribuye en Android e iOS. Las funciones digitales de pago
  dentro de la app suelen estar sujetas a las reglas de facturación de Google
  Play y Apple; los servicios presenciales tienen un tratamiento distinto, pero
  requieren revisión legal y de la política vigente antes de diseñar el flujo.

## 2. Principios para decidir

Todo modelo futuro debe superar estas condiciones:

1. Mantiene gratis crear, descubrir y participar en planes ordinarios.
2. No vende perfiles, ubicación, contactos, reportes ni historial de actividad.
3. No convierte la visibilidad orgánica en una subasta ni penaliza a quien no
   paga.
4. Separa con etiquetas claras cualquier contenido patrocinado o editorial.
5. Conserva la misma moderación, bloqueo, privacidad y reglas de visibilidad para
   quien paga y quien no.
6. Produce suficiente margen para cubrir soporte, moderación, infraestructura,
   impuestos y comisiones, no solo la facturación bruta.
7. Puede explicarse en una frase a una persona usuaria sin lenguaje ambiguo.

## 3. Estrategias posibles

### A. Seguir gratuito y financiado por la entidad promotora

Una asociación, universidad, empresa, administración local o programa de
innovación cubre los costes del piloto. Las personas usuarias no pagan y la
experiencia no incluye promociones comerciales.

**Ventajas**

- Máxima coherencia con la etapa de validación y con el valor social/local.
- No altera el comportamiento de crear, descubrir o participar.
- Evita pagos móviles, facturación de tiendas y la complejidad de comisiones.

**Riesgos**

- Ingresos limitados en el tiempo y dependencia de un único financiador.
- La entidad no debe obtener acceso a datos personales ni influir en la
  moderación.

**Adecuación:** muy alta para el piloto y primera apertura pública.

### B. Licencia B2B para organizaciones locales

Cobrar una cuota mensual o anual a organizaciones con una necesidad operativa
real: centros culturales, universidades, asociaciones, coworkings, empresas o
administraciones. La contraprestación debe ser una herramienta separada para
publicar y gestionar sus propias actividades, no comprar prioridad sobre planes
ordinarios.

Una edición posterior podría incluir una consola web para organizaciones con:

- Perfil identificado de la entidad y personas autorizadas.
- Publicación de actividades de la propia entidad.
- Gestión de información, cancelaciones y asistencia dentro de las reglas de
  privacidad aprobadas.
- Estadísticas agregadas de sus actividades, sin revelar ubicación de búsqueda,
  perfiles ajenos ni personas bloqueadas.
- Facturación por contrato o factura desde una web administrativa, no mediante
  una compra encubierta dentro de la app de consumo.

**Ventajas**

- El pagador es quien obtiene valor operativo y presupuesto, no quien busca
  compañía para un plan.
- Ingreso recurrente más predecible que una comisión por entrada.
- Compatible con una experiencia de consumidor gratuita y con datos mínimos.

**Riesgos y requisitos**

- Requiere definir qué distingue a una organización de un usuario ordinario,
  revisar su identidad y moderar abuso comercial.
- Necesita contratos, facturas, soporte B2B y límites claros: pagar no permite
  acceder a datos personales, bloquear reglas ni saltarse moderación.
- Si la compra habilita funciones digitales dentro de la app móvil, revisar los
  requisitos de cobro de Apple y Google. Es preferible que contratación,
  facturación y administración comercial vivan en el portal web B2B.

**Adecuación:** la mejor opción de ingresos recurrentes tras validar el piloto.

### C. Patrocinio institucional o de marca, con contenido etiquetado

Una organización financia una sección, una campaña de ciudad o un conjunto de
actividades, sin recibir datos de personas usuarias ni control sobre decisiones
de moderación. Por ejemplo, una universidad puede financiar una selección de
actividades de bienvenida o un centro cultural una agenda temática.

El contenido debe:

- Llevar la etiqueta textual `Patrocinado` o `Colaboración`, además de su
  apariencia visual.
- Declarar quién financia y por qué aparece.
- Seguir los mismos criterios de publicación, seguridad y reporte que cualquier
  otro contenido.
- Ser contextual por tema o zona declarada por la entidad, nunca segmentado por
  historial de ubicación, edad, perfilado o datos sensibles.
- Estar separado de los resultados orgánicos, o tener una frecuencia limitada y
  documentada si aparece en el radar.

**Ventajas**

- Puede financiar oferta inicial y operaciones sin cobrar a participantes.
- Permite acuerdos locales pequeños y fáciles de explicar.

**Riesgos y requisitos**

- Puede erosionar la confianza si se mezcla con resultados orgánicos o si se
  vende como recomendación neutral.
- Exige política comercial, revisión de anunciantes, declaración de anuncios en
  tiendas y prohibición de contenidos incompatibles con las normas.

**Adecuación:** buena como complemento B2B, nunca como primer experimento de
ingresos ni como publicidad personalizada.

### D. Perfil o herramientas profesionales para organizadores

Es una variante de la licencia B2B, orientada a una persona que organiza con
frecuencia actividades legítimas. Puede incluir plantilla de eventos, páginas
informativas, exportaciones operativas permitidas, dominios de organización o
más personas gestoras.

No debe incluir impulsos de visibilidad pagados, acceso a asistentes no
confirmados, mensajes masivos, datos de búsqueda, ni una insignia que implique
verificación de seguridad si no existe ese proceso.

**Ventajas**

- Monetiza productividad y no la necesidad social de quien participa.
- Puede ser una oferta pequeña antes de una licencia institucional completa.

**Riesgos y requisitos**

- Requiere anti-spam, límites de publicación, soporte y una definición clara de
  profesional/organización.
- Puede atraer publicidad encubierta; el contenido comercial debe etiquetarse y
  moderarse.

**Adecuación:** media-alta, después de validar que organizadores recurrentes
obtienen valor suficiente.

### E. Suscripción premium para participantes

Una cuota opcional podría financiar funciones personales no esenciales, como una
planificación avanzada o preferencias de presentación. No puede cobrar por
seguridad, bloqueo, reportes, privacidad, acceso a la ubicación confirmada,
creación básica, descubrimiento básico ni posibilidad de participar.

**Ventajas**

- Ingreso directo y potencialmente recurrente.
- No necesita vender publicidad ni datos.

**Riesgos y requisitos**

- En una comunidad naciente, añade fricción antes de que exista valor repetido.
- Tiende a generar funciones artificiales para justificar la suscripción.
- Si se vende dentro de Android/iOS como funcionalidad digital, exige integrar
  Google Play Billing y StoreKit, validar compras en backend, restaurarlas,
  atender reembolsos y ajustar las fichas de tienda.

**Adecuación:** baja antes de alcanzar retención saludable y una necesidad
recurrente demostrada. No recomendada para el piloto.

### E.1 Exploración posterior: planes Plus mensuales

Como hipótesis posterior al piloto, Joinly puede evaluar dos suscripciones
mensuales independientes o un único plan con dos perfiles. La suscripción
elimina banners de red no personalizados para su titular, pero su valor principal
debe ser la funcionalidad adicional; no se debe vender como una forma de evitar
una experiencia gratuita deliberadamente degradada.

#### Descubridor Plus

El primer valor a explorar son filtros ampliados. El plan gratuito conserva una
búsqueda útil por ubicación activa, radio, categoría y tiempo; Plus puede añadir
combinaciones de filtros que ayudan a planificar sin restringir el acceso a la
oferta ordinaria:

- Varias ventanas de fecha dentro de una misma búsqueda.
- Combinaciones de categorías y de modalidades de acceso.
- Filtros por disponibilidad cuando existan datos fiables.
- Presets temporales privados durante la sesión.

No debe incluir más visibilidad de eventos privados, ubicación exacta antes de
confirmar, prioridad en el ranking, ampliación artificial del radio básico,
alertas basadas en historial ni acceso a datos de otros asistentes. Los presets
no se guardan entre sesiones mientras no exista una decisión específica de
privacidad para conservar intereses o búsquedas.

#### Creador Plus

El primer paquete a explorar se centra en organización de eventos:

- Borradores privados antes de publicar.
- Duplicar un plan anterior para ahorrar escritura.
- Plantillas privadas de título, descripción, duración y categoría.
- Calendario personal de planes creados y su estado.

No habilita más de tres eventos activos, visibilidad preferente, publicación sin
moderación, asistentes adicionales, exportación de datos personales ni mensajes
masivos. Los límites de seguridad y las reglas de participación son idénticos
para el plan gratuito y Plus.

#### Publicidad de red en el plan gratuito

La publicidad de red se limita a banners no personalizados. No usa ubicación,
historial de búsqueda, actividad, alias, identificadores publicitarios para
perfilado ni audiencias de terceros. Antes de añadir un SDK hay que verificar
qué datos transmite realmente y actualizar el inventario, la política de
privacidad, Data safety y App Privacy.

Nunca se muestra un banner durante crear un evento, solicitar o abandonar una
participación, aprobar asistentes, bloquear, reportar, decidir moderación,
eliminar cuenta, conceder ubicación ni consultar la ubicación exacta. Tampoco se
usa un intersticial: Google prohíbe experiencias a pantalla completa inesperadas
presenciales.

La ubicación de un banner sigue pendiente de validación. Si se prueba, debe ser
fuera de los flujos principales, claramente separado de los resultados de
eventos, sin desplazar botones de acción y con una etiqueta de anuncio. Si no
existe una ubicación que respete esos criterios, no se incorpora publicidad de
red.

#### Requisitos de implementación si se aprueba el experimento

- Productos mensuales distintos y nombres de beneficio claros en Google Play y
  App Store Connect.
- Google Play Billing y StoreKit; no un pago web alternativo dentro de la app
  para desbloquear funciones digitales, salvo que una política o programa
  aplicable lo permita expresamente.
- Servicio backend que valida las transacciones de ambas tiendas, mantiene la
  titularidad por cuenta, procesa renovaciones, cancelaciones, reembolsos y
  restauración de compras.
- Estados explícitos en la app: gratuito, Plus activo, en periodo de gracia,
  caducado y error de validación. La pérdida de Plus no elimina borradores ni
  datos privados; solo deja de permitir crear o aplicar funciones Plus nuevas.
- Pantalla de suscripción con precio, periodo, renovación automática, cómo
  cancelar, restaurar compra y beneficios exactos antes de pagar.
- Pruebas sandbox de compra, renovación, cancelación, reembolso, cambio de
  dispositivo, cuenta nueva y caída temporal del backend.
- Revisión de Data safety/App Privacy de cualquier SDK de publicidad o compras,
  además de las declaraciones de precios y suscripciones de ambas tiendas.

#### Condiciones para probarlo

No se implementa hasta que el piloto tenga oferta semanal suficiente, retención
saludable, moderación operativa y evidencia de que las personas quieren aplicar
filtros ampliados o preparar eventos recurrentemente. El primer experimento debe
ser limitado, con precio mensual único, sin periodo de prueba automático y sin
alterar el orden orgánico de resultados.

Se medirá conversión, cancelación mensual, uso real de cada función Plus,
incidencias de soporte, impacto sobre creación/participación, reportes y la
diferencia de experiencia entre el plan gratuito y Plus. Se detiene si reduce
actividad orgánica, aumenta reportes o empuja a pagar por una función necesaria
para usar Joinly de forma normal.

### F. Comisión por entrada, reserva o pago de un evento

Joinly cobraría un porcentaje o una tarifa fija cuando una persona paga una
actividad. Puede ser por entrada, reserva, depósito o cancelación.

**Ventajas**

- Vincula ingreso a actividad económica real.
- Puede crecer con organizadores profesionales.

**Riesgos y requisitos**

- Es el modelo de mayor complejidad: pagos, devoluciones, fraude, soporte,
  impuestos, facturas, responsabilidades ante cancelaciones y posible regulación
  de plataforma/intermediación.
- Hay que decidir si Joinly es comerciante, agente de cobro o solo redirige a un
  proveedor. Cada opción altera contratos, riesgos y flujos de dinero.
- Una entrada para una actividad presencial no se trata igual que una función
  digital en las políticas de tienda, pero no se debe inferir una excepción sin
  revisar el caso, los países y el proveedor de pagos concretos.
- Aumenta el incentivo para publicar actividades de baja calidad o disputar
  reembolsos.

**Adecuación:** baja en el horizonte actual. Solo estudiar tras demostrar
actividad, madurez de moderación y demanda explícita de organizadores.

### G. Publicidad de red o publicidad geolocalizada

Mostrar banners, anuncios intersticiales o publicidad segmentada de terceros.

**Ventajas**

- Fácil de activar técnicamente con redes publicitarias.

**Riesgos**

- Choca con la promesa de privacidad y con la sensibilidad de la ubicación.
- Reduce la confianza en una app que trata encuentros presenciales y contenido
  de comunidad.
- Añade SDKs, consentimiento, declaraciones de privacidad, posible rastreo y
  moderación de creatividades; el ingreso es bajo con una base local pequeña.
- Un intersticial puede interrumpir un flujo donde la persona decide asistir a
  una actividad presencial, con un coste de experiencia y seguridad injustificado.

**Adecuación:** muy baja. No recomendada.

### H. Venta de datos, perfiles o informes identificables

Vender ubicación, comportamiento, contactos, asistentes, intereses inferidos o
informes que permitan reidentificar personas.

**Ventajas aparentes**

- Ninguna compatible con los principios de Joinly.

**Riesgos**

- Contradice minimización, control de la persona usuaria y la propuesta de valor.
- Genera riesgo legal, de seguridad y reputación desproporcionado.

**Adecuación:** prohibida.

## 4. Comparativa

| Modelo | Ingreso recurrente | Complejidad | Riesgo para confianza | Adecuación |
| --- | --- | --- | --- | --- |
| Financiación institucional | Baja-media | Baja | Baja | Muy alta ahora |
| Licencia B2B | Alta | Media | Baja-media | Muy alta después del piloto |
| Patrocinio etiquetado | Media | Media | Media | Alta como complemento |
| Herramientas profesionales | Media | Media | Media | Media-alta posterior |
| Suscripción participante | Media | Media-alta | Media | Baja antes de retención |
| Comisión por pagos | Variable | Muy alta | Media-alta | Baja por ahora |
| Publicidad de red | Baja al inicio | Media | Alta | Muy baja |
| Venta de datos | Variable | Alta | Crítica | No admisible |

## 5. Recomendación para Joinly

### Fase 0: piloto gratuito

Mantener la aplicación sin publicidad, sin pagos y sin una capa premium. Buscar
financiación no transaccional para infraestructura, moderación y captación de
oferta inicial. El objetivo es responder con evidencia a estas preguntas:

- ¿Hay al menos una oferta local suficiente y diversa cada semana?
- ¿Qué proporción de eventos recibe una participación confirmada?
- ¿Las personas vuelven sin incentivos de pago ni notificaciones promocionales?
- ¿El volumen de reportes y soporte es sostenible y se resuelve a tiempo?
- ¿Hay organizaciones que repiten publicación y necesitan herramientas?

No fijar objetivos de facturación antes de tener objetivos de actividad,
seguridad y retención.

### Fase 1: entrevistas y preventa B2B, sin cambiar la app de consumo

Cuando el piloto tenga actividad estable, entrevistar a 10--15 organizaciones
locales. No preguntar solo si pagarían: pedir que describan su proceso actual,
frecuencia, coste y el problema que resolverían. Ofrecer una prueba contractual
limitada de una consola web para organizaciones, sin anuncios ni tratamiento
adicional de datos personales.

Se considera señal suficiente para construir una primera oferta B2B si varias
organizaciones independientes aceptan pagar o firmar una carta de intención por
el mismo problema operativo, no por promesas de alcance o datos de audiencia.

### Fase 2: licencia de organizaciones y patrocinio transparente

Priorizar una cuota por organización con niveles simples y límites explícitos.
El precio se define tras conocer soporte, moderación e infraestructura; no se
debe publicar una tarifa antes de calcular el margen por cuenta. Añadir
patrocinio institucional solo si existe etiquetado, política comercial y control
editorial independiente.

La app de consumo continúa gratuita. Cualquier herramienta de pago debe aportar
valor operativo demostrable y no transformar el radar en un inventario de
anuncios.

### Fase 3: evaluar, no asumir, pagos o premium

Solo evaluar comisión por entradas o una suscripción de participantes si la
retención, seguridad, soporte y oferta están consolidados. Antes de una decisión:

- Probar la necesidad con entrevistas y un prototipo sin cobro.
- Definir exactamente el valor que no afecta funciones básicas ni seguridad.
- Revisar impuestos, consumo, reembolsos, fraude, contratos, protección de
  consumidores, RGPD y políticas de Apple/Google con asesoramiento profesional.
- Diseñar conciliación, soporte, auditoría y métricas de reclamaciones antes de
  activar un proveedor de pagos.

## 6. Reglas que no se deben cruzar

- No cobrar por ver una ubicación exacta, bloquear, reportar, eliminar la
  cuenta, recurrir una moderación ni recibir protección básica.
- No permitir que un pagador vea asistentes, reportes, búsquedas, perfiles o
  ubicación precisa que no podría ver sin pagar.
- No aceptar dinero a cambio de ocultar reportes, evitar moderación, restaurar
  contenido retirado o anunciar actividades engañosas.
- No usar anuncios segmentados por ubicación, comportamiento sensible o datos de
  terceros.
- No vender resultados orgánicos como recomendados sin etiqueta visible.
- No incorporar un SDK de anuncios, atribución o pagos sin inventario de datos,
  revisión de permisos, actualización de textos legales y declaraciones de
  tienda.

## 7. Métricas y gobierno de una decisión de ingresos

Antes de aprobar un experimento, documentar hipótesis, audiencia afectada,
duración, métrica de éxito, límite de daño y responsable. Medir al menos:

- Actividad: eventos creados, confirmaciones por evento y oferta disponible.
- Confianza: bloqueos, reportes, tiempo de resolución, cancelaciones y soporte.
- Retención: retorno semanal sin usar perfiles comerciales ni seguimiento
  innecesario.
- Economía: ingreso neto, coste de infraestructura, moderación, soporte,
  comisiones, impuestos y reembolsos por cuenta B2B.
- Equidad: diferencia de visibilidad, participación y reportes entre contenido
  orgánico y patrocinado.

Una decisión la aprueban conjuntamente producto, responsable de privacidad,
operaciones/moderación y la persona responsable del negocio. Cualquier cambio
que añada pagos, anuncios, nuevos datos o terceros debe pasar por una decisión
de arquitectura y una actualización del contrato, la política de privacidad y
las declaraciones de tienda.

## 8. Fuentes que se revisarán antes de implementar

- [Apple App Review Guidelines](https://developer.apple.com/app-store/review/guidelines/)
- [Google Play Payments policy](https://support.google.com/googleplay/android-developer/answer/10281818)
- [Google Play Better Ads Experiences](https://support.google.com/googleplay/android-developer/answer/12271244)
- [Google Play Data safety](https://support.google.com/googleplay/android-developer/answer/10787469)
- `docs/01-vision-producto.md`
- `docs/06-privacidad-y-seguridad.md`
- `docs/10-alcance-mvp.md`
- `docs/22-cold-start-y-onboarding.md`
- `docs/23-publicacion-android-ios.md`

Las reglas de las tiendas y la regulación aplicable cambian. Revisar las fuentes
oficiales, el flujo concreto de cobro y el país de lanzamiento antes de tomar
una decisión de implementación.
