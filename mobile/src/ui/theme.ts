import { color } from '@/ui/tokens';

export const lightTheme = { ...color } as const;
export type Theme = typeof lightTheme;
