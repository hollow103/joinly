# Joinly · Panel de moderación

Panel web interno para la Fase 5 del MVP (`docs/16-plan-implementacion-mvp.md`).
React + TypeScript + Vite + Tailwind + Tremor. Consume **solo** la API del backend
(`/api/v1/admin/reports*`); Supabase se usa únicamente para el login del moderador.

## Alcance actual

- Login por correo y contraseña (Supabase Auth).
- Comprobación del rol `admin` contra `GET /me`; una cuenta sin rol ve un aviso y no
  puede operar (el backend además responde `403 admin_required`).
- Cola de reportes por estado (`pending` / `resolved` / `archived`) con paginación por cursor.
- Detalle de un reporte y decisión: resolver o archivar, con acción
  `none` / `hideEvent` / `warnUser` / `suspendUser` y nota interna, enviada con `If-Match`.
  Un `412` / `428` avisa de que el reporte cambió y hay que recargar.

Fuera de esta iteración: dashboard con la gráfica de eventos creados y las
estadísticas de uso (`docs/10`), que necesita un endpoint `GET /admin/metrics`
nuevo en el backend y componentes de Tremor Charts.

## Puesta en marcha

```sh
cd admin
npm install
cp .env.example .env      # completa VITE_SUPABASE_ANON_KEY
npm run dev               # http://localhost:5173
```

Requiere el backend accesible en `VITE_API_BASE_URL` (por defecto
`http://localhost:8080/api/v1`, el de Docker Compose) y una cuenta Supabase con
`role = 'admin'` en la tabla `users` (ver `docs/17-identidad-y-administracion.md`).

## Comandos

| Comando                           | Efecto                                    |
| --------------------------------- | ----------------------------------------- |
| `npm run dev`                     | Servidor de desarrollo Vite               |
| `npm run build`                   | `tsc -b` + build de producción en `dist/` |
| `npm run typecheck`               | Solo comprobación de tipos                |
| `npm run format` / `format:check` | Prettier                                  |

## Despliegue

Pendiente: sitio estático (Render, según `docs/09-despliegue-y-cicd.md`). El build
es estático; hace falta configurar el fallback SPA a `index.html`.
