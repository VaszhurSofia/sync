'use client';

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Send, 
  MessageCircle, 
  User, 
  Users, 
  Lightbulb,
  Clock,
  AlertCircle,
  CheckCircle
} from 'lucide-react';

interface MessageComposerProps {
  mode: 'couple' | 'solo';
  onSendMessage: (content: string) => void;
  isDisabled?: boolean;
  currentTurn?: 'userA' | 'userB' | 'ai';
  messageCount?: number;
  isLoading?: boolean;
}

export default function MessageComposer({
  mode,
  onSendMessage,
  isDisabled = false,
  currentTurn,
  messageCount = 0,
  isLoading = false
}: MessageComposerProps) {
  const [message, setMessage] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const [showHints, setShowHints] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Message count nudges
  const shouldShowNudge = messageCount >= 30;
  const shouldShowHardStop = messageCount >= 50;

  // Mode-specific hints
  const coupleHints = [
    "Share 1-3 sentences about what you're feeling",
    "Focus on your own experience, not your partner's",
    "Use 'I' statements to express your perspective",
    "Avoid blame or criticism - focus on your feelings"
  ];

  const soloHints = [
    "Write freely about what's on your mind",
    "Describe your feelings and thoughts openly",
    "You'll get reflection and a tiny next step",
    "This is your private space for processing"
  ];

  const hints = mode === 'couple' ? coupleHints : soloHints;

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [message]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (message.trim() && !isDisabled && !shouldShowHardStop) {
      onSendMessage(message.trim());
      setMessage('');
      setShowHints(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const getComposerHint = () => {
    if (mode === 'couple') {
      if (currentTurn === 'userA') {
        return "It's your turn. Share 1–3 sentences.";
      } else if (currentTurn === 'userB') {
        return "It's your turn. Share 1–3 sentences.";
      } else if (currentTurn === 'ai') {
        return "AI is processing your conversation...";
      }
      return "Waiting for your partner to respond...";
    } else {
      return "Write freely; you'll get reflection + a tiny next step.";
    }
  };

  const getComposerPlaceholder = () => {
    if (mode === 'couple') {
      return "Share what you're feeling right now...";
    } else {
      return "What's on your mind? Write freely...";
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto">
      {/* Message Count Nudges */}
      <AnimatePresence>
        {shouldShowNudge && !shouldShowHardStop && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="mb-4 p-4 bg-amber-50 border border-amber-200 rounded-lg"
          >
            <div className="flex items-center text-amber-800">
              <Clock className="w-5 h-5 mr-2" />
              <span className="font-medium">
                You've sent {messageCount} messages. Consider taking a break or summarizing your thoughts.
              </span>
            </div>
          </motion.div>
        )}

        {shouldShowHardStop && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg"
          >
            <div className="flex items-center text-red-800">
              <AlertCircle className="w-5 h-5 mr-2" />
              <span className="font-medium">
                Session limit reached ({messageCount} messages). Please end this session and start a new one.
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Composer */}
      <div className="bg-white rounded-2xl border-2 border-gray-200 shadow-lg overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-100 bg-gray-50">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              {mode === 'couple' ? (
                <Users className="w-5 h-5 text-blue-600" />
              ) : (
                <User className="w-5 h-5 text-green-600" />
              )}
              <div>
                <h3 className="font-medium text-gray-900">
                  {mode === 'couple' ? 'Couple Session' : 'Solo Session'}
                </h3>
                <p className="text-sm text-gray-500">
                  {getComposerHint()}
                </p>
              </div>
            </div>
            
            {/* Hints Toggle */}
            <button
              onClick={() => setShowHints(!showHints)}
              className="flex items-center space-x-2 text-sm text-gray-500 hover:text-gray-700 transition-colors"
            >
              <Lightbulb className="w-4 h-4" />
              <span>Hints</span>
            </button>
          </div>
        </div>

        {/* Hints Panel */}
        <AnimatePresence>
          {showHints && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="px-6 py-4 bg-blue-50 border-b border-blue-100"
            >
              <div className="space-y-2">
                <h4 className="font-medium text-blue-900 mb-2">
                  {mode === 'couple' ? 'Couple Session Tips' : 'Solo Session Tips'}
                </h4>
                {hints.map((hint, index) => (
                  <div key={index} className="flex items-start space-x-2 text-sm text-blue-800">
                    <CheckCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                    <span>{hint}</span>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Message Input */}
        <form onSubmit={handleSubmit} className="p-6">
          <div className="relative">
            <textarea
              ref={textareaRef}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={handleKeyDown}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
              placeholder={getComposerPlaceholder()}
              disabled={isDisabled || shouldShowHardStop || isLoading}
              className={`
                w-full resize-none border-0 focus:ring-0 focus:outline-none
                placeholder-gray-400 text-gray-900
                ${isDisabled || shouldShowHardStop ? 'bg-gray-100 cursor-not-allowed' : 'bg-transparent'}
                transition-colors duration-200
              `}
              rows={3}
              maxLength={1000}
            />
            
            {/* Character Count */}
            <div className="absolute bottom-2 right-2 text-xs text-gray-400">
              {message.length}/1000
            </div>
          </div>

          {/* Action Bar */}
          <div className="flex items-center justify-between mt-4">
            <div className="flex items-center space-x-4 text-sm text-gray-500">
              <div className="flex items-center space-x-1">
                <MessageCircle className="w-4 h-4" />
                <span>{messageCount} messages</span>
              </div>
              
              {mode === 'couple' && currentTurn && (
                <div className={`flex items-center space-x-1 ${
                  currentTurn === 'ai' ? 'text-blue-600' : 'text-green-600'
                }`}>
                  {currentTurn === 'ai' ? (
                    <>
                      <Clock className="w-4 h-4" />
                      <span>AI Processing</span>
                    </>
                  ) : (
                    <>
                      <Users className="w-4 h-4" />
                      <span>Your Turn</span>
                    </>
                  )}
                </div>
              )}
            </div>

            <motion.button
              type="submit"
              disabled={!message.trim() || isDisabled || shouldShowHardStop || isLoading}
              className={`
                flex items-center space-x-2 px-6 py-2 rounded-lg font-medium transition-all duration-200
                ${!message.trim() || isDisabled || shouldShowHardStop || isLoading
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : 'bg-blue-600 text-white hover:bg-blue-700 hover:scale-105'
                }
              `}
              whileHover={!isDisabled && !shouldShowHardStop && message.trim() ? { scale: 1.05 } : {}}
              whileTap={!isDisabled && !shouldShowHardStop && message.trim() ? { scale: 0.95 } : {}}
            >
              {isLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Processing...</span>
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  <span>Send</span>
                </>
              )}
            </motion.button>
          </div>
        </form>
      </div>

      {/* Mode-specific Footer */}
      <div className="mt-4 text-center text-sm text-gray-500">
        {mode === 'couple' ? (
          <p>
            <strong>Couple Mode:</strong> Both partners take turns sharing. 
            AI provides neutral facilitation and mutual understanding.
          </p>
        ) : (
          <p>
            <strong>Solo Mode:</strong> Private reflection space. 
            You can optionally convert to a couple session later.
          </p>
        )}
      </div>
    </div>
  );
}
