export * from './colors';
export * from './typography';
export * from './spacing';

import { colors } from './colors';
import { typography } from './typography';
import { spacing, borderRadius, shadows } from './spacing';

export const tokens = {
  colors,
  typography,
  spacing,
  borderRadius,
  shadows,
};

export type DesignTokens = typeof tokens;
