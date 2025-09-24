/**
 * Language Selector Component
 * Allows users to switch between supported languages
 */

'use client';

import { useState, useEffect } from 'react';
import { i18n, SupportedLocale, SUPPORTED_LOCALES } from '@sync/ui/i18n';

interface LanguageSelectorProps {
  className?: string;
  showNativeNames?: boolean;
}

export default function LanguageSelector({ 
  className = '', 
  showNativeNames = true 
}: LanguageSelectorProps) {
  const [currentLocale, setCurrentLocale] = useState<SupportedLocale>('en');
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    // Get current locale from localStorage or default to 'en'
    const savedLocale = localStorage.getItem('sync-locale') as SupportedLocale;
    if (savedLocale && SUPPORTED_LOCALES[savedLocale]) {
      setCurrentLocale(savedLocale);
      i18n.setLocale(savedLocale);
    }
  }, []);

  const handleLocaleChange = (locale: SupportedLocale) => {
    setCurrentLocale(locale);
    i18n.setLocale(locale);
    localStorage.setItem('sync-locale', locale);
    setIsOpen(false);
    
    // Trigger a custom event for other components to listen to
    window.dispatchEvent(new CustomEvent('localeChanged', { detail: { locale } }));
  };

  const currentLocaleConfig = SUPPORTED_LOCALES[currentLocale];

  return (
    <div className={`relative ${className}`}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-2 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        aria-label="Select language"
        aria-expanded={isOpen}
        aria-haspopup="listbox"
      >
        <span className="text-lg" role="img" aria-label={currentLocaleConfig.nativeName}>
          {currentLocale === 'en' ? '🇺🇸' : '🇩🇪'}
        </span>
        <span>
          {showNativeNames ? currentLocaleConfig.nativeName : currentLocaleConfig.name}
        </span>
        <svg
          className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div
          className="absolute right-0 z-10 mt-1 w-48 bg-white border border-gray-300 rounded-md shadow-lg"
          role="listbox"
        >
          {Object.entries(SUPPORTED_LOCALES).map(([code, config]) => (
            <button
              key={code}
              onClick={() => handleLocaleChange(code as SupportedLocale)}
              className={`w-full flex items-center space-x-3 px-4 py-2 text-sm text-left hover:bg-gray-100 ${
                currentLocale === code ? 'bg-blue-50 text-blue-700' : 'text-gray-700'
              }`}
              role="option"
              aria-selected={currentLocale === code}
            >
              <span className="text-lg" role="img" aria-label={config.nativeName}>
                {code === 'en' ? '🇺🇸' : '🇩🇪'}
              </span>
              <div>
                <div className="font-medium">
                  {showNativeNames ? config.nativeName : config.name}
                </div>
                <div className="text-xs text-gray-500">
                  {showNativeNames ? config.name : config.nativeName}
                </div>
              </div>
              {currentLocale === code && (
                <svg className="w-4 h-4 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
