// Design tokens. Light theme only for the pilot; dark is a later concern.
// Spacing in 4 / 8 dp increments and a 48 dp minimum touch target, per docs/18.

export const color = {
  bg: '#F5F7FC',
  surface: '#FFFFFF',
  border: '#E2E7F3',
  text: '#14213D',
  textMuted: '#65708F',
  brandNavy: '#101D40',
  primary: '#3157C9',
  primarySoft: '#EAF0FF',
  accent: '#FF9E3D',
  primaryText: '#FFFFFF',
  danger: '#B9344B',
  success: '#267D61',
  successSoft: '#E5F5EE',
  purple: '#7951A7',
  disabled: '#AAB2BF',
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
  sm: 8,
  md: 12,
  lg: 16,
  pill: 999,
} as const;

export const font = {
  size: { sm: 13, md: 15, lg: 18, xl: 24, xxl: 30 },
  weight: { regular: '400', medium: '500', semibold: '600', bold: '700' },
} as const;

export const minTouch = 48;
export const hitSlop = { top: 8, bottom: 8, left: 8, right: 8 } as const;
