/**
 * Staging Ribbon Component
 * Visible "Staging" ribbon when STAGING=true
 */

'use client';

import { useEffect, useState } from 'react';

export default function StagingRibbon() {
  const [isStaging, setIsStaging] = useState(false);

  useEffect(() => {
    // Check if we're in staging mode
    setIsStaging(process.env.NODE_ENV === 'development' || process.env.STAGING === 'true');
  }, []);

  if (!isStaging) {
    return null;
  }

  return (
    <div 
      className="fixed top-0 left-0 right-0 z-50 bg-red-600 text-white text-center py-2 px-4 font-bold text-sm shadow-lg"
      role="banner"
      aria-label="Staging environment warning"
    >
      🚧 STAGING ENVIRONMENT - NOT FOR PRODUCTION USE 🚧
    </div>
  );
}
