# Publicación de Joinly en Android e iOS

Guía operativa para distribuir Joinly en pruebas y publicar una versión para
personas usuarias en Google Play y App Store. Complementa
`docs/06-privacidad-y-seguridad.md`, `docs/09-despliegue-y-cicd.md`,
`docs/15-operacion-del-piloto.md`, `docs/21-despliegue-piloto.md` y las reglas
de producto y moderación vigentes.

No sustituye asesoramiento legal. Antes de una apertura pública, una persona
responsable debe revisar la política de privacidad, los términos, las normas de
convivencia, el tratamiento de denuncias y las obligaciones aplicables en los
países donde se distribuya la aplicación.

## 1. Estado y decisión de distribución

La app está hecha con Expo/React Native. Sus identificadores ya están fijados
en `mobile/app.json`:

| Plataforma | Identificador | Artefacto para tienda |
| --- | --- | --- |
| Android | `com.joinly.app` | Android App Bundle (`.aab`) |
| iOS | `com.joinly.app` | Archivo iOS (`.ipa`) cargado en App Store Connect |

El perfil `preview` de `mobile/eas.json` genera un APK instalable para Android y
una build interna de iOS. Sirve para aceptación, no para publicar. El perfil
`production` actual genera el `.aab` de Android, pero también está marcado como
distribución interna; no se debe usar tal cual para enviar iOS a App Store.

Las variables `EXPO_PUBLIC_*` quedan integradas en cada build. Una build de
tienda debe apuntar al backend HTTPS público y al mismo proyecto Supabase que
valida sus JWT. En el estado actual:

```text
EXPO_PUBLIC_API_BASE_URL=https://joinly-backend-v3xz.onrender.com/api/v1
EXPO_PUBLIC_SUPABASE_URL=https://ulxrjlmpzaeouqbjbnjc.supabase.co
```

Una URL pública puede cambiar en el futuro, pero hacerlo requiere generar y
verificar una nueva build. No se deben incluir secretos de servidor en ninguna
variable `EXPO_PUBLIC_*`: son legibles desde la app instalada.

## 2. Bloqueantes antes de abrir al público

No enviar a revisión ni abrir una ficha pública hasta completar todos estos
puntos:

- Textos definitivos y URLs HTTPS públicas de términos, política de privacidad
  y normas de convivencia. Los textos `v1` actuales son provisionales y no
  autorizan una apertura pública.
- URL de soporte atendida y visible dentro de la app y en las fichas de tienda.
  Debe permitir comunicar problemas de seguridad, contenido ilegal, bloqueos,
  moderación y ejercicio de derechos de privacidad.
- Eliminación de cuenta y datos: la app crea cuentas, por lo que debe ofrecer un
  mecanismo claro dentro de la app y una URL web pública para solicitar la
  eliminación. Deben documentarse alcance, identidad requerida, plazos y datos
  retenidos por obligación legal.
- Operación de moderación activa: reportar, bloquear, retirar contenido y
  responder a incidencias. Joinly contiene eventos y descripciones creadas por
  usuarios; Apple exige filtrado, denuncia, bloqueo y contacto publicado para
  este tipo de contenido.
- Política de actividades externas revisada y proceso para retirar contenido
  incorrecto, cancelado o no autorizado antes de mostrarlo públicamente.
- Backend estable y monitorizado. Render Free puede tardar 30--90 segundos tras
  inactividad; no es adecuado como único servicio para una apertura pública sin
  aceptar ese riesgo operacional o migrar a una infraestructura con capacidad
  acorde al piloto.
- Recorrido manual completo en dispositivos Android e iOS reales: registro,
  verificación de correo, perfil, ubicación, crear, descubrir, participar,
  bloquear, reportar, borrar cuenta y errores de red.
- Accesibilidad básica comprobada: tamaño de texto del sistema, lector de
  pantalla, contraste, foco, controles alcanzables y mensajes de error.

## 3. Privacidad, permisos y contenido generado por usuarios

### 3.1 Datos que hay que inventariar

Antes de rellenar formularios de tienda, actualizar una tabla de inventario con
la implementación real, incluidos Supabase, Expo y cualquier SDK añadido:

