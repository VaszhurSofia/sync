// Shared theme tokens for Sync platform
export interface ThemeTokens {
  colors: {
    primary: string;
    secondary: string;
    accent: string;
    background: string;
    surface: string;
    text: string;
    textSecondary: string;
    border: string;
    error: string;
    warning: string;
    success: string;
    info: string;
  };
  spacing: {
    xs: string;
    sm: string;
    md: string;
    lg: string;
    xl: string;
    xxl: string;
  };
  typography: {
    fontFamily: string;
    fontSize: {
      xs: string;
      sm: string;
      base: string;
      lg: string;
      xl: string;
      xxl: string;
    };
    fontWeight: {
      normal: number;
      medium: number;
      semibold: number;
      bold: number;
    };
    lineHeight: {
      tight: number;
      normal: number;
      relaxed: number;
    };
  };
  borderRadius: {
    sm: string;
    md: string;
    lg: string;
    xl: string;
  };
  shadows: {
    sm: string;
    md: string;
    lg: string;
    xl: string;
  };
}

// Blue theme (default)
export const blueTheme: ThemeTokens = {
  colors: {
    primary: '#3B82F6', // blue-500
    secondary: '#1E40AF', // blue-700
    accent: '#60A5FA', // blue-400
    background: '#FFFFFF',
    surface: '#F8FAFC', // slate-50
    text: '#1E293B', // slate-800
    textSecondary: '#64748B', // slate-500
    border: '#E2E8F0', // slate-200
    error: '#EF4444', // red-500
    warning: '#F59E0B', // amber-500
    success: '#10B981', // emerald-500
    info: '#3B82F6', // blue-500
  },
  spacing: {
    xs: '0.25rem', // 4px
    sm: '0.5rem', // 8px
    md: '1rem', // 16px
    lg: '1.5rem', // 24px
    xl: '2rem', // 32px
    xxl: '3rem', // 48px
  },
  typography: {
    fontFamily: 'system-ui, -apple-system, sans-serif',
    fontSize: {
      xs: '0.75rem', // 12px
      sm: '0.875rem', // 14px
      base: '1rem', // 16px
      lg: '1.125rem', // 18px
      xl: '1.25rem', // 20px
      xxl: '1.5rem', // 24px
    },
    fontWeight: {
      normal: 400,
      medium: 500,
      semibold: 600,
      bold: 700,
    },
    lineHeight: {
      tight: 1.25,
      normal: 1.5,
      relaxed: 1.75,
    },
  },
  borderRadius: {
    sm: '0.25rem', // 4px
    md: '0.375rem', // 6px
    lg: '0.5rem', // 8px
    xl: '0.75rem', // 12px
  },
  shadows: {
    sm: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
    md: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
    lg: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
    xl: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
  },
};

// Green theme
export const greenTheme: ThemeTokens = {
  colors: {
    primary: '#10B981', // emerald-500
    secondary: '#047857', // emerald-700
    accent: '#34D399', // emerald-400
    background: '#FFFFFF',
    surface: '#F0FDF4', // green-50
    text: '#1F2937', // gray-800
    textSecondary: '#6B7280', // gray-500
    border: '#D1FAE5', // emerald-200
    error: '#EF4444', // red-500
    warning: '#F59E0B', // amber-500
    success: '#10B981', // emerald-500
    info: '#3B82F6', // blue-500
  },
  spacing: {
    xs: '0.25rem', // 4px
    sm: '0.5rem', // 8px
    md: '1rem', // 16px
    lg: '1.5rem', // 24px
    xl: '2rem', // 32px
    xxl: '3rem', // 48px
  },
  typography: {
    fontFamily: 'system-ui, -apple-system, sans-serif',
    fontSize: {
      xs: '0.75rem', // 12px
      sm: '0.875rem', // 14px
      base: '1rem', // 16px
      lg: '1.125rem', // 18px
      xl: '1.25rem', // 20px
      xxl: '1.5rem', // 24px
    },
    fontWeight: {
      normal: 400,
      medium: 500,
      semibold: 600,
      bold: 700,
    },
    lineHeight: {
      tight: 1.25,
      normal: 1.5,
      relaxed: 1.75,
    },
  },
  borderRadius: {
    sm: '0.25rem', // 4px
    md: '0.375rem', // 6px
    lg: '0.5rem', // 8px
    xl: '0.75rem', // 12px
  },
  shadows: {
    sm: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
    md: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
    lg: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
    xl: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
  },
};

// Theme type
export type Theme = 'blue' | 'green';

// Theme registry
export const themes: Record<Theme, ThemeTokens> = {
  blue: blueTheme,
  green: greenTheme,
};

// Get theme by name
export function getTheme(themeName: Theme): ThemeTokens {
  return themes[themeName] || blueTheme;
}

