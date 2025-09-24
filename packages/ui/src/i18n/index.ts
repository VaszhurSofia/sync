/**
 * Internationalization (i18n) Infrastructure
 * Supports multiple languages with fallback to English
 */

export interface LocaleConfig {
  code: string;
  name: string;
  nativeName: string;
  direction: 'ltr' | 'rtl';
  dateFormat: string;
  timeFormat: string;
}

export const SUPPORTED_LOCALES: Record<string, LocaleConfig> = {
  en: {
    code: 'en',
    name: 'English',
    nativeName: 'English',
    direction: 'ltr',
    dateFormat: 'MM/DD/YYYY',
    timeFormat: '12h'
  },
  de: {
    code: 'de',
    name: 'German',
    nativeName: 'Deutsch',
    direction: 'ltr',
    dateFormat: 'DD.MM.YYYY',
    timeFormat: '24h'
  }
};

export type SupportedLocale = keyof typeof SUPPORTED_LOCALES;

export interface TranslationKeys {
  // Common UI
  common: {
    save: string;
    cancel: string;
    delete: string;
    edit: string;
    close: string;
    back: string;
    next: string;
    previous: string;
    loading: string;
    error: string;
    success: string;
    warning: string;
    info: string;
  };
  
  // Authentication
  auth: {
    login: string;
    logout: string;
    email: string;
    password: string;
    confirmPassword: string;
    forgotPassword: string;
    resetPassword: string;
    createAccount: string;
    alreadyHaveAccount: string;
    dontHaveAccount: string;
  };
  
  // Session Management
  session: {
    startSession: string;
    endSession: string;
    yourTurn: string;
    waitingForPartner: string;
    sessionEnded: string;
    sessionExpired: string;
    joinSession: string;
    leaveSession: string;
  };
  
  // Therapist Responses
  therapist: {
    mirror: string;
    clarify: string;
    explore: string;
    microActions: string;
    check: string;
    boundaryMessage: string;
    safetyResources: string;
  };
  
  // Survey & Feedback
  survey: {
    howWasSession: string;
    notHelpful: string;
    neutral: string;
    helpful: string;
    submitFeedback: string;
    thankYou: string;
  };
  
  // Safety & Boundaries
  safety: {
    boundaryDetected: string;
    safetyResources: string;
    emergencyContacts: string;
    professionalHelp: string;
    crisisSupport: string;
  };
  
  // Settings & Preferences
  settings: {
    language: string;
    theme: string;
    notifications: string;
    privacy: string;
    dataRetention: string;
    deleteAccount: string;
  };
}

export class I18nManager {
  private currentLocale: SupportedLocale = 'en';
  private translations: Record<SupportedLocale, TranslationKeys> = {} as any;
  
  constructor(initialLocale: SupportedLocale = 'en') {
    this.currentLocale = initialLocale;
    this.loadTranslations();
  }
  
  private async loadTranslations() {
    // Load English (fallback)
    this.translations.en = (await import('./locales/en.json')).default;
    
    // Load German
    this.translations.de = (await import('./locales/de.json')).default;
  }
  
  setLocale(locale: SupportedLocale) {
    this.currentLocale = locale;
  }
  
  getLocale(): SupportedLocale {
    return this.currentLocale;
  }
  
  t(key: string): string {
    const keys = key.split('.');
    let translation: any = this.translations[this.currentLocale];
    
    for (const k of keys) {
      translation = translation?.[k];
    }
    
    if (!translation) {
      // Fallback to English
      let fallback: any = this.translations.en;
      for (const k of keys) {
        fallback = fallback?.[k];
      }
      if (!fallback) {
        console.warn(`Translation missing for key: ${key}`);
        return key;
      }
      return String(fallback);
    }
    return String(translation);
  }
  
  getSupportedLocales(): LocaleConfig[] {
    return Object.values(SUPPORTED_LOCALES);
  }
  
  getCurrentLocaleConfig(): LocaleConfig {
    return SUPPORTED_LOCALES[this.currentLocale];
  }
}

// Global instance
export const i18n = new I18nManager();