| Dato o permiso | Uso actual previsto | Declaración a comprobar |
| --- | --- | --- |
| Correo, alias e identificador de cuenta | Registro, acceso y cuenta | Información personal y gestión de cuenta |
| Ubicación aproximada y precisa | Búsqueda activa de eventos cercanos | Ubicación; se solicita solo al pulsar usar ubicación |
| Contenido de eventos, participaciones, bloqueos y reportes | Funcionalidad y seguridad de la comunidad | Contenido generado por usuarios / acciones dentro de la app |
| Token de notificación | Avisos push, si la persona lo activa | Identificador de dispositivo y comunicaciones |
| Registros técnicos | Seguridad y diagnóstico, si se incorporan | Diagnóstico o rendimiento, según la implementación |

La ubicación precisa no se conserva como historial de búsqueda. Aun así, su
transmisión para buscar eventos y la ubicación exacta de un evento requieren una
declaración correcta. No declarar analítica, publicidad, rastreo, fotos,
contactos, identificadores publicitarios o datos de salud si la app no los
recoge. Si se añade un SDK, repetir el inventario antes de publicar.

### 3.2 Reglas de producto que deben verse en la app

- Explicar antes del permiso que la ubicación se usa para la búsqueda activa.
- Mantener privada la ubicación exacta hasta la participación confirmada.
- Ofrecer bloqueo recíproco y reporte desde el contenido visible.
- No mostrar listas de asistentes a participantes ni a personas externas.
- Mostrar una forma de contactar con soporte y normas de convivencia.
- No prometer disponibilidad de eventos, amistades, plazas o seguridad que el
  producto no pueda garantizar.
- No incluir pagos, chat, perfiles de menores, publicidad dirigida, contactos o
  fotos mientras sigan fuera del alcance aprobado.

### 3.3 Declaraciones de tienda

En Google Play completar **Data safety** con datos recogidos por la app, backend
y SDKs; marcar correctamente cifrado en tránsito y el mecanismo de eliminación
de cuenta. Toda app publicada, también en pistas cerradas u abiertas, debe tener
la declaración completa y la URL de privacidad.

En App Store Connect completar **App Privacy** con la misma implementación real:
tipos de datos, finalidad, si se vinculan a identidad y si se usan para rastreo.
No marcar rastreo salvo que se cumpla la definición de Apple y se implemente el
consentimiento correspondiente. Las etiquetas de ambas tiendas no son
equivalentes: se rellenan por separado desde un mismo inventario técnico.

## 4. Preparación técnica común

1. Reservar definitivamente `com.joinly.app`. Cambiar el identificador después
   de publicar crea una aplicación distinta en cada tienda.
2. Establecer un nombre comercial, `slug`, icono, pantalla de carga y esquema de
   enlace que no sean genéricos. Actualmente el nombre, `slug` y esquema son
   `mobile`; deben convertirse en valores de Joinly antes de la ficha pública.
3. Incrementar versión de usuario (`expo.version`) y número de build en cada
   entrega. Configurar `android.versionCode` e `ios.buildNumber`, o gestionar
   esos valores mediante EAS de forma explícita. Una tienda no acepta reutilizar
   un número de build ya cargado.
4. Crear en `mobile/eas.json` un perfil de tienda distinto del perfil interno.
   Debe producir un `.aab` para Android y una build iOS de distribución App
   Store, no `distribution: "internal"`. Mantener las mismas variables públicas
   revisadas para ambos artefactos.
5. Ejecutar desde `mobile/`:

   ```sh
   npm run typecheck
   npm run lint
   npm run format:check
   ```

6. Verificar que el backend responde y que Supabase, el backend y la build usan
   el mismo entorno. Nunca usar `10.0.2.2`, `localhost` ni HTTP en una build de
   tienda.
7. Revisar permisos finales tras `expo prebuild`. Mantener únicamente ubicación
   cuando se usa la app; no pedir permisos en el arranque.
8. Conservar el acceso a las cuentas de Apple, Google, Expo, Supabase, dominio,
   repositorio y firma en una organización o gestor de contraseñas, no en una
   cuenta personal sin recuperación.

## 5. Android: Google Play

### 5.1 Cuentas y material necesario

- Cuenta de Google Play Console con perfil de desarrollador verificado. Google
  puede exigir comprobación de identidad, organización y dispositivo, sobre todo
  a cuentas personales nuevas.
- Clave de firma de la app. Activar Play App Signing y guardar la clave de subida
  y su recuperación fuera del repositorio. Perder una clave complica futuras
  actualizaciones.
- Ficha de tienda: nombre, descripción corta y completa, categoría, correo de
  contacto, web de soporte, URL de política de privacidad, icono, capturas y
  gráfico promocional cuando Play lo solicite.
- Declaraciones en **App content**: Data safety, anuncios, acceso para revisión,
  público objetivo, clasificación de contenido y permisos. Joinly debe declarar
  que no contiene anuncios mientras no incorpore ninguno.