// Convert theme tokens to CSS custom properties
export function themeToCSS(theme: ThemeTokens): Record<string, string> {
  const cssVars: Record<string, string> = {};
  
  // Colors
  Object.entries(theme.colors).forEach(([key, value]) => {
    cssVars[`--color-${key}`] = value;
  });
  
  // Spacing
  Object.entries(theme.spacing).forEach(([key, value]) => {
    cssVars[`--spacing-${key}`] = value;
  });
  
  // Typography
  cssVars['--font-family'] = theme.typography.fontFamily;
  Object.entries(theme.typography.fontSize).forEach(([key, value]) => {
    cssVars[`--font-size-${key}`] = value;
  });
  Object.entries(theme.typography.fontWeight).forEach(([key, value]) => {
    cssVars[`--font-weight-${key}`] = value.toString();
  });
  Object.entries(theme.typography.lineHeight).forEach(([key, value]) => {
    cssVars[`--line-height-${key}`] = value.toString();
  });
  
  // Border radius
  Object.entries(theme.borderRadius).forEach(([key, value]) => {
    cssVars[`--border-radius-${key}`] = value;
  });
  
  // Shadows
  Object.entries(theme.shadows).forEach(([key, value]) => {
    cssVars[`--shadow-${key}`] = value;
  });
  
  return cssVars;
}

// Apply theme to document
export function applyTheme(themeName: Theme): void {
  const theme = getTheme(themeName);
  const cssVars = themeToCSS(theme);
  
  const root = document.documentElement;
  Object.entries(cssVars).forEach(([property, value]) => {
    root.style.setProperty(property, value);
  });
  
  // Add theme class to body
  document.body.className = document.body.className.replace(/theme-\w+/g, '');
  document.body.classList.add(`theme-${themeName}`);
}

// Get current theme from document
export function getCurrentTheme(): Theme {
  const bodyClasses = document.body.className;
  const themeMatch = bodyClasses.match(/theme-(\w+)/);
  return (themeMatch?.[1] as Theme) || 'blue';
}

// Theme toggle function
export function toggleTheme(): Theme {
  const currentTheme = getCurrentTheme();
  const newTheme: Theme = currentTheme === 'blue' ? 'green' : 'blue';
  applyTheme(newTheme);
  return newTheme;
}

// Accessibility utilities
export interface AccessibilityCheck {
  contrastRatio: number;
  wcagLevel: 'AA' | 'AAA' | 'FAIL';
  recommendations: string[];
}

// Check contrast ratio between two colors
export function checkContrastRatio(foreground: string, background: string): AccessibilityCheck {
  // Convert hex to RGB
  const hexToRgb = (hex: string) => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : null;
  };

  // Calculate relative luminance
  const getLuminance = (r: number, g: number, b: number) => {
    const [rs, gs, bs] = [r, g, b].map(c => {
      c = c / 255;
      return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
  };

  const fgRgb = hexToRgb(foreground);
  const bgRgb = hexToRgb(background);

  if (!fgRgb || !bgRgb) {
    return {
      contrastRatio: 0,
      wcagLevel: 'FAIL',
      recommendations: ['Invalid color format']
    };
  }

  const fgLuminance = getLuminance(fgRgb.r, fgRgb.g, fgRgb.b);
  const bgLuminance = getLuminance(bgRgb.r, bgRgb.g, bgRgb.b);

  const contrastRatio = (Math.max(fgLuminance, bgLuminance) + 0.05) / (Math.min(fgLuminance, bgLuminance) + 0.05);

  let wcagLevel: 'AA' | 'AAA' | 'FAIL';
  let recommendations: string[] = [];

  if (contrastRatio >= 7) {
    wcagLevel = 'AAA';
  } else if (contrastRatio >= 4.5) {
    wcagLevel = 'AA';
  } else {
    wcagLevel = 'FAIL';
    recommendations.push('Increase contrast ratio to meet WCAG AA standards (4.5:1)');
  }

  if (contrastRatio < 7) {
    recommendations.push('Consider increasing contrast to meet WCAG AAA standards (7:1)');
  }

  return {
    contrastRatio: Math.round(contrastRatio * 100) / 100,
    wcagLevel,
    recommendations
  };
}

// Validate theme accessibility
export function validateThemeAccessibility(theme: ThemeTokens): AccessibilityCheck[] {
  const checks: AccessibilityCheck[] = [];

  // Check primary text on background
  checks.push(checkContrastRatio(theme.colors.text, theme.colors.background));
  
  // Check secondary text on background
  checks.push(checkContrastRatio(theme.colors.textSecondary, theme.colors.background));
  
  // Check primary color on background
  checks.push(checkContrastRatio(theme.colors.primary, theme.colors.background));
  
  // Check text on primary color
  checks.push(checkContrastRatio(theme.colors.background, theme.colors.primary));

  return checks;
}

// Export default theme
export const defaultTheme = blueTheme;
