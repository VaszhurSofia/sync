/**
 * Accessibility Utilities
 * WCAG AA compliance helpers and screen reader support
 */

export interface AccessibilityConfig {
  reducedMotion: boolean;
  highContrast: boolean;
  fontSize: 'small' | 'medium' | 'large' | 'extra-large';
  screenReader: boolean;
  keyboardNavigation: boolean;
}

export class AccessibilityManager {
  private config: AccessibilityConfig;
  private listeners: Map<string, () => void> = new Map();

  constructor() {
    this.config = this.getInitialConfig();
    this.setupEventListeners();
  }

  private getInitialConfig(): AccessibilityConfig {
    // Check for user preferences
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const prefersHighContrast = window.matchMedia('(prefers-contrast: high)').matches;
    
    // Check for screen reader
    const screenReader = this.detectScreenReader();
    
    // Get saved preferences
    const savedConfig = localStorage.getItem('sync-accessibility-config');
    const saved = savedConfig ? JSON.parse(savedConfig) : {};

    return {
      reducedMotion: saved.reducedMotion ?? prefersReducedMotion,
      highContrast: saved.highContrast ?? prefersHighContrast,
      fontSize: saved.fontSize ?? 'medium',
      screenReader: saved.screenReader ?? screenReader,
      keyboardNavigation: saved.keyboardNavigation ?? false
    };
  }

  private detectScreenReader(): boolean {
    // Check for common screen reader indicators
    const hasScreenReader = 
      navigator.userAgent.includes('NVDA') ||
      navigator.userAgent.includes('JAWS') ||
      navigator.userAgent.includes('VoiceOver') ||
      !!window.speechSynthesis ||
      document.querySelector('[aria-live]') !== null;
    
    return hasScreenReader;
  }

  private setupEventListeners() {
    // Listen for system preference changes
    const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const contrastQuery = window.matchMedia('(prefers-contrast: high)');
    
    motionQuery.addEventListener('change', () => {
      this.config.reducedMotion = motionQuery.matches;
      this.applyConfig();
    });
    
    contrastQuery.addEventListener('change', () => {
      this.config.highContrast = contrastQuery.matches;
      this.applyConfig();
    });

    // Listen for keyboard navigation
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Tab') {
        this.config.keyboardNavigation = true;
        this.applyConfig();
      }
    });

    // Listen for mouse usage (disable keyboard navigation)
    document.addEventListener('mousedown', () => {
      this.config.keyboardNavigation = false;
      this.applyConfig();
    });
  }

  public updateConfig(updates: Partial<AccessibilityConfig>) {
    this.config = { ...this.config, ...updates };
    this.saveConfig();
    this.applyConfig();
  }

  public getConfig(): AccessibilityConfig {
    return { ...this.config };
  }

  private saveConfig() {
    localStorage.setItem('sync-accessibility-config', JSON.stringify(this.config));
  }

  private applyConfig() {
    const root = document.documentElement;
    
    // Apply reduced motion
    if (this.config.reducedMotion) {
      root.classList.add('reduce-motion');
    } else {
      root.classList.remove('reduce-motion');
    }
    
    // Apply high contrast
    if (this.config.highContrast) {
      root.classList.add('high-contrast');
    } else {
      root.classList.remove('high-contrast');
    }
    
    // Apply font size
    root.classList.remove('font-small', 'font-medium', 'font-large', 'font-extra-large');
    root.classList.add(`font-${this.config.fontSize}`);
    
    // Apply keyboard navigation
    if (this.config.keyboardNavigation) {
      root.classList.add('keyboard-navigation');
    } else {
      root.classList.remove('keyboard-navigation');
    }
  }

  public announceToScreenReader(message: string, priority: 'polite' | 'assertive' = 'polite') {
    if (!this.config.screenReader) return;
    
    const announcement = document.createElement('div');
    announcement.setAttribute('aria-live', priority);
    announcement.setAttribute('aria-atomic', 'true');
    announcement.className = 'sr-only';
    announcement.textContent = message;
    
    document.body.appendChild(announcement);
    
    // Remove after announcement
    setTimeout(() => {
      document.body.removeChild(announcement);
    }, 1000);
  }

  public focusElement(selector: string) {
    const element = document.querySelector(selector) as HTMLElement;
    if (element) {
      element.focus();
      this.announceToScreenReader(`Focused on ${element.textContent || element.getAttribute('aria-label') || 'element'}`);
    }
  }

  public setupKeyboardNavigation() {
    // Add keyboard navigation support
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        // Close modals, dropdowns, etc.
        const openModal = document.querySelector('[role="dialog"]:not([aria-hidden="true"])');
        if (openModal) {
          const closeButton = openModal.querySelector('[aria-label*="close"], [aria-label*="Close"]');
          if (closeButton) {
            (closeButton as HTMLElement).click();
          }
        }
      }
    });
  }
}

// Global accessibility manager
export const accessibility = new AccessibilityManager();

// Utility functions
export function getAccessibilityConfig(): AccessibilityConfig {
  return accessibility.getConfig();
}

export function updateAccessibilityConfig(updates: Partial<AccessibilityConfig>) {
  accessibility.updateConfig(updates);
}

export function announceToScreenReader(message: string, priority: 'polite' | 'assertive' = 'polite') {
  accessibility.announceToScreenReader(message, priority);
}

export function focusElement(selector: string) {
  accessibility.focusElement(selector);
}

// CSS classes for accessibility
export const accessibilityClasses = {
  srOnly: 'sr-only',
  focusVisible: 'focus-visible',
  reducedMotion: 'reduce-motion',
  highContrast: 'high-contrast',
  keyboardNavigation: 'keyboard-navigation'
};
