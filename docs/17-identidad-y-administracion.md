# Identidad y administración

## Autenticación

Supabase Auth gestiona exclusivamente el registro por correo y contraseña, la confirmación de correo y las sesiones. El backend recibe el JWT Bearer, valida firma ES256 mediante el JWKS público del proyecto, emisor, audiencia, caducidad y el UUID del claim `sub`. Para sincronizar el correo validado consulta el endpoint autenticado de Supabase `/auth/v1/user` y exige `email_confirmed_at`; no presupone que ese dato exista como claim del JWT. Nunca recibe ni almacena contraseñas.

Un JWT válido sin perfil interno recibe `403 profile_required`. La persona crea el perfil con `PUT /api/v1/me`, declarando que es adulta y aceptando las versiones `v1` de términos, privacidad y normas. La declaración de edad no es una verificación de identidad.

## Pruebas con Supabase

La prueba de integración de perfil requiere un token real, temporal y no versionado de una cuenta de prueba con correo confirmado. Guardar el token solo en `.env`, que está ignorado:

```bash
SUPABASE_TEST_ACCESS_TOKEN=<token-de-prueba>
```

Antes de ejecutar la prueba, la sesión de terminal debe exportar las variables de `.env`. El token no se guarda en el repositorio ni en registros. Sin esa variable la prueba se omite de forma explícita; las pruebas de migraciones y contrato continúan ejecutándose.

## Rol administrador

No existe endpoint público para asignar roles. Una persona operadora autorizada ejecuta el cambio mediante una transacción en PostgreSQL y deja una auditoría inmutable:

```sql
BEGIN;

UPDATE users
SET role = 'admin', version = version + 1, updated_at = now()
WHERE auth_subject = '<uuid-de-supabase>'
RETURNING id;

INSERT INTO account_audit (actor_id, subject_id, action, note)
VALUES ('<uuid-operador-o-null-en-el-alta-inicial>', '<id-interno-devuelto>', 'admin_granted', '<motivo>');

COMMIT;
```

La retirada del rol usa `role = 'user'` y `action = 'admin_revoked'`. Se registra la referencia de la solicitud de moderación o del cambio autorizado junto al motivo.

## Suspensión y revocación

El backend consulta el estado interno en cada petición: una cuenta `suspended` recibe `403 account_suspended` incluso con un JWT aún válido. La persona operadora debe revocar las sesiones activas desde los controles administrativos del proyecto Supabase y registrar la solicitud mediante `account_audit` con `action = 'session_revocation_requested'`. No se configura ni almacena una clave de servicio de Supabase en el repositorio.
