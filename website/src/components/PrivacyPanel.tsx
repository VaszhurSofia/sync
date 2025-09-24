/**
 * Privacy Panel Component
 * Shows "How your data is protected" information
 */

'use client';

import { useState } from 'react';
import { i18n } from '@sync/ui';

interface PrivacyPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function PrivacyPanel({ isOpen, onClose }: PrivacyPanelProps) {
  const [activeSection, setActiveSection] = useState<string>('overview');

  if (!isOpen) return null;

  const privacySections = [
    {
      id: 'overview',
      title: 'Data Protection Overview',
      content: (
        <div className="space-y-4">
          <p className="text-sm text-gray-700">
            Your privacy and security are our top priorities. We use industry-standard 
            encryption and follow strict data protection practices to keep your 
            conversations safe and private.
          </p>
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-green-800">
                  Your data is protected
                </h3>
                <p className="mt-1 text-sm text-green-700">
                  All your conversations are encrypted and stored securely. 
                  We never share your personal data with third parties.
                </p>
              </div>
            </div>
          </div>
        </div>
      )
    },
    {
      id: 'encryption',
      title: 'Encryption & Security',
      content: (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h4 className="font-medium text-blue-900 mb-2">End-to-End Encryption</h4>
              <p className="text-sm text-blue-700">
                Your messages are encrypted using AES-256-GCM encryption, 
                the same standard used by banks and government agencies.
              </p>
            </div>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h4 className="font-medium text-blue-900 mb-2">Secure Key Management</h4>
              <p className="text-sm text-blue-700">
                Encryption keys are managed through AWS KMS with automatic 
                rotation and secure key storage.
              </p>
            </div>
          </div>
          <div className="bg-gray-50 rounded-lg p-4">
            <h4 className="font-medium text-gray-900 mb-2">Technical Details</h4>
            <ul className="text-sm text-gray-700 space-y-1">
              <li>• AES-256-GCM encryption for all message content</li>
              <li>• RSA-2048 for key exchange and authentication</li>
              <li>• TLS 1.3 for all data transmission</li>
              <li>• Regular security audits and penetration testing</li>
            </ul>
          </div>
        </div>
      )
    },
    {
      id: 'data-storage',
      title: 'Data Storage & Retention',
      content: (
        <div className="space-y-4">
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <h4 className="font-medium text-yellow-900 mb-2">Data Minimization</h4>
            <p className="text-sm text-yellow-700">
              We only collect and store the minimum data necessary to provide 
              our service. We don't track your browsing habits or personal information.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-gray-50 rounded-lg p-4">
              <h4 className="font-medium text-gray-900 mb-2">What We Store</h4>
              <ul className="text-sm text-gray-700 space-y-1">
                <li>• Encrypted message content</li>
                <li>• Session metadata (timestamps, participants)</li>
                <li>• Account information (email, encrypted display name)</li>
                <li>• Consent preferences and settings</li>
              </ul>
            </div>
            <div className="bg-gray-50 rounded-lg p-4">
              <h4 className="font-medium text-gray-900 mb-2">What We Don't Store</h4>
              <ul className="text-sm text-gray-700 space-y-1">
                <li>• Unencrypted message content</li>
                <li>• Browsing history or analytics</li>
                <li>• Third-party tracking data</li>
                <li>• Personal information beyond what's necessary</li>
              </ul>
            </div>
          </div>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="font-medium text-blue-900 mb-2">Data Retention</h4>
            <p className="text-sm text-blue-700">
              Your data is retained only as long as necessary. You can delete 
              your account and all associated data at any time. We automatically 
              delete inactive accounts after 2 years.
            </p>
          </div>
        </div>
      )
    },
    {
      id: 'your-rights',
      title: 'Your Privacy Rights',
      content: (
        <div className="space-y-4">
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <h4 className="font-medium text-green-900 mb-2">GDPR Compliance</h4>
            <p className="text-sm text-green-700">
              We comply with the General Data Protection Regulation (GDPR) 
              and give you full control over your personal data.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-gray-50 rounded-lg p-4">
              <h4 className="font-medium text-gray-900 mb-2">Your Rights</h4>
              <ul className="text-sm text-gray-700 space-y-1">
                <li>• Access your personal data</li>
                <li>• Correct inaccurate information</li>
                <li>• Delete your account and data</li>
                <li>• Export your data</li>
                <li>• Withdraw consent at any time</li>
              </ul>
            </div>
            <div className="bg-gray-50 rounded-lg p-4">
              <h4 className="font-medium text-gray-900 mb-2">How to Exercise Rights</h4>
              <ul className="text-sm text-gray-700 space-y-1">
                <li>• Use the settings page for most requests</li>
                <li>• Contact support for complex requests</li>
                <li>• Data export available in settings</li>
                <li>• Account deletion is immediate and permanent</li>
              </ul>
            </div>
          </div>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="font-medium text-blue-900 mb-2">Data Portability</h4>
            <p className="text-sm text-blue-700">
              You can export all your data in a machine-readable format. 
              This includes your messages, settings, and account information.
            </p>
          </div>
        </div>
      )
    },
    {
      id: 'third-parties',
      title: 'Third-Party Services',
      content: (
        <div className="space-y-4">
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <h4 className="font-medium text-yellow-900 mb-2">Limited Third-Party Access</h4>
            <p className="text-sm text-yellow-700">
              We use only essential third-party services and never share 
              your personal data with them. All services are carefully 
              vetted for security and privacy compliance.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-gray-50 rounded-lg p-4">
              <h4 className="font-medium text-gray-900 mb-2">Services We Use</h4>
              <ul className="text-sm text-gray-700 space-y-1">
                <li>• AWS (hosting and encryption)</li>
                <li>• OpenAI (AI processing)</li>
                <li>• PostgreSQL (encrypted database)</li>
                <li>• Vercel (website hosting)</li>
              </ul>
            </div>
            <div className="bg-gray-50 rounded-lg p-4">
              <h4 className="font-medium text-gray-900 mb-2">Data Sharing</h4>
              <ul className="text-sm text-gray-700 space-y-1">
                <li>• No data sold to third parties</li>
                <li>• No advertising or tracking</li>
                <li>• No analytics on personal data</li>
                <li>• No social media integration</li>
              </ul>
            </div>
          </div>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="font-medium text-blue-900 mb-2">AI Processing</h4>
            <p className="text-sm text-blue-700">
              Your messages are processed by AI to provide guidance, but 
              this processing is done securely and your data is not used 
              to train AI models or shared with other users.
            </p>
          </div>
        </div>
      )
    }
  ];

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
        <div className="inline-block w-full max-w-4xl p-6 my-8 overflow-hidden text-left align-middle transition-all transform bg-white shadow-xl rounded-2xl">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-900">
              How Your Data is Protected
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
              aria-label="Close privacy panel"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="flex flex-col lg:flex-row gap-6">
            {/* Navigation */}
            <div className="lg:w-1/3">
              <nav className="space-y-2">
                {privacySections.map((section) => (
                  <button
                    key={section.id}
                    onClick={() => setActiveSection(section.id)}
                    className={`w-full text-left px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      activeSection === section.id
                        ? 'bg-blue-100 text-blue-700'
                        : 'text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    {section.title}
                  </button>
                ))}
              </nav>
            </div>

            {/* Content */}
            <div className="lg:w-2/3">
              {privacySections.find(section => section.id === activeSection)?.content}
            </div>
          </div>

          <div className="mt-8 flex justify-end space-x-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              {i18n.t('common.close')}
            </button>
            <a
              href="/privacy-policy"
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              Full Privacy Policy
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
