'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Shield, 
  AlertTriangle, 
  Lock, 
  Eye, 
  EyeOff, 
  User, 
  Users, 
  AlertCircle,
  CheckCircle,
  X,
  Phone,
  Heart
} from 'lucide-react';

interface SafetyPrivacyGuardProps {
  mode: 'couple' | 'solo';
  messageContent: string;
  onSafetyViolation: (violation: SafetyViolation) => void;
  onBoundaryDetected: () => void;
  onSessionLock: () => void;
}

interface SafetyViolation {
  type: 'self-harm' | 'abuse' | 'threats' | 'crisis';
  severity: 'low' | 'medium' | 'high';
  message: string;
  action: 'warn' | 'block' | 'lock';
}

interface PrivacySettings {
  soloContentPrivate: boolean;
  coupleContentShared: boolean;
  encryptionEnabled: boolean;
  deleteOnEnd: boolean;
}

export default function SafetyPrivacyGuard({
  mode,
  messageContent,
  onSafetyViolation,
  onBoundaryDetected,
  onSessionLock
}: SafetyPrivacyGuardProps) {
  const [safetyViolations, setSafetyViolations] = useState<SafetyViolation[]>([]);
  const [privacySettings, setPrivacySettings] = useState<PrivacySettings>({
    soloContentPrivate: true,
    coupleContentShared: true,
    encryptionEnabled: true,
    deleteOnEnd: true
  });
  const [showPrivacyPanel, setShowPrivacyPanel] = useState(false);
  const [boundaryDetected, setBoundaryDetected] = useState(false);

  // Tier-1 deterministic safety checks
  const performSafetyCheck = useCallback((content: string): SafetyViolation | null => {
    const lowerContent = content.toLowerCase();
    
    // Self-harm indicators
    if (lowerContent.includes('kill myself') || 
        lowerContent.includes('end it all') || 
        lowerContent.includes('not worth living')) {
      return {
        type: 'self-harm',
        severity: 'high',
        message: 'Content suggests self-harm. Please seek professional help immediately.',
        action: 'lock'
      };
    }
    
    // Abuse indicators
    if (lowerContent.includes('hit me') || 
        lowerContent.includes('beat me') || 
        lowerContent.includes('abuse me')) {
      return {
        type: 'abuse',
        severity: 'high',
        message: 'Content suggests abuse. Please contact authorities or seek help.',
        action: 'lock'
      };
    }
    
    // Threat indicators
    if (lowerContent.includes('hurt you') || 
        lowerContent.includes('kill you') || 
        lowerContent.includes('threaten')) {
      return {
        type: 'threats',
        severity: 'high',
        message: 'Content contains threats. This is not appropriate for therapy.',
        action: 'block'
      };
    }
    
    // Crisis indicators
    if (lowerContent.includes('emergency') || 
        lowerContent.includes('crisis') || 
        lowerContent.includes('urgent help')) {
      return {
        type: 'crisis',
        severity: 'medium',
        message: 'Content suggests a crisis situation. Consider professional help.',
        action: 'warn'
      };
    }
    
    return null;
  }, []);

  // Check message content for safety violations
  useEffect(() => {
    if (messageContent.trim()) {
      const violation = performSafetyCheck(messageContent);
      if (violation) {
        setSafetyViolations(prev => [...prev, violation]);
        onSafetyViolation(violation);
        
        if (violation.action === 'lock') {
          setBoundaryDetected(true);
          onBoundaryDetected();
          onSessionLock();
        }
      }
    }
  }, [messageContent, performSafetyCheck, onSafetyViolation, onBoundaryDetected, onSessionLock]);

  // Boundary template for safety violations
  const getBoundaryTemplate = () => ({
    mirror: {
      partnerA: "I understand you're going through a difficult time.",
      partnerB: "I can see this is really challenging for you both."
    },
    clarify: "This conversation has touched on some serious concerns that need professional support.",
    explore: "Would you be open to connecting with a qualified therapist or counselor?",
    micro_actions: [
      "You might consider reaching out to a mental health professional who can provide appropriate support.",
      "You could try contacting a crisis helpline if you need immediate assistance."
    ],
    check: "Did I respond appropriately to both of your needs?",
    meta: {
      total_sentences: 8,
      version: mode === 'couple' ? 'couple_v2.0' : 'solo_v1.0'
    }
  });

  const getCrisisResources = () => [
    { name: 'National Suicide Prevention Lifeline', phone: '988', available: '24/7' },
    { name: 'Crisis Text Line', phone: 'Text HOME to 741741', available: '24/7' },
    { name: 'National Domestic Violence Hotline', phone: '1-800-799-7233', available: '24/7' },
    { name: 'SAMHSA National Helpline', phone: '1-800-662-4357', available: '24/7' }
  ];

  const handleDismissViolation = (index: number) => {
    setSafetyViolations(prev => prev.filter((_, i) => i !== index));
  };

  const handlePrivacyChange = (key: keyof PrivacySettings, value: boolean) => {
    setPrivacySettings(prev => ({ ...prev, [key]: value }));
  };

  return (
    <div className="space-y-4">
      {/* Safety Violations */}
      <AnimatePresence>
        {safetyViolations.map((violation, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className={`
              p-4 rounded-lg border-l-4
              ${violation.severity === 'high' 
                ? 'bg-red-50 border-red-500 text-red-800' 
                : violation.severity === 'medium'
                ? 'bg-amber-50 border-amber-500 text-amber-800'
                : 'bg-blue-50 border-blue-500 text-blue-800'
              }
            `}
          >
            <div className="flex items-start justify-between">
              <div className="flex items-start space-x-3">
                <AlertTriangle className={`w-5 h-5 mt-0.5 ${
                  violation.severity === 'high' ? 'text-red-600' : 'text-amber-600'
                }`} />
                <div>
                  <h4 className="font-medium mb-1">
                    {violation.type === 'self-harm' && 'Self-Harm Concern'}
                    {violation.type === 'abuse' && 'Abuse Concern'}
                    {violation.type === 'threats' && 'Threat Detected'}
                    {violation.type === 'crisis' && 'Crisis Situation'}
                  </h4>
                  <p className="text-sm">{violation.message}</p>
                </div>
              </div>
              <button
                onClick={() => handleDismissViolation(index)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>

      {/* Boundary Detected */}
      {boundaryDetected && (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="p-6 bg-red-50 border border-red-200 rounded-lg"
        >
          <div className="text-center">
            <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Shield className="w-6 h-6 text-red-600" />
            </div>
            <h3 className="text-lg font-bold text-red-800 mb-2">
              Safety Boundary Detected
            </h3>
            <p className="text-red-700 mb-4">
              This conversation has touched on serious concerns that require professional support. 
              The session has been locked for your safety.
            </p>
            
            {/* Crisis Resources */}
            <div className="space-y-3">
              <h4 className="font-medium text-red-800">Crisis Resources</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {getCrisisResources().map((resource, index) => (
                  <div key={index} className="p-3 bg-white rounded-lg border border-red-200">
                    <div className="flex items-center space-x-2">
                      <Phone className="w-4 h-4 text-red-600" />
                      <span className="font-medium text-sm">{resource.name}</span>
                    </div>
                    <p className="text-sm text-red-700 mt-1">{resource.phone}</p>
                    <p className="text-xs text-red-600">{resource.available}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* Privacy Settings Panel */}
      <div className="bg-gray-50 rounded-lg p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            <Lock className="w-5 h-5 text-gray-600" />
            <h3 className="font-medium text-gray-900">Privacy & Safety</h3>
          </div>
          <button
            onClick={() => setShowPrivacyPanel(!showPrivacyPanel)}
            className="text-sm text-blue-600 hover:text-blue-800"
          >
            {showPrivacyPanel ? 'Hide Details' : 'Show Details'}
          </button>
        </div>

        {/* Privacy Status */}
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className="flex items-center space-x-2">
            {mode === 'solo' ? (
              <User className="w-4 h-4 text-green-600" />
            ) : (
              <Users className="w-4 h-4 text-blue-600" />
            )}
            <span className="text-sm text-gray-600">
              {mode === 'solo' ? 'Private to you' : 'Shared with partner'}
            </span>
          </div>
          <div className="flex items-center space-x-2">
            <Shield className="w-4 h-4 text-green-600" />
            <span className="text-sm text-gray-600">End-to-end encrypted</span>
          </div>
        </div>

        {/* Detailed Privacy Settings */}
        <AnimatePresence>
          {showPrivacyPanel && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="space-y-3"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Eye className="w-4 h-4 text-gray-600" />
                    <span className="text-sm text-gray-700">Solo content private</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <CheckCircle className="w-4 h-4 text-green-600" />
                    <span className="text-sm text-green-600">Enabled</span>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Users className="w-4 h-4 text-gray-600" />
                    <span className="text-sm text-gray-700">Couple content shared</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <CheckCircle className="w-4 h-4 text-green-600" />
                    <span className="text-sm text-green-600">Enabled</span>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Lock className="w-4 h-4 text-gray-600" />
                    <span className="text-sm text-gray-700">Encryption at rest</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <CheckCircle className="w-4 h-4 text-green-600" />
                    <span className="text-sm text-green-600">Enabled</span>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <AlertCircle className="w-4 h-4 text-gray-600" />
                    <span className="text-sm text-gray-700">Delete on session end</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <CheckCircle className="w-4 h-4 text-green-600" />
                    <span className="text-sm text-green-600">Enabled</span>
                  </div>
                </div>
              </div>

              {/* Safety Features */}
              <div className="pt-3 border-t border-gray-200">
                <h4 className="font-medium text-gray-900 mb-2">Safety Features</h4>
                <div className="space-y-2 text-sm text-gray-600">
                  <div className="flex items-center space-x-2">
                    <CheckCircle className="w-4 h-4 text-green-600" />
                    <span>Tier-1 safety boundary detection</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <CheckCircle className="w-4 h-4 text-green-600" />
                    <span>Automatic session locking on violations</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <CheckCircle className="w-4 h-4 text-green-600" />
                    <span>Crisis resource recommendations</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <CheckCircle className="w-4 h-4 text-green-600" />
                    <span>Professional help referrals</span>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Mode-specific Privacy Notice */}
      <div className={`p-4 rounded-lg border ${
        mode === 'solo' 
          ? 'bg-green-50 border-green-200' 
          : 'bg-blue-50 border-blue-200'
      }`}>
        <div className="flex items-start space-x-3">
          {mode === 'solo' ? (
            <User className="w-5 h-5 text-green-600 mt-0.5" />
          ) : (
            <Users className="w-5 h-5 text-blue-600 mt-0.5" />
          )}
          <div>
            <h4 className={`font-medium ${
              mode === 'solo' ? 'text-green-800' : 'text-blue-800'
            }`}>
              {mode === 'solo' ? 'Solo Session Privacy' : 'Couple Session Privacy'}
            </h4>
            <p className={`text-sm ${
              mode === 'solo' ? 'text-green-700' : 'text-blue-700'
            }`}>
              {mode === 'solo' 
                ? 'This session is private to you. Content is encrypted and can be deleted at any time. You can optionally convert to a couple session later.'
                : 'This session is shared with your partner. Both of you can see all messages. Content is encrypted and can be deleted at any time.'
              }
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
