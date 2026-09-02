import { z } from 'zod';

const schema = z.object({
  // Absolute URL for a deployed backend, or a root-relative path when the Vite
  // dev proxy forwards /api to the backend (see vite.config.ts).
  apiBaseUrl: z
    .string()
    .refine(
      (value) => value.startsWith('/') || /^https?:\/\//.test(value),
      'debe ser una URL absoluta (https://…) o una ruta que empiece por "/"',
    ),
  supabaseUrl: z.string().url(),
  supabaseAnonKey: z.string().min(1),
});

export type Env = z.infer<typeof schema>;

function read(): Env {
  const parsed = schema.safeParse({
    apiBaseUrl: import.meta.env.VITE_API_BASE_URL,
    supabaseUrl: import.meta.env.VITE_SUPABASE_URL,
    supabaseAnonKey: import.meta.env.VITE_SUPABASE_ANON_KEY,
  });

  if (!parsed.success) {
    const missing = parsed.error.issues.map((issue) => issue.path.join('.')).join(', ');
    throw new Error(
      `Configuración de entorno inválida o incompleta (${missing}). ` +
        'Copia admin/.env.example a admin/.env y completa los valores.',
    );
  }

  return parsed.data;
}

export const env = read();
