'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import { SessionModeSelector } from '@/components/SessionModeSelector';
import { MessageComposer } from '@/components/MessageComposer';
import { SoloToCoupleConverter } from '@/components/SoloToCoupleConverter';
import { EmptyStates, MessageNudge, TurnIndicator } from '@/components/EmptyStates';
import { SafetyPrivacyGuard, SafetyLevelIndicator } from '@/components/SafetyPrivacyGuard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  MessageSquare, 
  Users, 
  User, 
  ArrowRight, 
  Shield, 
  Lock,
  RefreshCw,
  Settings
} from 'lucide-react';

interface Message {
  id: string;
  sender: 'userA' | 'userB' | 'ai';
  content: string;
  created_at: string;
  safety_tags: string[];
  safety_level?: 'low' | 'medium' | 'high' | 'critical';
}

interface Session {
  id: string;
  mode: 'couple' | 'solo';
  turn_state: 'awaitingA' | 'awaitingB' | 'ai_reflect' | 'boundary';
  safety_level: 'low' | 'medium' | 'high' | 'critical';
  boundary_flag: boolean;
}

interface PrivacySettings {
  dataRetention: number;
  encryptionLevel: 'standard' | 'enhanced' | 'military';
  auditLogging: boolean;
  gdprCompliance: boolean;
  dataAnonymization: boolean;
}

