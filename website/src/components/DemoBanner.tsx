/**
 * Demo Banner Component
 * "Demo only—Not stored" banner for in-memory sandbox
 */

'use client';

import { useState, useEffect } from 'react';

export default function DemoBanner() {
  const [isVisible, setIsVisible] = useState(true);

  if (!isVisible) {
    return null;
  }

  return (
    <div 
      className="bg-yellow-100 border-l-4 border-yellow-500 p-4 mb-4 rounded-r-lg shadow-sm"
      role="alert"
      aria-label="Demo environment warning"
    >
      <div className="flex items-center">
        <div className="flex-shrink-0">
          <svg className="h-5 w-5 text-yellow-500" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
        </div>
        <div className="ml-3">
          <p className="text-sm text-yellow-800 font-medium">
            🧪 <strong>Demo Environment</strong> - This is a demonstration only. No data is stored or saved.
          </p>
          <p className="text-xs text-yellow-700 mt-1">
            All conversations are temporary and will be cleared when you leave this page.
          </p>
        </div>
        <div className="ml-auto pl-3">
          <button
            onClick={() => setIsVisible(false)}
            className="text-yellow-500 hover:text-yellow-700 focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:ring-offset-2 rounded-md p-1"
            aria-label="Dismiss demo banner"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
