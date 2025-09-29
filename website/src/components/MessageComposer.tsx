'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Send, AlertCircle, Shield, Lock, MessageSquare } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface MessageComposerProps {
  mode: 'couple' | 'solo';
  turnState: 'awaitingA' | 'awaitingB' | 'ai_reflect' | 'boundary';
  onSendMessage: (content: string) => Promise<void>;
  isLoading?: boolean;
  safetyLevel?: 'low' | 'medium' | 'high' | 'critical';
  messageCount?: number;
}

export function MessageComposer({ 
  mode, 
  turnState, 
  onSendMessage, 
  isLoading = false,
  safetyLevel = 'low',
  messageCount = 0
}: MessageComposerProps) {
  const [message, setMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [message]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() || isSending) return;

    setIsSending(true);
    try {
      await onSendMessage(message.trim());
      setMessage('');
    } catch (error) {
      console.error('Failed to send message:', error);
    } finally {
      setIsSending(false);
    }
  };

  const getModeHint = () => {
    if (mode === 'couple') {
      return "It's your turn. Share 1–3 sentences.";
    } else {
      return "Write freely; you'll get reflection + a tiny next step.";
    }
  };

  const getTurnStateMessage = () => {
    switch (turnState) {
      case 'awaitingA':
        return "Waiting for User A to respond...";
      case 'awaitingB':
        return "Waiting for User B to respond...";
      case 'ai_reflect':
        return "AI is processing your message...";
      case 'boundary':
        return "Session paused for safety review";
      default:
        return "";
    }
  };

  const canSendMessage = () => {
    if (mode === 'solo') {
      return turnState === 'ai_reflect' || turnState === 'awaitingA';
    } else {
      return (turnState === 'awaitingA' || turnState === 'awaitingB') && !isLoading;
    }
  };

  const getSafetyAlert = () => {
    if (safetyLevel === 'critical') {
      return (
        <Alert className="border-red-200 bg-red-50">
          <AlertCircle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-800">
            <strong>Safety Alert:</strong> Your message contains concerning content. 
            Please consider reaching out to someone you trust or contact emergency services.
          </AlertDescription>
        </Alert>
      );
    } else if (safetyLevel === 'high') {
      return (
        <Alert className="border-orange-200 bg-orange-50">
          <AlertCircle className="h-4 w-4 text-orange-600" />
          <AlertDescription className="text-orange-800">
            <strong>Content Flagged:</strong> Your message has been flagged for review. 
            Consider rephrasing or taking a break.
          </AlertDescription>
        </Alert>
      );
    }
    return null;
  };

  const getNudgeMessage = () => {
    if (messageCount >= 50) {
      return (
        <Alert className="border-yellow-200 bg-yellow-50">
          <AlertCircle className="h-4 w-4 text-yellow-600" />
          <AlertDescription className="text-yellow-800">
            <strong>Session Limit:</strong> You've reached the maximum message limit. 
            Consider taking a break or starting a new session.
          </AlertDescription>
        </Alert>
      );
    } else if (messageCount >= 30) {
      return (
        <Alert className="border-blue-200 bg-blue-50">
          <AlertCircle className="h-4 w-4 text-blue-600" />
          <AlertDescription className="text-blue-800">
            <strong>Session Length:</strong> You've been chatting for a while. 
            Consider taking a break or wrapping up soon.
          </AlertDescription>
        </Alert>
      );
    }
    return null;
  };

  return (
    <div className="space-y-4">
      {/* Safety and Nudge Alerts */}
      {getSafetyAlert()}
      {getNudgeMessage()}

      {/* Turn State Indicator */}
      {!canSendMessage() && (
        <div className="flex items-center space-x-2 text-gray-600 bg-gray-50 p-3 rounded-lg">
          <MessageSquare className="w-4 h-4" />
          <span className="text-sm">{getTurnStateMessage()}</span>
        </div>
      )}

      {/* Message Composer */}
      {canSendMessage() && (
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="space-y-2">
            <label htmlFor="message" className="text-sm font-medium text-gray-700">
              {mode === 'couple' ? 'Your Message' : 'Share Your Thoughts'}
            </label>
            <Textarea
              ref={textareaRef}
              id="message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder={getModeHint()}
              className="min-h-[100px] max-h-[200px] resize-none"
              disabled={isSending || isLoading}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4 text-sm text-gray-500">
              <div className="flex items-center space-x-1">
                <Shield className="w-4 h-4" />
                <span>Privacy Protected</span>
              </div>
              <div className="flex items-center space-x-1">
                <Lock className="w-4 h-4" />
                <span>Encrypted</span>
              </div>
              {messageCount > 0 && (
                <span>{messageCount} messages</span>
              )}
            </div>

            <Button
              type="submit"
              disabled={!message.trim() || isSending || isLoading}
              className="flex items-center space-x-2"
            >
              {isSending ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  <span>Sending...</span>
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  <span>Send</span>
                </>
              )}
            </Button>
          </div>
        </form>
      )}

      {/* Mode-specific Tips */}
      <div className="text-sm text-gray-600 bg-gray-50 p-3 rounded-lg">
        {mode === 'couple' ? (
          <div>
            <strong>Couple Mode Tips:</strong>
            <ul className="mt-1 space-y-1">
              <li>• Take turns speaking (1-3 sentences each)</li>
              <li>• Listen actively to your partner's perspective</li>
              <li>• Use "I" statements to express your feelings</li>
              <li>• The AI will help facilitate productive dialogue</li>
            </ul>
          </div>
        ) : (
          <div>
            <strong>Solo Mode Tips:</strong>
            <ul className="mt-1 space-y-1">
              <li>• Write freely about your thoughts and feelings</li>
              <li>• The AI will provide reflection and gentle guidance</li>
              <li>• You can convert to couple mode when ready to share</li>
              <li>• Your solo sessions remain completely private</li>
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}