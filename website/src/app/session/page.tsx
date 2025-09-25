'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSearchParams } from 'next/navigation';
import SessionModeSelector from '../../components/SessionModeSelector';
import MessageComposer from '../../components/MessageComposer';
import EmptyStates from '../../components/EmptyStates';
import SoloToCoupleConverter from '../../components/SoloToCoupleConverter';
import SafetyPrivacyGuard from '../../components/SafetyPrivacyGuard';
import { 
  MessageCircle, 
  Users, 
  User, 
  Settings, 
  Shield,
  ArrowLeft,
  MoreVertical
} from 'lucide-react';

interface Message {
  id: string;
  sender: 'userA' | 'userB' | 'ai';
  content: string;
  timestamp: Date;
  safetyTags?: string[];
  isStructured?: boolean;
}

interface Session {
  id: string;
  mode: 'couple' | 'solo';
  coupleId?: string;
  ownerUserId?: string;
  shareToken?: string;
  startedAt: Date;
  endedAt?: Date;
  boundaryFlag: boolean;
}

export default function SessionPage() {
  const searchParams = useSearchParams();
  const [currentStep, setCurrentStep] = useState<'mode-select' | 'session' | 'convert'>('mode-select');
  const [selectedMode, setSelectedMode] = useState<'couple' | 'solo' | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(true);
  const [hasCouple, setHasCouple] = useState(true);
  const [showConverter, setShowConverter] = useState(false);
  const [safetyViolations, setSafetyViolations] = useState<any[]>([]);
  const [boundaryDetected, setBoundaryDetected] = useState(false);
  const [sessionLocked, setSessionLocked] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Handle mode selection
  const handleModeSelect = async (mode: 'couple' | 'solo') => {
    setSelectedMode(mode);
    setIsLoading(true);
    
    try {
      // Create session
      const response = await fetch('/api/sessions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ mode })
      });
      
      if (response.ok) {
        const data = await response.json();
        const newSession: Session = {
          id: data.sessionId,
          mode,
          coupleId: data.coupleId,
          ownerUserId: data.ownerUserId,
          shareToken: data.shareToken,
          startedAt: new Date(),
          boundaryFlag: false
        };
        
        setSession(newSession);
        setCurrentStep('session');
      } else {
        console.error('Failed to create session');
      }
    } catch (error) {
      console.error('Error creating session:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle message sending
  const handleSendMessage = async (content: string) => {
    if (!session || sessionLocked) return;
    
    setIsLoading(true);
    
    try {
      const response = await fetch(`/api/sessions/${session.id}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          content,
          sender: session.mode === 'solo' ? 'userA' : 'userA' // Simplified for demo
        })
      });
      
      if (response.ok) {
        const data = await response.json();
        
        // Add user message
        const userMessage: Message = {
          id: data.messageId,
          sender: 'userA',
          content,
          timestamp: new Date()
        };
        
        setMessages(prev => [...prev, userMessage]);
        
        // Add AI response if available
        if (data.aiResponse) {
          const aiMessage: Message = {
            id: data.aiMessageId,
            sender: 'ai',
            content: data.aiResponse,
            timestamp: new Date(),
            isStructured: true
          };
          
          setMessages(prev => [...prev, aiMessage]);
        }
      }
    } catch (error) {
      console.error('Error sending message:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle solo to couple conversion
  const handleConvertToCouple = () => {
    setShowConverter(true);
  };

  const handleConversionComplete = async (redactedSummary: string) => {
    setShowConverter(false);
    // Implementation for conversion would go here
    console.log('Converting to couple session with summary:', redactedSummary);
  };

  // Handle safety violations
  const handleSafetyViolation = (violation: any) => {
    setSafetyViolations(prev => [...prev, violation]);
  };

  const handleBoundaryDetected = () => {
    setBoundaryDetected(true);
  };

  const handleSessionLock = () => {
    setSessionLocked(true);
  };

  // Render mode selector
  if (currentStep === 'mode-select') {
    return (
      <SessionModeSelector
        onModeSelect={handleModeSelect}
        isAuthenticated={isAuthenticated}
        hasCouple={hasCouple}
      />
    );
  }

  // Render session
  if (currentStep === 'session' && session) {
    return (
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => setCurrentStep('mode-select')}
                className="flex items-center space-x-2 text-gray-600 hover:text-gray-800"
              >
                <ArrowLeft className="w-5 h-5" />
                <span>Back</span>
              </button>
              
              <div className="flex items-center space-x-3">
                {session.mode === 'couple' ? (
                  <Users className="w-6 h-6 text-blue-600" />
                ) : (
                  <User className="w-6 h-6 text-green-600" />
                )}
                <div>
                  <h1 className="text-xl font-bold text-gray-900">
                    {session.mode === 'couple' ? 'Couple Session' : 'Solo Session'}
                  </h1>
                  <p className="text-sm text-gray-500">
                    {session.mode === 'couple' 
                      ? 'Neutral facilitation for both partners' 
                      : 'Private reflection space'
                    }
                  </p>
                </div>
              </div>
            </div>
            
            <div className="flex items-center space-x-2">
              <button className="p-2 text-gray-600 hover:text-gray-800">
                <Settings className="w-5 h-5" />
              </button>
              <button className="p-2 text-gray-600 hover:text-gray-800">
                <MoreVertical className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>

        {/* Safety & Privacy Guard */}
        <div className="px-6 py-4">
          <SafetyPrivacyGuard
            mode={session.mode}
            messageContent={messages[messages.length - 1]?.content || ''}
            onSafetyViolation={handleSafetyViolation}
            onBoundaryDetected={handleBoundaryDetected}
            onSessionLock={handleSessionLock}
          />
        </div>

        {/* Messages */}
        <div className="flex-1 px-6 py-4 max-h-[60vh] overflow-y-auto">
          {messages.length === 0 ? (
            <EmptyStates
              mode={session.mode}
              messageCount={messages.length}
              isWaitingForPartner={session.mode === 'couple' && messages.length === 0}
              onStartConversation={() => {}}
              onConvertToCouple={session.mode === 'solo' ? handleConvertToCouple : undefined}
            />
          ) : (
            <div className="space-y-4">
              {messages.map((message) => (
                <motion.div
                  key={message.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`flex ${
                    message.sender === 'ai' ? 'justify-center' : 'justify-end'
                  }`}
                >
                  <div className={`max-w-[80%] p-4 rounded-lg ${
                    message.sender === 'ai'
                      ? 'bg-blue-50 border border-blue-200'
                      : 'bg-blue-600 text-white'
                  }`}>
                    <p className="text-sm">{message.content}</p>
                    <p className={`text-xs mt-2 ${
                      message.sender === 'ai' ? 'text-blue-600' : 'text-blue-100'
                    }`}>
                      {message.timestamp.toLocaleTimeString()}
                    </p>
                  </div>
                </motion.div>
              ))}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Message Composer */}
        <div className="px-6 py-4 bg-white border-t border-gray-200">
          <MessageComposer
            mode={session.mode}
            onSendMessage={handleSendMessage}
            isDisabled={sessionLocked || boundaryDetected}
            currentTurn={session.mode === 'couple' ? 'userA' : 'userA'}
            messageCount={messages.length}
            isLoading={isLoading}
          />
        </div>

        {/* Solo to Couple Converter Modal */}
        {showConverter && (
          <SoloToCoupleConverter
            soloSessionId={session.id}
            originalSummary={messages.map(m => m.content).join(' ')}
            onConvert={handleConversionComplete}
            onCancel={() => setShowConverter(false)}
          />
        )}
      </div>
    );
  }

  return null;
}
