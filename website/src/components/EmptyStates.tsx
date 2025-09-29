'use client';

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  MessageSquare, 
  Clock, 
  AlertCircle, 
  Heart, 
  Users, 
  ArrowRight,
  RefreshCw,
  Pause
} from 'lucide-react';

interface EmptyStatesProps {
  type: 'welcome' | 'nudge' | 'limit' | 'boundary' | 'loading';
  mode?: 'couple' | 'solo';
  messageCount?: number;
  onAction?: () => void;
  onRefresh?: () => void;
}

export function EmptyStates({ 
  type, 
  mode = 'couple', 
  messageCount = 0, 
  onAction, 
  onRefresh 
}: EmptyStatesProps) {
  
  if (type === 'welcome') {
    return (
      <div className="text-center py-12">
        <div className="mx-auto w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-4">
          <MessageSquare className="w-8 h-8 text-blue-600" />
        </div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          {mode === 'couple' ? 'Start Your Conversation' : 'Begin Your Reflection'}
        </h3>
        <p className="text-gray-600 mb-6 max-w-md mx-auto">
          {mode === 'couple' 
            ? 'Take turns sharing your thoughts and feelings. The AI will help facilitate a productive dialogue.'
            : 'Share your thoughts freely. The AI will provide gentle reflection and guidance.'
          }
        </p>
        {onAction && (
          <Button onClick={onAction} className="flex items-center space-x-2">
            <MessageSquare className="w-4 h-4" />
            <span>Start {mode === 'couple' ? 'Conversation' : 'Reflection'}</span>
          </Button>
        )}
      </div>
    );
  }

  if (type === 'nudge') {
    return (
      <Alert className="border-yellow-200 bg-yellow-50">
        <Clock className="h-4 w-4 text-yellow-600" />
        <AlertDescription className="text-yellow-800">
          <div className="flex items-center justify-between">
            <div>
              <strong>Session Length Reminder:</strong> You've been chatting for a while. 
              Consider taking a break or wrapping up soon.
            </div>
            {onRefresh && (
              <Button 
                variant="outline" 
                size="sm" 
                onClick={onRefresh}
                className="ml-4"
              >
                <RefreshCw className="w-4 h-4 mr-1" />
                Continue
              </Button>
            )}
          </div>
        </AlertDescription>
      </Alert>
    );
  }

  if (type === 'limit') {
    return (
      <div className="text-center py-12">
        <div className="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
          <Pause className="w-8 h-8 text-red-600" />
        </div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          Session Limit Reached
        </h3>
        <p className="text-gray-600 mb-6 max-w-md mx-auto">
          You've reached the maximum message limit for this session. 
          Consider taking a break or starting a new session.
        </p>
        <div className="space-y-3">
          {onAction && (
            <Button onClick={onAction} className="w-full">
              Start New Session
            </Button>
          )}
          <div className="text-sm text-gray-500">
            <p>Session Statistics:</p>
            <p>{messageCount} messages exchanged</p>
          </div>
        </div>
      </div>
    );
  }

  if (type === 'boundary') {
    return (
      <div className="text-center py-12">
        <div className="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
          <AlertCircle className="w-8 h-8 text-red-600" />
        </div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          Session Paused for Safety
        </h3>
        <p className="text-gray-600 mb-6 max-w-md mx-auto">
          We've detected content that may indicate you're in distress. 
          Your safety is important to us.
        </p>
        
        <div className="space-y-4">
          <Alert className="border-red-200 bg-red-50">
            <AlertCircle className="h-4 w-4 text-red-600" />
            <AlertDescription className="text-red-800">
              <strong>Emergency Resources:</strong>
              <ul className="mt-2 space-y-1 text-sm">
                <li>• Crisis Helpline: +800-123-4567</li>
                <li>• Emergency Services: 112 (EU)</li>
                <li>• National Suicide Prevention: +800-273-8255</li>
              </ul>
            </AlertDescription>
          </Alert>

          <div className="space-y-2">
            <p className="text-sm text-gray-600">
              If you're in immediate danger, please contact emergency services.
            </p>
            {onRefresh && (
              <Button 
                variant="outline" 
                onClick={onRefresh}
                className="w-full"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Resume Session (if safe)
              </Button>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (type === 'loading') {
    return (
      <div className="text-center py-12">
        <div className="mx-auto w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          Processing Your Message
        </h3>
        <p className="text-gray-600 mb-6">
          The AI is analyzing your message and preparing a response...
        </p>
        <div className="flex items-center justify-center space-x-2 text-sm text-gray-500">
          <Shield className="w-4 h-4" />
          <span>Safety checks in progress</span>
        </div>
      </div>
    );
  }

  return null;
}

// Nudge component for message count warnings
export function MessageNudge({ messageCount, onAction }: { messageCount: number; onAction?: () => void }) {
  if (messageCount >= 50) {
    return (
      <Alert className="border-red-200 bg-red-50">
        <AlertCircle className="h-4 w-4 text-red-600" />
        <AlertDescription className="text-red-800">
          <div className="flex items-center justify-between">
            <div>
              <strong>Session Limit Reached:</strong> You've reached the maximum message limit. 
              Please start a new session.
            </div>
            {onAction && (
              <Button 
                variant="outline" 
                size="sm" 
                onClick={onAction}
                className="ml-4"
              >
                New Session
              </Button>
            )}
          </div>
        </AlertDescription>
      </Alert>
    );
  }

  if (messageCount >= 30) {
    return (
      <Alert className="border-yellow-200 bg-yellow-50">
        <Clock className="h-4 w-4 text-yellow-600" />
        <AlertDescription className="text-yellow-800">
          <div className="flex items-center justify-between">
            <div>
              <strong>Session Length:</strong> You've been chatting for a while. 
              Consider taking a break or wrapping up soon.
            </div>
            {onAction && (
              <Button 
                variant="outline" 
                size="sm" 
                onClick={onAction}
                className="ml-4"
              >
                Continue
              </Button>
            )}
          </div>
        </AlertDescription>
      </Alert>
    );
  }

  return null;
}

// Turn indicator for couple mode
export function TurnIndicator({ 
  turnState, 
  mode 
}: { 
  turnState: 'awaitingA' | 'awaitingB' | 'ai_reflect' | 'boundary';
  mode: 'couple' | 'solo';
}) {
  if (mode === 'solo') {
    return (
      <div className="flex items-center space-x-2 text-gray-600 bg-gray-50 p-3 rounded-lg">
        <MessageSquare className="w-4 h-4" />
        <span className="text-sm">
          {turnState === 'ai_reflect' 
            ? 'AI is processing your message...' 
            : 'Share your thoughts freely'
          }
        </span>
      </div>
    );
  }

  const getTurnMessage = () => {
    switch (turnState) {
      case 'awaitingA':
        return 'Waiting for User A to respond...';
      case 'awaitingB':
        return 'Waiting for User B to respond...';
      case 'ai_reflect':
        return 'AI is processing your conversation...';
      case 'boundary':
        return 'Session paused for safety review';
      default:
        return '';
    }
  };

  return (
    <div className="flex items-center space-x-2 text-gray-600 bg-gray-50 p-3 rounded-lg">
      <Users className="w-4 h-4" />
      <span className="text-sm">{getTurnMessage()}</span>
    </div>
  );
}