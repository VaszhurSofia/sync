'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Palette, Check } from 'lucide-react';
import { Theme, getTheme, applyTheme, getCurrentTheme, toggleTheme, validateThemeAccessibility } from '@sync/ui/theme';

interface ThemeToggleProps {
  className?: string;
  showAccessibilityInfo?: boolean;
}

export default function ThemeToggle({ className = '', showAccessibilityInfo = false }: ThemeToggleProps) {
  const [currentTheme, setCurrentTheme] = useState<Theme>('blue');
  const [isOpen, setIsOpen] = useState(false);
  const [accessibilityChecks, setAccessibilityChecks] = useState<any[]>([]);

  useEffect(() => {
    // Initialize theme
    const initialTheme = getCurrentTheme();
    setCurrentTheme(initialTheme);
    
    // Validate accessibility if requested
    if (showAccessibilityInfo) {
      const theme = getTheme(initialTheme);
      const checks = validateThemeAccessibility(theme);
      setAccessibilityChecks(checks);
    }
  }, [showAccessibilityInfo]);

  const handleThemeChange = (theme: Theme) => {
    applyTheme(theme);
    setCurrentTheme(theme);
    setIsOpen(false);
    
    // Re-validate accessibility if requested
    if (showAccessibilityInfo) {
      const themeTokens = getTheme(theme);
      const checks = validateThemeAccessibility(themeTokens);
      setAccessibilityChecks(checks);
    }
  };

  const handleToggle = () => {
    const newTheme = toggleTheme();
    setCurrentTheme(newTheme);
    
    // Re-validate accessibility if requested
    if (showAccessibilityInfo) {
      const themeTokens = getTheme(newTheme);
      const checks = validateThemeAccessibility(themeTokens);
      setAccessibilityChecks(checks);
    }
  };

  const themes: Array<{ name: Theme; label: string; description: string; color: string }> = [
    {
      name: 'blue',
      label: 'Blue Theme',
      description: 'Professional and trustworthy',
      color: '#3B82F6'
    },
    {
      name: 'green',
      label: 'Green Theme',
      description: 'Calm and harmonious',
      color: '#10B981'
    }
  ];

  return (
    <div className={`relative ${className}`}>
      {/* Toggle Button */}
      <button
        onClick={handleToggle}
        className={`
          flex items-center space-x-2 px-4 py-2 rounded-lg border-2 transition-all duration-200
          ${currentTheme === 'blue' 
            ? 'bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100' 
            : 'bg-green-50 border-green-200 text-green-700 hover:bg-green-100'
          }
          focus:outline-none focus:ring-2 focus:ring-offset-2
          ${currentTheme === 'blue' ? 'focus:ring-blue-500' : 'focus:ring-green-500'}
        `}
        aria-label={`Current theme: ${currentTheme}. Click to toggle theme.`}
        aria-expanded={isOpen}
        aria-haspopup="true"
      >
        <Palette className="h-4 w-4" />
        <span className="font-medium capitalize">{currentTheme} Theme</span>
        <motion.div
          className={`w-3 h-3 rounded-full`}
          style={{ backgroundColor: themes.find(t => t.name === currentTheme)?.color }}
          animate={{ scale: [1, 1.2, 1] }}
          transition={{ duration: 0.3 }}
        />
      </button>

      {/* Theme Options Dropdown */}
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          className="absolute top-full left-0 mt-2 w-64 bg-white rounded-lg shadow-lg border border-gray-200 z-50"
          role="menu"
          aria-label="Theme options"
        >
          <div className="p-2">
            {themes.map((theme) => (
              <button
                key={theme.name}
                onClick={() => handleThemeChange(theme.name)}
                className={`
                  w-full flex items-center space-x-3 px-3 py-2 rounded-md text-left transition-colors
                  ${currentTheme === theme.name 
                    ? 'bg-gray-100' 
                    : 'hover:bg-gray-50'
                  }
                  focus:outline-none focus:bg-gray-100
                `}
                role="menuitem"
                aria-label={`Switch to ${theme.label}`}
              >
                <div className="flex items-center space-x-2">
                  <div
                    className="w-4 h-4 rounded-full border-2 border-white shadow-sm"
                    style={{ backgroundColor: theme.color }}
                  />
                  <span className="font-medium text-gray-900">{theme.label}</span>
                </div>
                <span className="text-sm text-gray-500 flex-1">{theme.description}</span>
                {currentTheme === theme.name && (
                  <Check className="h-4 w-4 text-gray-600" />
                )}
              </button>
            ))}
          </div>
        </motion.div>
      )}

      {/* Accessibility Information */}
      {showAccessibilityInfo && accessibilityChecks.length > 0 && (
        <div className="mt-4 p-3 bg-gray-50 rounded-lg">
          <h4 className="text-sm font-medium text-gray-900 mb-2">Accessibility Check</h4>
          <div className="space-y-1">
            {accessibilityChecks.map((check, index) => (
              <div key={index} className="flex items-center space-x-2 text-sm">
                <div className={`
                  w-2 h-2 rounded-full
                  ${check.wcagLevel === 'AAA' ? 'bg-green-500' : 
                    check.wcagLevel === 'AA' ? 'bg-yellow-500' : 'bg-red-500'}
                `} />
                <span className="text-gray-600">
                  Contrast: {check.contrastRatio}:1 ({check.wcagLevel})
                </span>
              </div>
            ))}
          </div>
          {accessibilityChecks.some(check => check.wcagLevel === 'FAIL') && (
            <div className="mt-2 text-xs text-red-600">
              ⚠️ Some elements may not meet accessibility standards
            </div>
          )}
        </div>
      )}
    </div>
  );
}
