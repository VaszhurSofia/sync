'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  MessageCircle, 
  Users, 
  User, 
  Heart, 
  Lightbulb, 
  Clock,
  AlertTriangle,
  CheckCircle,
  ArrowRight,
  Sparkles
} from 'lucide-react';

interface EmptyStatesProps {
  mode: 'couple' | 'solo';
  messageCount: number;
  isWaitingForPartner?: boolean;
  onStartConversation?: () => void;
  onConvertToCouple?: () => void;
}

export default function EmptyStates({
  mode,
  messageCount,
  isWaitingForPartner = false,
  onStartConversation,
  onConvertToCouple
}: EmptyStatesProps) {
  const [showNudge, setShowNudge] = useState(false);
  const [showHardStop, setShowHardStop] = useState(false);

  // Message count nudges
  useEffect(() => {
    if (messageCount >= 30 && messageCount < 50) {
      setShowNudge(true);
    } else if (messageCount >= 50) {
      setShowHardStop(true);
      setShowNudge(false);
    } else {
      setShowNudge(false);
      setShowHardStop(false);
    }
  }, [messageCount]);

  const getEmptyStateContent = () => {
    if (mode === 'couple') {
      return {
        icon: Users,
        title: 'Start Your Couple Session',
        subtitle: 'Begin your conversation together',
        description: 'Take turns sharing your thoughts and feelings. The AI will help facilitate understanding between you both.',
        tips: [
          'Share 1-3 sentences at a time',
          'Use "I" statements to express your perspective',
          'Listen without interrupting your partner',
          'Focus on your own feelings, not your partner\'s actions'
        ],
        actionText: 'Start Conversation',
        color: 'blue'
      };
    } else {
      return {
        icon: User,
        title: 'Begin Your Solo Reflection',
        subtitle: 'Your private space for processing',
        description: 'Write freely about what\'s on your mind. You\'ll receive reflection and guidance for your next steps.',
        tips: [
          'Write openly about your thoughts and feelings',
          'Describe situations that are challenging you',
          'You\'ll get personalized reflection and next steps',
          'This content is private to you only'
        ],
        actionText: 'Start Reflecting',
        color: 'green'
      };
    }
  };

  const content = getEmptyStateContent();
  const Icon = content.icon;

  if (showHardStop) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-center min-h-[400px] p-8"
      >
        <div className="text-center max-w-md">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <AlertTriangle className="w-8 h-8 text-red-600" />
          </div>
          <h3 className="text-2xl font-bold text-gray-900 mb-4">
            Session Limit Reached
          </h3>
          <p className="text-gray-600 mb-6">
            You've reached the maximum of 50 messages for this session. 
            Please end this session and start a new one to continue.
          </p>
          <div className="space-y-3">
            <button
              onClick={onStartConversation}
              className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Start New Session
            </button>
            {mode === 'solo' && onConvertToCouple && (
              <button
                onClick={onConvertToCouple}
                className="w-full px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              >
                Convert to Couple Session
              </button>
            )}
          </div>
        </div>
      </motion.div>
    );
  }

  if (showNudge) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-6"
      >
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
          <div className="flex items-start space-x-3">
            <Clock className="w-5 h-5 text-amber-600 mt-0.5" />
            <div>
              <h4 className="font-medium text-amber-800 mb-1">
                Consider Taking a Break
              </h4>
              <p className="text-sm text-amber-700">
                You've sent {messageCount} messages. Consider summarizing your thoughts 
                or taking a short break before continuing.
              </p>
            </div>
          </div>
        </div>
      </motion.div>
    );
  }

  if (isWaitingForPartner && mode === 'couple') {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-center min-h-[400px] p-8"
      >
        <div className="text-center max-w-md">
          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <Users className="w-8 h-8 text-blue-600" />
          </div>
          <h3 className="text-2xl font-bold text-gray-900 mb-4">
            Waiting for Your Partner
          </h3>
          <p className="text-gray-600 mb-6">
            Your partner hasn't joined the session yet. Once they're here, 
            you can begin your conversation together.
          </p>
          <div className="flex items-center justify-center space-x-2 text-sm text-gray-500">
            <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse" />
            <span>Waiting for partner to join...</span>
          </div>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex items-center justify-center min-h-[400px] p-8"
    >
      <div className="text-center max-w-lg">
        {/* Icon */}
        <div className={`w-20 h-20 ${
          content.color === 'blue' ? 'bg-blue-100' : 'bg-green-100'
        } rounded-full flex items-center justify-center mx-auto mb-6`}>
          <Icon className={`w-10 h-10 ${
            content.color === 'blue' ? 'text-blue-600' : 'text-green-600'
          }`} />
        </div>

        {/* Title */}
        <h3 className="text-3xl font-bold text-gray-900 mb-2">
          {content.title}
        </h3>
        <p className="text-lg text-gray-600 mb-6">
          {content.subtitle}
        </p>

        {/* Description */}
        <p className="text-gray-600 mb-8">
          {content.description}
        </p>

        {/* Tips */}
        <div className="bg-gray-50 rounded-lg p-6 mb-8">
          <h4 className="font-medium text-gray-900 mb-4 flex items-center justify-center space-x-2">
            <Lightbulb className="w-5 h-5 text-yellow-500" />
            <span>Tips for Success</span>
          </h4>
          <ul className="space-y-2 text-sm text-gray-600">
            {content.tips.map((tip, index) => (
              <li key={index} className="flex items-start space-x-2">
                <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                <span>{tip}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Action Button */}
        <motion.button
          onClick={onStartConversation}
          className={`
            inline-flex items-center space-x-2 px-8 py-4 rounded-lg font-medium text-white
            ${content.color === 'blue' 
              ? 'bg-blue-600 hover:bg-blue-700' 
              : 'bg-green-600 hover:bg-green-700'
            }
            transition-all duration-200 hover:scale-105
          `}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          <Sparkles className="w-5 h-5" />
          <span>{content.actionText}</span>
          <ArrowRight className="w-5 h-5" />
        </motion.button>

        {/* Mode-specific additional info */}
        {mode === 'solo' && (
          <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg">
            <p className="text-sm text-green-800">
              <strong>Privacy:</strong> This session is private to you. You can optionally 
              convert it to a couple session later to share insights with your partner.
            </p>
          </div>
        )}

        {mode === 'couple' && (
          <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-800">
              <strong>Shared Session:</strong> Both partners can see all messages. 
              The AI provides neutral facilitation to help you understand each other better.
            </p>
          </div>
        )}
      </div>
    </motion.div>
  );
}