export default function SessionPage() {
  const searchParams = useSearchParams();
  const [currentStep, setCurrentStep] = useState<'mode-select' | 'session' | 'convert'>('mode-select');
  const [session, setSession] = useState<Session | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [messageCount, setMessageCount] = useState(0);
  const [privacySettings, setPrivacySettings] = useState<PrivacySettings>({
    dataRetention: 30,
    encryptionLevel: 'enhanced',
    auditLogging: true,
    gdprCompliance: true,
    dataAnonymization: true
  });

  // Mock API functions (in production, these would be real API calls)
  const createSession = async (mode: 'couple' | 'solo', coupleId?: string) => {
    setIsLoading(true);
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const newSession: Session = {
        id: `session_${Date.now()}`,
        mode,
        turn_state: mode === 'couple' ? 'awaitingA' : 'ai_reflect',
        safety_level: 'low',
        boundary_flag: false
      };
      
      setSession(newSession);
      setCurrentStep('session');
      setMessages([]);
      setMessageCount(0);
    } finally {
      setIsLoading(false);
    }
  };

  const sendMessage = async (content: string) => {
    if (!session) return;
    
    setIsLoading(true);
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const newMessage: Message = {
        id: `msg_${Date.now()}`,
        sender: session.mode === 'couple' ? 'userA' : 'userA',
        content,
        created_at: new Date().toISOString(),
        safety_tags: [],
        safety_level: 'low'
      };
      
      setMessages(prev => [...prev, newMessage]);
      setMessageCount(prev => prev + 1);
      
      // Simulate AI response
      if (session.mode === 'solo' || session.turn_state === 'awaitingB') {
        setTimeout(() => {
          const aiMessage: Message = {
            id: `msg_${Date.now() + 1}`,
            sender: 'ai',
            content: session.mode === 'couple' 
              ? 'I hear both of your perspectives. Let me help you explore this together...'
              : 'I understand your feelings. Let me help you reflect on this...',
            created_at: new Date().toISOString(),
            safety_tags: [],
            safety_level: 'low'
          };
          
          setMessages(prev => [...prev, aiMessage]);
          setMessageCount(prev => prev + 1);
        }, 2000);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const convertSoloToCouple = async (redactedSummary: string, consent: boolean) => {
    if (!session || !consent) return;
    
    setIsLoading(true);
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const newSession: Session = {
        id: `session_${Date.now()}`,
        mode: 'couple',
        turn_state: 'awaitingA',
        safety_level: 'low',
        boundary_flag: false
      };
      
      setSession(newSession);
      setMessages([{
        id: `msg_${Date.now()}`,
        sender: 'ai',
        content: `Here is a summary of your solo reflection: "${redactedSummary}"`,
        created_at: new Date().toISOString(),
        safety_tags: [],
        safety_level: 'low'
      }]);
      setMessageCount(1);
      setCurrentStep('session');
    } finally {
      setIsLoading(false);
    }
  };

  const updatePrivacySettings = (settings: Partial<PrivacySettings>) => {
    setPrivacySettings(prev => ({ ...prev, ...settings }));
  };

  const handleDataExport = async () => {
    // Simulate data export
    console.log('Exporting user data...');
  };

  const handleDataDelete = async () => {
    // Simulate data deletion
    console.log('Deleting user data...');
    setSession(null);
    setMessages([]);
    setMessageCount(0);
    setCurrentStep('mode-select');
  };

  const handleRefresh = () => {
    // Simulate refresh
    console.log('Refreshing session...');
  };

  // Check for existing session in URL params
  useEffect(() => {
    const sessionId = searchParams.get('sessionId');
    if (sessionId) {
      // Load existing session
      setCurrentStep('session');
    }
  }, [searchParams]);

  if (currentStep === 'mode-select') {
    return (
      <SessionModeSelector 
        onModeSelect={createSession}
        isLoading={isLoading}
      />
    );
  }

  if (currentStep === 'convert') {
    return (
      <SoloToCoupleConverter
        soloSummary="I've been reflecting on our communication patterns and I think we need to work on listening to each other better."
        onConvert={convertSoloToCouple}
        onCancel={() => setCurrentStep('session')}
        isLoading={isLoading}
      />
    );
  }

  if (!session) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Session Not Found</h2>
          <Button onClick={() => setCurrentStep('mode-select')}>
            Start New Session
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto p-4">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                {session.mode === 'couple' ? <Users className="w-5 h-5 text-blue-600" /> : <User className="w-5 h-5 text-blue-600" />}
              </div>
              <div>
                <h1 className="text-xl font-semibold text-gray-900">
                  {session.mode === 'couple' ? 'Couple Session' : 'Solo Session'}
                </h1>
                <p className="text-sm text-gray-600">
                  Session ID: {session.id}
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <SafetyLevelIndicator level={session.safety_level} />
              <Button variant="outline" size="sm" onClick={handleRefresh}>
                <RefreshCw className="w-4 h-4 mr-1" />
                Refresh
              </Button>
            </div>
          </div>

          {/* Safety and Privacy Controls */}
          <SafetyPrivacyGuard
            safetyLevel={session.safety_level}
            privacySettings={privacySettings}
            onSettingsUpdate={updatePrivacySettings}
            onDataExport={handleDataExport}
            onDataDelete={handleDataDelete}
            onRefresh={handleRefresh}
          />
        </div>

        {/* Messages */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center">
              <MessageSquare className="w-5 h-5 mr-2" />
              Conversation
            </CardTitle>
          </CardHeader>
          <CardContent>
            {messages.length === 0 ? (
              <EmptyStates 
                type="welcome" 
                mode={session.mode}
                onAction={() => {/* Start conversation */}}
              />
            ) : (
              <div className="space-y-4">
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex ${message.sender === 'ai' ? 'justify-start' : 'justify-end'}`}
                  >
                    <div
                      className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                        message.sender === 'ai'
                          ? 'bg-blue-100 text-blue-900'
                          : 'bg-gray-100 text-gray-900'
                      }`}
                    >
                      <p className="text-sm">{message.content}</p>
                      <p className="text-xs opacity-70 mt-1">
                        {new Date(message.created_at).toLocaleTimeString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Turn Indicator */}
        <TurnIndicator turnState={session.turn_state} mode={session.mode} />

        {/* Message Nudges */}
        <MessageNudge 
          messageCount={messageCount} 
          onAction={() => setCurrentStep('mode-select')}
        />

        {/* Message Composer */}
        <MessageComposer
          mode={session.mode}
          turnState={session.turn_state}
          onSendMessage={sendMessage}
          isLoading={isLoading}
          safetyLevel={session.safety_level}
          messageCount={messageCount}
        />

        {/* Solo to Couple Conversion */}
        {session.mode === 'solo' && messageCount > 5 && (
          <div className="mt-6">
            <Alert className="border-blue-200 bg-blue-50">
              <Users className="h-4 w-4 text-blue-600" />
              <AlertDescription className="text-blue-800">
                <div className="flex items-center justify-between">
                  <div>
                    <strong>Ready to share?</strong> You can convert this solo session to a couple session 
                    to share your insights with your partner.
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentStep('convert')}
                    className="ml-4"
                  >
                    <ArrowRight className="w-4 h-4 mr-1" />
                    Convert to Couple
                  </Button>
                </div>
              </AlertDescription>
            </Alert>
          </div>
        )}

        {/* Session Controls */}
        <div className="mt-6 flex items-center justify-between">
          <div className="flex items-center space-x-4 text-sm text-gray-500">
            <div className="flex items-center space-x-1">
              <Shield className="w-4 h-4" />
              <span>Privacy Protected</span>
            </div>
            <div className="flex items-center space-x-1">
              <Lock className="w-4 h-4" />
              <span>Encrypted</span>
            </div>
            <span>{messageCount} messages</span>
          </div>

          <div className="flex items-center space-x-2">
            <Button variant="outline" size="sm" onClick={() => setCurrentStep('mode-select')}>
              New Session
            </Button>
            <Button variant="outline" size="sm" onClick={() => setCurrentStep('mode-select')}>
              End Session
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}