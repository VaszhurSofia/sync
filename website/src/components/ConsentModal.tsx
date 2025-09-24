/**
 * Consent Modal Component
 * Handles user consent for session history storage
 */

'use client';

import { useState } from 'react';
import { i18n } from '@sync/ui';

interface ConsentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConsent: (consentGiven: boolean) => void;
  sessionSummary: string;
  sessionDate: string;
}

export default function ConsentModal({
  isOpen,
  onClose,
  onConsent,
  sessionSummary,
  sessionDate
}: ConsentModalProps) {
  const [isLoading, setIsLoading] = useState(false);

  if (!isOpen) return null;

  const handleConsent = async (consentGiven: boolean) => {
    setIsLoading(true);
    try {
      await onConsent(consentGiven);
      onClose();
    } catch (error) {
      console.error('Failed to update consent:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
        {/* Background overlay */}
        <div 
          className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75"
          onClick={onClose}
          aria-hidden="true"
        />

        {/* Modal panel */}
        <div className="inline-block w-full max-w-2xl p-6 my-8 overflow-hidden text-left align-middle transition-all transform bg-white shadow-xl rounded-2xl">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-gray-900">
              {i18n.t('settings.privacy')} - {i18n.t('settings.dataRetention')}
            </h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 focus:outline-none"
              aria-label="Close modal"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="mb-6">
            <p className="text-sm text-gray-600 mb-4">
              {i18n.t('settings.privacy')} - {i18n.t('settings.dataRetention')}
            </p>
            
            <div className="bg-gray-50 rounded-lg p-4 mb-4">
              <h4 className="font-medium text-gray-900 mb-2">
                Session Summary ({sessionDate})
              </h4>
              <p className="text-sm text-gray-700 leading-relaxed">
                {sessionSummary}
              </p>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-blue-800">
                    Data Protection Notice
                  </h3>
                  <div className="mt-2 text-sm text-blue-700">
                    <ul className="list-disc list-inside space-y-1">
                      <li>Your session summary will be encrypted and stored securely</li>
                      <li>You can withdraw consent at any time</li>
                      <li>Data is only used to improve your experience</li>
                      <li>We never share your personal data with third parties</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-end space-x-3">
            <button
              onClick={() => handleConsent(false)}
              disabled={isLoading}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50"
            >
              {i18n.t('common.cancel')}
            </button>
            <button
              onClick={() => handleConsent(true)}
              disabled={isLoading}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50"
            >
              {isLoading ? i18n.t('common.loading') : 'Store Summary'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
