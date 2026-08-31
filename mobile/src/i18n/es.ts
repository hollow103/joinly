export const es = {
  common: {
    appName: 'Joinly',
    retry: 'Reintentar',
    loading: 'Cargando…',
  },
  auth: {
    signInSubtitle: 'Accede con tu correo para descubrir y crear eventos cerca de ti.',
    signInCta: 'Iniciar sesión',
    comingSoon: 'Disponible en el siguiente hito',
  },
  system: {
    title: 'Estado del sistema',
    apiBase: 'API',
    session: 'Sesión',
    anonymousOk: 'Sin iniciar (401), como se espera en este hito',
    networkError: 'No se pudo contactar con el backend. ¿Está el Compose levantado?',
    unexpected: 'Respuesta inesperada del backend',
  },
  home: {
    title: 'Inicio',
    placeholder: 'Aquí irá el descubrimiento de eventos (hito M2).',
  },
  notFound: {
    title: 'Esta pantalla no existe.',
    back: 'Volver al inicio',
  },
} as const;

export type Resources = typeof es;
