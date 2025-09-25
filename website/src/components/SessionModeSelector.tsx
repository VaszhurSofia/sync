'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  Users, 
  User, 
  Heart, 
  Brain, 
  ArrowRight,
  Lock,
  Eye,
  MessageCircle
} from 'lucide-react';

interface SessionModeSelectorProps {
  onModeSelect: (mode: 'couple' | 'solo') => void;
  isAuthenticated: boolean;
  hasCouple: boolean;
}

export default function SessionModeSelector({ 
  onModeSelect, 
  isAuthenticated, 
  hasCouple 
}: SessionModeSelectorProps) {
  const [selectedMode, setSelectedMode] = useState<'couple' | 'solo' | null>(null);
  const [showDetails, setShowDetails] = useState<'couple' | 'solo' | null>(null);

  const modes = [
    {
      id: 'couple' as const,
      title: 'Talk Together',
      subtitle: 'Couple Session',
      description: 'Neutral facilitator guiding turn-taking between partners',
      icon: Users,
      color: 'blue',
      features: [
        'Neutral third-party facilitation',
        'Turn-taking guidance',
        'Mutual understanding focus',
        'Both partners participate'
      ],
      requirements: 'Both partners must be part of a couple',
      available: hasCouple,
      disabled: !hasCouple
    },
    {
      id: 'solo' as const,
      title: 'Reflect Alone',
      subtitle: 'Solo Session',
      description: 'Self-coaching mode for personal processing and preparation',
      icon: User,
      color: 'green',
      features: [
        'Personal reflection and processing',
        'Self-coaching techniques',
        'Private to you only',
        'Optional conversion to couple session'
      ],
      requirements: 'Available to any authenticated user',
      available: isAuthenticated,
      disabled: false
    }
  ];

  const handleModeSelect = (mode: 'couple' | 'solo') => {
    if (modes.find(m => m.id === mode)?.disabled) return;
    
    setSelectedMode(mode);
    setTimeout(() => {
      onModeSelect(mode);
    }, 300);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="mb-6"
          >
            <h1 className="text-4xl font-bold text-gray-900 mb-4">
              Choose Your Session Mode
            </h1>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Select how you'd like to engage with our AI facilitator
            </p>
          </motion.div>
        </div>

        {/* Mode Cards */}
        <div className="grid md:grid-cols-2 gap-8 mb-12">
          {modes.map((mode, index) => {
            const Icon = mode.icon;
            const isSelected = selectedMode === mode.id;
            const isDisabled = mode.disabled;
            
            return (
              <motion.div
                key={mode.id}
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: index * 0.2 }}
                className={`relative group cursor-pointer ${
                  isDisabled ? 'cursor-not-allowed opacity-50' : 'hover:scale-105'
                } transition-all duration-300`}
                onClick={() => !isDisabled && handleModeSelect(mode.id)}
                onMouseEnter={() => !isDisabled && setShowDetails(mode.id)}
                onMouseLeave={() => setShowDetails(null)}
              >
                <div className={`
                  relative p-8 rounded-2xl border-2 transition-all duration-300
                  ${isSelected 
                    ? 'border-blue-500 bg-blue-50 shadow-lg' 
                    : isDisabled
                    ? 'border-gray-200 bg-gray-50'
                    : 'border-gray-200 bg-white hover:border-blue-300 hover:shadow-lg'
                  }
                `}>
                  {/* Icon and Title */}
                  <div className="text-center mb-6">
                    <div className={`
                      inline-flex items-center justify-center w-16 h-16 rounded-full mb-4
                      ${mode.color === 'blue' ? 'bg-blue-100' : 'bg-green-100'}
                      ${isSelected ? 'scale-110' : ''}
                      transition-transform duration-300
                    `}>
                      <Icon className={`w-8 h-8 ${
                        mode.color === 'blue' ? 'text-blue-600' : 'text-green-600'
                      }`} />
                    </div>
                    <h3 className="text-2xl font-bold text-gray-900 mb-2">
                      {mode.title}
                    </h3>
                    <p className="text-sm font-medium text-gray-500 uppercase tracking-wide">
                      {mode.subtitle}
                    </p>
                  </div>

                  {/* Description */}
                  <p className="text-gray-600 text-center mb-6">
                    {mode.description}
                  </p>

                  {/* Features */}
                  <div className="space-y-2 mb-6">
                    {mode.features.map((feature, featureIndex) => (
                      <div key={featureIndex} className="flex items-center text-sm text-gray-600">
                        <div className={`w-2 h-2 rounded-full mr-3 ${
                          mode.color === 'blue' ? 'bg-blue-400' : 'bg-green-400'
                        }`} />
                        {feature}
                      </div>
                    ))}
                  </div>

                  {/* Requirements */}
                  <div className="text-xs text-gray-500 mb-4 p-3 bg-gray-50 rounded-lg">
                    <strong>Requirements:</strong> {mode.requirements}
                  </div>

                  {/* Action Button */}
                  <motion.button
                    className={`
                      w-full py-3 px-6 rounded-lg font-medium transition-all duration-300
                      ${isSelected
                        ? 'bg-blue-600 text-white'
                        : isDisabled
                        ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                        : 'bg-gray-100 text-gray-700 hover:bg-blue-600 hover:text-white'
                      }
                    `}
                    whileHover={!isDisabled ? { scale: 1.02 } : {}}
                    whileTap={!isDisabled ? { scale: 0.98 } : {}}
                    disabled={isDisabled}
                  >
                    {isDisabled ? 'Not Available' : isSelected ? 'Selected' : 'Choose This Mode'}
                  </motion.button>

                  {/* Selection Indicator */}
                  {isSelected && (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="absolute top-4 right-4 w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center"
                    >
                      <ArrowRight className="w-4 h-4 text-white" />
                    </motion.div>
                  )}
                </div>

                {/* Detailed Info on Hover */}
                {showDetails === mode.id && !isDisabled && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="absolute top-full left-0 right-0 mt-2 p-4 bg-white border border-gray-200 rounded-lg shadow-lg z-10"
                  >
                    <div className="space-y-2">
                      <div className="flex items-center text-sm text-gray-600">
                        <Lock className="w-4 h-4 mr-2" />
                        <span>End-to-end encrypted</span>
                      </div>
                      <div className="flex items-center text-sm text-gray-600">
                        <Eye className="w-4 h-4 mr-2" />
                        <span>
                          {mode.id === 'couple' 
                            ? 'Visible to both partners' 
                            : 'Private to you only'
                          }
                        </span>
                      </div>
                      <div className="flex items-center text-sm text-gray-600">
                        <MessageCircle className="w-4 h-4 mr-2" />
                        <span>
                          {mode.id === 'couple' 
                            ? 'Turn-taking guidance' 
                            : 'Self-reflection focus'
                          }
                        </span>
                      </div>
                    </div>
                  </motion.div>
                )}
              </motion.div>
            );
          })}
        </div>

        {/* Privacy Notice */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
          className="text-center text-sm text-gray-500 max-w-2xl mx-auto"
        >
          <p>
            <strong>Privacy:</strong> Solo sessions are private to you. Couple sessions are visible to both partners. 
            All content is encrypted and can be deleted at any time.
          </p>
        </motion.div>
      </div>
    </div>
  );
}