### 5.2 Compilar y probar

Para una beta instalable se mantiene el APK:

```sh
cd mobile
npx eas-cli build --platform android --profile preview
```

Para Play se genera un App Bundle:

```sh
cd mobile
npx eas-cli build --platform android --profile production
```

No subir el APK a la ficha de producción de Google Play. Subir el `.aab` a una
pista interna primero, instalar desde Google Play y repetir el recorrido de
aceptación. Después usar pista cerrada, abierta o producción según el tamaño del
piloto. Las cuentas personales nuevas pueden tener requisitos adicionales de
prueba cerrada antes de solicitar acceso a producción; comprobar el aviso vigente
de Play Console para esa cuenta.

### 5.3 Publicar

1. Crear la aplicación en Play Console con paquete `com.joinly.app`.
2. Completar la ficha y todas las declaraciones de **App content**.
3. Añadir instrucciones y una cuenta de revisión funcional. Debe poder acceder
   sin esperar correo, permisos privados o un evento real no disponible.
4. Cargar el `.aab` en la pista interna y resolver pre-launch reports, crashes y
   avisos de política.
5. Completar prueba cerrada y aceptación; comprobar instalación, actualización,
   notificaciones, ubicación y borrado de cuenta en un Android físico.
6. Crear el lanzamiento de producción con publicación controlada o escalonada.
   Empezar con un porcentaje reducido permite detener el lanzamiento si aparece
   una incidencia.
7. Vigilar Android Vitals, reseñas, incidencias de política y el estado del
   backend tras publicar.

## 6. iOS: TestFlight y App Store

### 6.1 Cuentas y material necesario

- Inscripción activa en Apple Developer Program y acceso a App Store Connect.
  La publicación pública requiere una suscripción de pago; una Apple ID gratuita
  no basta.
- Mac con Xcode actualizado si se firma o compila localmente. EAS puede crear la
  build en la nube, pero la cuenta Apple, certificados y perfiles siguen siendo
  necesarios.
- Registro en App Store Connect con el bundle ID `com.joinly.app`, SKU interno,
  categoría, disponibilidad territorial, soporte, política de privacidad,
  capturas, clasificación por edad y contacto de revisión.
- Certificados y perfiles de distribución gestionados por Apple/EAS. No guardar
  claves privadas, archivos `.p12`, perfiles o credenciales Apple en Git.

### 6.2 Build y TestFlight

La configuración actual de `preview` permite una build interna de iOS. Tras
crear el perfil de tienda descrito en la sección 4, para una build candidata a
TestFlight/App Store:

```sh
cd mobile
npx eas-cli build --platform ios --profile store
```

Subirla a App Store Connect mediante EAS o Transporter. Si se usa EAS Submit,
configurar las credenciales de App Store Connect fuera del repositorio y ejecutar
el comando que muestre la build terminada, por ejemplo:

```sh
npx eas-cli submit --platform ios --latest
```

Primero distribuir por TestFlight a personas internas. Las pruebas externas y
algunas builds requieren revisión beta de Apple. La versión de TestFlight debe
ser una candidata real: Apple no acepta betas de demostración como publicación
de la App Store.

### 6.3 Enviar a revisión y publicar

1. Crear la versión en App Store Connect y asociar la build procesada.
2. Completar App Privacy, clasificación por edad, derechos de contenido,
   exportación de cifrado, disponibilidad, precio y ficha localizada.
3. Añadir capturas reales sin datos personales de personas usuarias. Las
   capturas deben reflejar la app en funcionamiento, no solo el inicio de sesión
   o la pantalla de carga.
4. Incluir en **App Review Information** una cuenta de revisión, instrucciones
   de acceso y explicación de cualquier flujo no evidente: correo de prueba,
   ubicación, reportes, bloqueo, moderación y eliminación de cuenta.
5. Mantener el backend activo y accesible durante toda la revisión. Render Free
   puede provocar un tiempo de espera; preparar una cuenta y datos de prueba,
   describir el arranque inicial y, preferiblemente, usar un servicio sin ese
   riesgo antes de enviar.
6. Enviar a App Review, responder con rapidez a preguntas y publicar
   manualmente o automáticamente tras la aprobación.
7. Tras la publicación, vigilar crashes, reseñas, App Store Connect y soporte.

## 7. Requisitos de revisión especialmente relevantes para Joinly

