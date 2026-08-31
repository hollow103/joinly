# Joinly

MVP de eventos locales con un backend Java/Spring Boot y PostgreSQL/PostGIS. La especificación de producto está en `docs/`.

El nombre es provisional hasta comprobar disponibilidad de marca, dominio y usuarios en plataformas relevantes.

El proyecto es un monorepo con `mobile/`, `backend/`, `admin/` y `docs/`. Actualmente solo está materializado el backend; las interfaces móviles y de administración siguen fuera de implementación.

## Backend local

Requisitos: Docker Desktop, Java 21 para ejecutar las pruebas locales y Node.js para validar el contrato OpenAPI.

```bash
docker compose up --build --detach
curl -i http://localhost:8080/actuator/health/readiness
```

El contrato navegable está disponible en [Swagger UI](http://localhost:8080/swagger-ui/index.html). Carga `openapi.yaml` y permite enviar peticiones contra el backend local.

```bash
./backend/mvnw -f backend/pom.xml test
npx --yes @redocly/cli lint openapi.yaml
```

Para aplicar el formato Java configurado:

```bash
./backend/mvnw -f backend/pom.xml spotless:apply
```

La prueba de perfil con JWT real de Supabase requiere `SUPABASE_TEST_ACCESS_TOKEN`; consulta `docs/17-identidad-y-administracion.md` para el procedimiento seguro.
