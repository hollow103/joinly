import { z } from 'zod';

const schema = z.object({
  apiBaseUrl: z.string().url(),
  supabaseUrl: z.string().url(),
  supabaseAnonKey: z.string().min(1),
});

export type Env = z.infer<typeof schema>;

// EXPO_PUBLIC_* variables are inlined by Metro at build time, so they must be
// referenced statically (no computed access).
function read(): Env {
  const parsed = schema.safeParse({
    apiBaseUrl: process.env.EXPO_PUBLIC_API_BASE_URL,
    supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL,
    supabaseAnonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
  });

  if (!parsed.success) {
    const missing = parsed.error.issues.map((issue) => issue.path.join('.')).join(', ');
    throw new Error(
      `Configuración de entorno inválida o incompleta (${missing}). ` +
        'Copia mobile/.env.example a mobile/.env y completa los valores.',
    );
  }

  return parsed.data;
}

export const env = read();