| Área | Qué debe estar listo |
| --- | --- |
| Contenido de usuarios | Reporte, bloqueo, moderación activa, contacto de soporte y respuesta oportuna |
| Ubicación | Finalidad clara, texto de permiso específico, uso mínimo y política coherente |
| Cuentas | Registro, verificación, eliminación y contacto de soporte funcionales |
| Privacidad | Política pública, declaraciones de datos exactas y cifrado HTTPS |
| Metadatos | Nombre, descripción, categoría, edad, capturas y enlaces reales y no engañosos |
| Acceso de revisión | Cuenta de prueba y pasos completos para entrar y probar el flujo central |
| Calidad | Sin bloqueos, crashes, pantallas de marcador, enlaces rotos ni funciones anunciadas pero ausentes |
| Propiedad intelectual | Derechos sobre iconos, tipografías, imágenes, textos y actividades externas |

No deben aparecer datos personales reales en capturas, vídeo, cuenta de revisión

## 8. Checklist de lanzamiento

### Producto y legal

- [ ] Términos, privacidad, normas y soporte publicados en HTTPS.
- [ ] Flujo de consentimiento y versiones de acuerdos probado.
- [ ] Solicitud de eliminación de cuenta visible, atendida y documentada.
- [ ] Política de moderación, bloqueo y respuesta a denuncias operativa.
- [ ] Inventario de datos y SDKs revisado por privacidad.
- [ ] Declaraciones de Data safety y App Privacy completadas con la realidad de
      la build.
- [ ] Público objetivo y clasificación por edad elegidos de forma conservadora.

### Técnica

- [ ] `npm run typecheck`, `npm run lint` y `npm run format:check` correctos.
- [ ] Pruebas de backend y smoke test contra el entorno público correctos.
- [ ] `EXPO_PUBLIC_API_BASE_URL` es HTTPS público y no contiene entorno local.
- [ ] Supabase de la build coincide con el emisor JWT del backend.
- [ ] Build, iconos, nombre, identificadores y números de versión revisados.
- [ ] Android probado en dispositivos físicos representativos.
- [ ] iOS probado en iPhone físico y TestFlight.
- [ ] Permiso de ubicación concedido, denegado y revocado probado.
- [ ] Inicio en frío, pérdida de red, reintento y backend lento probados.

### Tiendas y operación

- [ ] Cuentas de revisión funcionales, sin datos personales y con instrucciones.
- [ ] Capturas y descripciones muestran solo funciones existentes.
- [ ] Contacto de soporte responde y monitorización/alertas están activas.
- [ ] Plan de reversión: detener rollout, despublicar si procede y comunicar una
      incidencia.
- [ ] Propietario de cada cuenta, firma, dominio y servicio documentado.

## 9. Actualizaciones y respuesta a incidentes

- Incrementar el número de build en cada subida y conservar notas de versión
  claras. No reutilizar builds ni sustituir una app publicada con otro paquete.
- Usar pistas de prueba/TestFlight y lanzamiento gradual antes de distribuir un
  cambio relevante.
- Si cambia una práctica de datos, permiso, SDK o política, actualizar primero
  la política de privacidad y las declaraciones de ambas tiendas, y después
  enviar la nueva build.
- Si se filtra un secreto, revocarlo y rotarlo en el proveedor; una clave pública
  de Supabase no se trata como secreto, pero una clave de servicio, contraseña de
  base de datos o clave de firma nunca debe llegar a la app ni al repositorio.
- Si una versión permite exposición de ubicación, asistentes, sesiones o datos
  de cuenta, detener el rollout, ocultar la versión si es necesario, corregir y
  seguir el procedimiento de incidentes y de comunicación aplicable.

## 10. Fuentes oficiales que se deben revisar antes de cada envío

- Apple: [App Review Guidelines](https://developer.apple.com/app-store/review/guidelines/)
- Apple: [App Store Connect Help](https://developer.apple.com/help/app-store-connect/)
- Apple: [TestFlight](https://developer.apple.com/testflight/)
- Google Play: [Preparar una app para revisión](https://support.google.com/googleplay/android-developer/answer/9859455)
- Google Play: [Data safety](https://support.google.com/googleplay/android-developer/answer/10787469)
- Google Play: [Políticas para desarrolladores](https://play.google.com/about/developer-content-policy/)
- Expo: [EAS Build](https://docs.expo.dev/build/introduction/)

Las políticas y requisitos de plataforma cambian. La fecha de publicación es el
momento para volver a revisar estas fuentes, los avisos de Play Console y App
Store Connect, sin basarse únicamente en esta guía.
