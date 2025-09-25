'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Users, 
  Eye, 
  EyeOff, 
  Edit3, 
  CheckCircle, 
  AlertTriangle,
  Lock,
  ArrowRight,
  Trash2,
  Save
} from 'lucide-react';

interface SoloToCoupleConverterProps {
  soloSessionId: string;
  originalSummary: string;
  onConvert: (redactedSummary: string) => void;
  onCancel: () => void;
}

export default function SoloToCoupleConverter({
  soloSessionId,
  originalSummary,
  onConvert,
  onCancel
}: SoloToCoupleConverterProps) {
  const [redactedSummary, setRedactedSummary] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [showOriginal, setShowOriginal] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [safetyWarnings, setSafetyWarnings] = useState<string[]>([]);

  // Auto-redact sensitive information
  useEffect(() => {
    const autoRedact = (text: string) => {
      let redacted = text;
      
      // Redact personal identifiers
      redacted = redacted.replace(/\b[A-Z][a-z]+ [A-Z][a-z]+\b/g, '[Name]');
      redacted = redacted.replace(/\b\d{3}-\d{2}-\d{4}\b/g, '[SSN]');
      redacted = redacted.replace(/\b\d{3}-\d{3}-\d{4}\b/g, '[Phone]');
      redacted = redacted.replace(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g, '[Email]');
      
      // Redact specific locations
      redacted = redacted.replace(/\b\d+\s+[A-Za-z\s]+(?:Street|St|Avenue|Ave|Road|Rd|Drive|Dr|Lane|Ln|Boulevard|Blvd)\b/g, '[Address]');
      
      // Redact specific names of people (common patterns)
      redacted = redacted.replace(/\b(?:mom|dad|mother|father|sister|brother|friend|boss|manager|doctor|therapist)\b/gi, '[Person]');
      
      // Redact specific relationship details
      redacted = redacted.replace(/\b(?:divorce|marriage|wedding|anniversary|birthday)\b/gi, '[Event]');
      
      return redacted;
    };

    setRedactedSummary(autoRedact(originalSummary));
  }, [originalSummary]);

  // Check for safety warnings
  useEffect(() => {
    const warnings: string[] = [];
    
    if (redactedSummary.toLowerCase().includes('abuse')) {
      warnings.push('Content mentions abuse - consider professional help');
    }
    if (redactedSummary.toLowerCase().includes('violence')) {
      warnings.push('Content mentions violence - consider professional help');
    }
    if (redactedSummary.toLowerCase().includes('suicide') || redactedSummary.toLowerCase().includes('self-harm')) {
      warnings.push('Content mentions self-harm - consider professional help');
    }
    if (redactedSummary.toLowerCase().includes('drug') || redactedSummary.toLowerCase().includes('alcohol')) {
      warnings.push('Content mentions substance use - consider professional help');
    }
    
    setSafetyWarnings(warnings);
  }, [redactedSummary]);

  const handleConvert = async () => {
    setIsProcessing(true);
    try {
      await onConvert(redactedSummary);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReset = () => {
    setRedactedSummary(originalSummary);
    setIsEditing(false);
  };

  const handleSave = () => {
    setIsEditing(false);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden"
      >
        {/* Header */}
        <div className="px-8 py-6 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-green-50">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Users className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-900">
                  Convert Solo Session to Couple Session
                </h2>
                <p className="text-gray-600">
                  Review and redact your solo session summary before sharing
                </p>
              </div>
            </div>
            <button
              onClick={onCancel}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <Trash2 className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-8 space-y-6 max-h-[60vh] overflow-y-auto">
          {/* Privacy Notice */}
          <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
            <div className="flex items-start space-x-3">
              <Lock className="w-5 h-5 text-amber-600 mt-0.5" />
              <div>
                <h3 className="font-medium text-amber-800 mb-1">Privacy Notice</h3>
                <p className="text-sm text-amber-700">
                  Your solo session content is private to you. This summary will be shared with your partner 
                  in the couple session. Please review and redact any sensitive information.
                </p>
              </div>
            </div>
          </div>

          {/* Safety Warnings */}
          <AnimatePresence>
            {safetyWarnings.length > 0 && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="p-4 bg-red-50 border border-red-200 rounded-lg"
              >
                <div className="flex items-start space-x-3">
                  <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5" />
                  <div>
                    <h3 className="font-medium text-red-800 mb-2">Safety Concerns Detected</h3>
                    <ul className="space-y-1">
                      {safetyWarnings.map((warning, index) => (
                        <li key={index} className="text-sm text-red-700">• {warning}</li>
                      ))}
                    </ul>
                    <p className="text-sm text-red-700 mt-2">
                      Consider seeking professional help before proceeding with couple therapy.
                    </p>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Original vs Redacted Toggle */}
          <div className="flex items-center space-x-4">
            <button
              onClick={() => setShowOriginal(!showOriginal)}
              className="flex items-center space-x-2 px-4 py-2 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            >
              {showOriginal ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              <span>{showOriginal ? 'Hide Original' : 'Show Original'}</span>
            </button>
            
            <button
              onClick={() => setIsEditing(!isEditing)}
              className="flex items-center space-x-2 px-4 py-2 bg-blue-100 rounded-lg hover:bg-blue-200 transition-colors"
            >
              <Edit3 className="w-4 h-4" />
              <span>{isEditing ? 'Cancel Edit' : 'Edit Summary'}</span>
            </button>
          </div>

          {/* Summary Display */}
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                {showOriginal ? 'Original Summary' : 'Redacted Summary'}
              </h3>
              
              {isEditing ? (
                <textarea
                  value={redactedSummary}
                  onChange={(e) => setRedactedSummary(e.target.value)}
                  className="w-full h-40 p-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                  placeholder="Edit your summary here..."
                />
              ) : (
                <div className="p-4 bg-gray-50 rounded-lg border">
                  <p className="text-gray-700 whitespace-pre-wrap">
                    {showOriginal ? originalSummary : redactedSummary}
                  </p>
                </div>
              )}
            </div>

            {/* Edit Actions */}
            {isEditing && (
              <div className="flex items-center space-x-3">
                <button
                  onClick={handleSave}
                  className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                >
                  <Save className="w-4 h-4" />
                  <span>Save Changes</span>
                </button>
                <button
                  onClick={handleReset}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
                >
                  Reset
                </button>
              </div>
            )}
          </div>

          {/* Conversion Preview */}
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <h3 className="font-medium text-blue-900 mb-2">What happens next?</h3>
            <ul className="space-y-2 text-sm text-blue-800">
              <li className="flex items-center space-x-2">
                <CheckCircle className="w-4 h-4" />
                <span>A new couple session will be created</span>
              </li>
              <li className="flex items-center space-x-2">
                <CheckCircle className="w-4 h-4" />
                <span>This summary will be shared as the AI's first message</span>
              </li>
              <li className="flex items-center space-x-2">
                <CheckCircle className="w-4 h-4" />
                <span>Both partners can then participate in the couple session</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Footer */}
        <div className="px-8 py-6 border-t border-gray-200 bg-gray-50">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-500">
              Session ID: {soloSessionId}
            </div>
            
            <div className="flex items-center space-x-3">
              <button
                onClick={onCancel}
                className="px-6 py-2 text-gray-600 hover:text-gray-800 transition-colors"
              >
                Cancel
              </button>
              <motion.button
                onClick={handleConvert}
                disabled={isProcessing || safetyWarnings.length > 0}
                className={`
                  flex items-center space-x-2 px-6 py-2 rounded-lg font-medium transition-all duration-200
                  ${isProcessing || safetyWarnings.length > 0
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    : 'bg-blue-600 text-white hover:bg-blue-700 hover:scale-105'
                  }
                `}
                whileHover={!isProcessing && safetyWarnings.length === 0 ? { scale: 1.05 } : {}}
                whileTap={!isProcessing && safetyWarnings.length === 0 ? { scale: 0.95 } : {}}
              >
                {isProcessing ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Converting...</span>
                  </>
                ) : (
                  <>
                    <ArrowRight className="w-4 h-4" />
                    <span>Start Couple Session</span>
                  </>
                )}
              </motion.button>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
