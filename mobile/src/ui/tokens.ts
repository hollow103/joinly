// Design tokens — Rebranding "Aurora / cristal" (Dirección H).
// Luz suave y aire: fondo casi-blanco con manchas de aurora muy difusas,
// superficies de cristal esmerilado (blanco translúcido + filo claro + sombra difusa),
// radios amplios (22–26) y una sola tipografía, Manrope, con contraste de peso.
// Periwinkle = acción. Menta = participación confirmada.
// Burdeos = segundo tono cálido de marca (categorías cálidas, botón Crear, avisos)
// y el punto del logo. Espaciado en 4 / 8 dp, objetivo táctil mínimo de 48 dp.

export const color = {
  bg: '#F4F2FC', // fondo aurora — base casi-blanca lila
  bgDeep: '#ECE9F8', // fondo en zonas hundidas / listas
  // "Cristal" = tinte sólido casi-blanco. Debe ser OPACO: en Android un fondo
  // con alpha < 1 junto a `elevation` pinta una sombra rectangular (el recuadro
  // blanco que se veía en el radar y el listado). El look translúcido se
  // consigue con el tinte claro sobre la aurora, sin blur.
  surface: '#FBFAFF',
  surfaceSolid: '#FFFFFF',
  glassBorder: '#ECE9F8', // filo del cristal — hairline lila muy tenue
  border: '#E4E1F0', // filete tenue
  hairline: 'rgba(120,110,170,0.16)', // separadores dentro del cristal
  text: '#1D1B2E', // tinta
  textMuted: '#6E6A85',
  brandNavy: '#1D1B2E',

  primary: '#6B7CFF', // periwinkle — acción, enlaces, selección, kickers
  primaryDeep: '#5B6CF0',
  primaryGradTop: '#7C8BFF', // degradado del CTA
  primaryGradBottom: '#6B7CFF',
  primarySoft: 'rgba(107,124,255,0.14)', // periwinkle tenue — selección suave
  primaryText: '#FFFFFF',

  accent: '#7E2D46', // burdeos — segundo tono cálido de marca (alias histórico "accent")
  burgundy: '#7E2D46',
  burgundySoft: '#F1E4EA', // burdeos tenue sólido — avisos, categorías cálidas
  burgundyText: '#FFFFFF',

  danger: '#B23A54', // rojo-burdeos — peligro, abandonar
  success: '#2FA985', // menta profunda — texto de participación confirmada
  successSoft: '#E3F5EE', // menta tenue sólida
  mint: '#4FD6A6',
  purple: '#8A6BFF', // categoría cultura y ocio — dentro de la familia periwinkle
  disabled: '#C9C4DE',
} as const;

export const space = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
} as const;

export const radius = {
  sm: 12,
  md: 16,
  lg: 22,
  xl: 26,
  pill: 999,
} as const;

// Sombras — suaves y multicapa, en morado tenue. En RN una capa por objeto:
// iOS lee shadow*, Android lee elevation. Se aproxima el "0 2px + 0 22px -18px".
export const shadow = {
  soft: {
    shadowColor: '#463C82',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 3,
  },
  card: {
    shadowColor: '#463C82',
    shadowOffset: { width: 0, height: 18 },
    shadowOpacity: 0.16,
    shadowRadius: 30,
    elevation: 6,
  },
  cta: {
    shadowColor: '#6B7CFF',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 22,
    elevation: 9,
  },
  ctaSunk: {
    shadowColor: '#6B7CFF',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 3,
  },
  nav: {
    shadowColor: '#463C82',
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 0.22,
    shadowRadius: 36,
    elevation: 12,
  },
} as const;

// Familias tipográficas: nombres exactos de las caras Manrope cargadas en app/_layout.
// React Native no sintetiza pesos con fuentes propias; cada peso es su propia cara.
// Los alias "serif*" se conservan (apuntan a Manrope) para no tocar cada pantalla.
export const font = {
  family: {
    sans: 'Manrope_400Regular',
    sansMedium: 'Manrope_500Medium',
    sansSemibold: 'Manrope_600SemiBold',
    sansBold: 'Manrope_700Bold',
    sansExtra: 'Manrope_800ExtraBold',
    serif: 'Manrope_700Bold',
    serifSemibold: 'Manrope_800ExtraBold',
  },
  size: { sm: 13, md: 15, lg: 18, xl: 25, xxl: 30 },
  weight: { regular: '400', medium: '500', semibold: '600', bold: '700' },
} as const;

export const minTouch = 48;
export const hitSlop = { top: 8, bottom: 8, left: 8, right: 8 } as const;
