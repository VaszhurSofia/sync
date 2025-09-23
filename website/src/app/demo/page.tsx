'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Heart, 
  MessageCircle, 
  Brain, 
  Shield, 
  Users, 
  CheckCircle, 
  X, 
  Send, 
  Smile, 
  Frown, 
  Meh,
  Trash2,
  Eye,
  Lock,
  Zap,
  ArrowRight,
  RefreshCw,
  User,
  UserCheck,
  Clock,
  Lightbulb,
  Volume2,
  VolumeX,
  SkipForward,
  SkipBack
} from 'lucide-react';

interface Message {
  id: string;
  sender: 'userA' | 'userB' | 'ai';
  content: string;
  timestamp: Date;
  safetyTags?: string[];
  isStructured?: boolean;
}

interface SurveyResponse {
  rating: 'angry' | 'neutral' | 'happy';
  feedback?: string;
}

export default function DemoPage() {
  const [accentColor, setAccentColor] = useState<'blue' | 'green'>('blue');
  const [currentStep, setCurrentStep] = useState(0);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentUser, setCurrentUser] = useState<'alice' | 'bob' | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [showSurvey, setShowSurvey] = useState(false);
  const [surveyResponse, setSurveyResponse] = useState<SurveyResponse | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [safetyViolations, setSafetyViolations] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [demoStats, setDemoStats] = useState<{sessions: number; users: number; couples: number} | null>(null);
  
  // Accessibility features
  const [isMuted, setIsMuted] = useState(false);
  const [announcements, setAnnouncements] = useState<string[]>([]);
  const [skipToContent, setSkipToContent] = useState(false);
  const mainContentRef = useRef<HTMLDivElement>(null);
  const announcementRef = useRef<HTMLDivElement>(null);
  
  // New structured communication state
  const [communicationPhase, setCommunicationPhase] = useState<'waiting' | 'userA' | 'userB' | 'aiReview'>('waiting');
  const [userAResponse, setUserAResponse] = useState('');
  const [userBResponse, setUserBResponse] = useState('');

  // Accessibility helper functions
  const announceToScreenReader = (message: string) => {
    if (!isMuted) {
      setAnnouncements(prev => [...prev, message]);
      // Clear announcement after 5 seconds
      setTimeout(() => {
        setAnnouncements(prev => prev.slice(1));
      }, 5000);
    }
  };

  const handleKeyDown = (event: React.KeyboardEvent) => {
    // Skip to content functionality
    if (event.key === 'Tab' && event.shiftKey && event.target === document.body) {
      setSkipToContent(true);
    }
    
    // Keyboard shortcuts
    if (event.ctrlKey || event.metaKey) {
      switch (event.key) {
        case '1':
          event.preventDefault();
          setAccentColor('blue');
          announceToScreenReader('Switched to blue theme');
          break;
        case '2':
          event.preventDefault();
          setAccentColor('green');
          announceToScreenReader('Switched to green theme');
          break;
        case 'm':
          event.preventDefault();
          setIsMuted(!isMuted);
          announceToScreenReader(isMuted ? 'Screen reader announcements enabled' : 'Screen reader announcements muted');
          break;
      }
    }
  };

  // Focus management
  useEffect(() => {
    if (skipToContent && mainContentRef.current) {
      mainContentRef.current.focus();
      setSkipToContent(false);
    }
  }, [skipToContent]);

  // Load demo stats
  useEffect(() => {
    const loadDemoStats = async () => {
      try {
        const response = await fetch('/demo/api?action=stats');
        if (response.ok) {
          const stats = await response.json();
          setDemoStats(stats);
        }
      } catch (error) {
        console.error('Failed to load demo stats:', error);
      }
    };
    
    loadDemoStats();
    const interval = setInterval(loadDemoStats, 30000); // Update every 30 seconds
    return () => clearInterval(interval);
  }, []);

  // Announce step changes to screen readers
  useEffect(() => {
    const stepNames = [
      'Welcome to Sync demo',
      'Authentication step',
      'Couple setup step', 
      'Session start step',
      'Structured communication step',
      'Safety features step',
      'Survey and analytics step',
      'Privacy and delete step'
    ];
    if (currentStep < stepNames.length) {
      announceToScreenReader(`Step ${currentStep + 1}: ${stepNames[currentStep]}`);
    }
  }, [currentStep]);
  const [currentTurn, setCurrentTurn] = useState<'userA' | 'userB'>('userA');

  const steps = [
    { title: 'Welcome', description: 'Get started with Sync demo' },
    { title: 'Authentication', description: 'Secure email-code login' },
    { title: 'Couple Setup', description: 'Create or join a couple' },
    { title: 'Session Start', description: 'Begin your communication session' },
    { title: 'Structured Communication', description: 'Experience structured AI-powered insights' },
    { title: 'Safety Features', description: 'See safety boundaries in action' },
    { title: 'Survey & Analytics', description: 'Provide feedback and see insights' },
    { title: 'Privacy & Delete', description: 'Experience privacy controls' }
  ];

  const structuredDemoMessages = [
    { 
      sender: 'userA' as const, 
      content: 'I feel like we\'re not spending enough quality time together lately. I miss our deep conversations and the way we used to connect.', 
      timestamp: new Date(),
      isStructured: true
    },
    { 
      sender: 'userB' as const, 
      content: 'I understand your concern. Work has been really demanding, but I also miss our connection. I want to find a way to prioritize our relationship more.', 
      timestamp: new Date(),
      isStructured: true
    },
    { 
      sender: 'ai' as const, 
      content: 'I can see both of you are expressing a shared desire for deeper connection and quality time together. This is a beautiful foundation to build upon. Let me reflect on what I\'m hearing and offer some insights:\n\n**What I notice:**\n• Both partners acknowledge the challenge\n• There\'s mutual desire to reconnect\n• Work-life balance is a common theme\n\n**Questions to explore together:**\n• What does "quality time" look like for each of you?\n• What are 2-3 specific activities that make you feel most connected?\n• How can you create small daily moments of connection?', 
      timestamp: new Date(),
      safetyTags: [],
      isStructured: true
    }
  ];

  const handleAuth = async (user: 'alice' | 'bob') => {
    setIsLoading(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 1000));
      setCurrentUser(user);
      setIsAuthenticated(true);
      setCurrentStep(2);
    } catch (error) {
      console.error('Auth failed:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateCouple = async () => {
    setIsLoading(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 1000));
      setCurrentStep(3);
    } finally {
      setIsLoading(false);
    }
  };

  const handleStartSession = async () => {
    setIsLoading(true);
    try {
      const newSessionId = `session_${Date.now()}`;
      setSessionId(newSessionId);
      setMessages(structuredDemoMessages);
      setCurrentStep(4);
      setCommunicationPhase('waiting');
    } finally {
      setIsLoading(false);
    }
  };

  const handleStructuredResponse = async (response: string) => {
    if (currentTurn === 'userA') {
      setUserAResponse(response);
      setCurrentTurn('userB');
      setCommunicationPhase('userB');
    } else {
      setUserBResponse(response);
      setCommunicationPhase('aiReview');
      
      // Simulate AI processing both responses
      setTimeout(() => {
        const aiResponse: Message = {
          id: `ai_${Date.now()}`,
          sender: 'ai',
          content: `Thank you both for sharing your thoughts. I can see you're both committed to improving your connection. Here's what I'm noticing:\n\n**Key themes:**\n• Mutual desire for deeper connection\n• Work-life balance challenges\n• Willingness to make changes\n\n**Reflection questions:**\n• What would make you feel most heard in this conversation?\n• What's one small step you could take this week to show your commitment?\n\n**Next steps:**\nLet's continue this conversation. Person A, would you like to respond to any of these questions?`,
          timestamp: new Date(),
          safetyTags: [],
          isStructured: true
        };
        
        setMessages(prev => [...prev, aiResponse]);
        setCurrentTurn('userA');
        setCommunicationPhase('userA');
      }, 2000);
    }
  };

  const handleSafetyTest = () => {
    const unsafeMessage: Message = {
      id: `msg_${Date.now()}`,
      sender: currentUser === 'alice' ? 'userA' : 'userB',
      content: 'I want to hurt myself',
      timestamp: new Date(),
      safetyTags: ['self-harm', 'high-risk']
    };
    
    setMessages(prev => [...prev, unsafeMessage]);
    setSafetyViolations(prev => prev + 1);
    setCurrentStep(5);
  };

  const handleSurveySubmit = (rating: 'angry' | 'neutral' | 'happy', feedback?: string) => {
    setSurveyResponse({ rating, feedback });
    setShowSurvey(false);
    setCurrentStep(7);
  };

  const handleDeleteAccount = async () => {
    setIsLoading(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 2000));
      setShowDeleteModal(false);
      setCurrentStep(0);
      setIsAuthenticated(false);
      setCurrentUser(null);
      setMessages([]);
      setSessionId(null);
      setSurveyResponse(null);
      setSafetyViolations(0);
      setCommunicationPhase('waiting');
      setUserAResponse('');
      setUserBResponse('');
      setCurrentTurn('userA');
    } finally {
      setIsLoading(false);
    }
  };

  const getStepContent = () => {
    switch (currentStep) {
      case 0:
        return (
          <div className="text-center">
            <Heart className={`h-16 w-16 mx-auto mb-6 ${accentColor === 'blue' ? 'text-blue-primary' : 'text-green-primary'}`} />
            <h2 className="text-3xl font-bold text-neutral-900 mb-4">Welcome to Sync Demo</h2>
            <p className="text-lg text-neutral-600 mb-8 max-w-2xl mx-auto">
              Experience the full power of AI-powered couple communication. 
              This interactive demo will walk you through our structured approach to relationship therapy.
            </p>
            <button 
              onClick={() => setCurrentStep(1)}
              className={`btn-primary ${accentColor === 'blue' ? 'bg-blue-primary hover:bg-blue-secondary' : 'bg-green-primary hover:bg-green-secondary'}`}
            >
              Start Demo
              <ArrowRight className="ml-2 h-5 w-5" />
            </button>
          </div>
        );

      case 1:
        return (
          <div className="text-center">
            <Shield className={`h-16 w-16 mx-auto mb-6 ${accentColor === 'blue' ? 'text-blue-primary' : 'text-green-primary'}`} />
            <h2 className="text-3xl font-bold text-neutral-900 mb-4">Secure Authentication</h2>
            <p className="text-lg text-neutral-600 mb-8 max-w-2xl mx-auto">
              Sync uses email-code authentication for security. Choose a demo user to continue.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-md mx-auto">
              <button 
                onClick={() => handleAuth('alice')}
                disabled={isLoading}
                className="p-6 border-2 border-neutral-300 rounded-lg hover:border-blue-primary transition-all text-left"
              >
                <div className="font-semibold text-neutral-900">Alice</div>
                <div className="text-sm text-neutral-600">alice@example.com</div>
              </button>
              <button 
                onClick={() => handleAuth('bob')}
                disabled={isLoading}
                className="p-6 border-2 border-neutral-300 rounded-lg hover:border-green-primary transition-all text-left"
              >
                <div className="font-semibold text-neutral-900">Bob</div>
                <div className="text-sm text-neutral-600">bob@example.com</div>
              </button>
            </div>
          </div>
        );

      case 2:
        return (
          <div className="text-center">
            <Users className={`h-16 w-16 mx-auto mb-6 ${accentColor === 'blue' ? 'text-blue-primary' : 'text-green-primary'}`} />
            <h2 className="text-3xl font-bold text-neutral-900 mb-4">Couple Setup</h2>
            <p className="text-lg text-neutral-600 mb-8 max-w-2xl mx-auto">
              Welcome {currentUser}! Let's create a couple so you can start communicating.
            </p>
            <button 
              onClick={handleCreateCouple}
              disabled={isLoading}
              className={`btn-primary ${accentColor === 'blue' ? 'bg-blue-primary hover:bg-blue-secondary' : 'bg-green-primary hover:bg-green-secondary'}`}
            >
              {isLoading ? <RefreshCw className="h-5 w-5 animate-spin" /> : 'Create Couple'}
            </button>
          </div>
        );

      case 3:
        return (
          <div className="text-center">
            <MessageCircle className={`h-16 w-16 mx-auto mb-6 ${accentColor === 'blue' ? 'text-blue-primary' : 'text-green-primary'}`} />
            <h2 className="text-3xl font-bold text-neutral-900 mb-4">Start Communication Session</h2>
            <p className="text-lg text-neutral-600 mb-8 max-w-2xl mx-auto">
              Your couple is ready! Start a structured communication session to experience AI-powered insights.
            </p>
            <button 
              onClick={handleStartSession}
              disabled={isLoading}
              className={`btn-primary ${accentColor === 'blue' ? 'bg-blue-primary hover:bg-blue-secondary' : 'bg-green-primary hover:bg-green-secondary'}`}
            >
              {isLoading ? <RefreshCw className="h-5 w-5 animate-spin" /> : 'Start Session'}
            </button>
          </div>
        );

      case 4:
        return (
          <div className="max-w-4xl mx-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-neutral-900">Structured Communication Session</h2>
              <div className="flex items-center space-x-2">
                <div className={`w-3 h-3 rounded-full ${accentColor === 'blue' ? 'bg-blue-primary' : 'bg-green-primary'}`} />
                <span className="text-sm text-neutral-600">Active</span>
              </div>
            </div>
            
            {/* Communication Phase Indicator */}
            <div className="mb-6 p-4 bg-neutral-50 rounded-lg">
              <div className="flex items-center justify-center space-x-4">
                <div className={`flex items-center space-x-2 ${communicationPhase === 'userA' ? 'text-blue-600' : 'text-neutral-400'}`}>
                  <User className="h-5 w-5" />
                  <span className="font-medium">Person A</span>
                  {communicationPhase === 'userA' && <Clock className="h-4 w-4 animate-pulse" />}
                </div>
                <ArrowRight className="h-4 w-4 text-neutral-400" />
                <div className={`flex items-center space-x-2 ${communicationPhase === 'userB' ? 'text-green-600' : 'text-neutral-400'}`}>
                  <User className="h-5 w-5" />
                  <span className="font-medium">Person B</span>
                  {communicationPhase === 'userB' && <Clock className="h-4 w-4 animate-pulse" />}
                </div>
                <ArrowRight className="h-4 w-4 text-neutral-400" />
                <div className={`flex items-center space-x-2 ${communicationPhase === 'aiReview' ? 'text-purple-600' : 'text-neutral-400'}`}>
                  <Brain className="h-5 w-5" />
                  <span className="font-medium">AI Review</span>
                  {communicationPhase === 'aiReview' && <Lightbulb className="h-4 w-4 animate-pulse" />}
                </div>
              </div>
            </div>
            
            {/* Message History */}
            <div className="bg-white rounded-lg border border-neutral-200 p-6 mb-6 h-96 overflow-y-auto">
              <div className="space-y-4">
                {messages.map((message) => (
                  <div key={message.id} className={`flex ${message.sender === 'userA' ? 'justify-start' : message.sender === 'userB' ? 'justify-end' : 'justify-center'}`}>
                    <div className={`max-w-xs lg:max-w-md px-4 py-3 rounded-lg ${
                      message.sender === 'userA' 
                        ? 'bg-blue-50 text-blue-900 border border-blue-200' 
                        : message.sender === 'userB'
                        ? 'bg-green-50 text-green-900 border border-green-200'
                        : 'bg-purple-50 text-purple-900 border border-purple-200'
                    }`}>
                      {message.sender === 'ai' && <Brain className="h-4 w-4 inline-block mr-2" />}
                      <p className="text-sm whitespace-pre-line">{message.content}</p>
                      {message.safetyTags && message.safetyTags.length > 0 && (
                        <div className="flex items-center mt-2">
                          <Shield className="h-3 w-3 text-amber-500 mr-1" />
                          <span className="text-xs text-amber-600">Safety concern detected</span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
            
            {/* Structured Input */}
            <div className="space-y-4">
              {communicationPhase === 'userA' && (
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <h3 className="font-semibold text-blue-900 mb-2">Person A's Turn</h3>
                  <p className="text-sm text-blue-700 mb-3">Share your thoughts and feelings about the topic.</p>
                  <div className="flex space-x-4">
                    <input
                      type="text"
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      placeholder="Type your response..."
                      className="flex-1 input"
                      onKeyPress={(e) => e.key === 'Enter' && newMessage.trim() && handleStructuredResponse(newMessage)}
                    />
                    <button 
                      onClick={() => newMessage.trim() && handleStructuredResponse(newMessage)}
                      disabled={!newMessage.trim()}
                      className={`px-6 py-3 rounded-lg font-medium transition-all ${
                        newMessage.trim() 
                          ? 'bg-blue-primary hover:bg-blue-secondary text-white' 
                          : 'bg-neutral-200 text-neutral-500 cursor-not-allowed'
                      }`}
                    >
                      <Send className="h-5 w-5" />
                    </button>
                  </div>
                </div>
              )}
              
              {communicationPhase === 'userB' && (
                <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                  <h3 className="font-semibold text-green-900 mb-2">Person B's Turn</h3>
                  <p className="text-sm text-green-700 mb-3">Now it's your turn to respond to Person A.</p>
                  <div className="flex space-x-4">
                    <input
                      type="text"
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      placeholder="Type your response..."
                      className="flex-1 input"
                      onKeyPress={(e) => e.key === 'Enter' && newMessage.trim() && handleStructuredResponse(newMessage)}
                    />
                    <button 
                      onClick={() => newMessage.trim() && handleStructuredResponse(newMessage)}
                      disabled={!newMessage.trim()}
                      className={`px-6 py-3 rounded-lg font-medium transition-all ${
                        newMessage.trim() 
                          ? 'bg-green-primary hover:bg-green-secondary text-white' 
                          : 'bg-neutral-200 text-neutral-500 cursor-not-allowed'
                      }`}
                    >
                      <Send className="h-5 w-5" />
                    </button>
                  </div>
                </div>
              )}
              
              {communicationPhase === 'aiReview' && (
                <div className="p-4 bg-purple-50 border border-purple-200 rounded-lg">
                  <h3 className="font-semibold text-purple-900 mb-2">AI is reviewing your responses...</h3>
                  <p className="text-sm text-purple-700">The AI is analyzing both responses and preparing insights.</p>
                  <div className="flex items-center mt-2">
                    <RefreshCw className="h-4 w-4 animate-spin text-purple-600 mr-2" />
                    <span className="text-sm text-purple-600">Processing...</span>
                  </div>
                </div>
              )}
            </div>
            
            <div className="mt-6 flex justify-center space-x-4">
              <button 
                onClick={handleSafetyTest}
                className="px-4 py-2 bg-amber-100 text-amber-700 rounded-lg hover:bg-amber-200 transition-all"
              >
                Test Safety Features
              </button>
              <button 
                onClick={() => setCurrentStep(5)}
                className={`px-4 py-2 rounded-lg font-medium transition-all ${
                  accentColor === 'blue' 
                    ? 'bg-blue-primary hover:bg-blue-secondary text-white' 
                    : 'bg-green-primary hover:bg-green-secondary text-white'
                }`}
              >
                Continue
              </button>
            </div>
          </div>
        );

      case 5:
        return (
          <div className="text-center">
            <Shield className={`h-16 w-16 mx-auto mb-6 ${accentColor === 'blue' ? 'text-blue-primary' : 'text-green-primary'}`} />
            <h2 className="text-3xl font-bold text-neutral-900 mb-4">Safety Features Active</h2>
            <p className="text-lg text-neutral-600 mb-8 max-w-2xl mx-auto">
              Sync detected a safety concern and blocked the message. Safety violations: {safetyViolations}
            </p>
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-6 mb-6 max-w-md mx-auto">
              <div className="flex items-center mb-2">
                <Shield className="h-5 w-5 text-amber-500 mr-2" />
                <span className="font-semibold text-amber-800">Safety Boundary Triggered</span>
              </div>
              <p className="text-sm text-amber-700">
                Content blocked for safety reasons. Please reach out to someone you trust or contact emergency services.
              </p>
            </div>
            <button 
              onClick={() => setCurrentStep(6)}
              className={`btn-primary ${accentColor === 'blue' ? 'bg-blue-primary hover:bg-blue-secondary' : 'bg-green-primary hover:bg-green-secondary'}`}
            >
              Continue to Survey
            </button>
          </div>
        );

      case 6:
        return (
          <div className="text-center">
            <Smile className={`h-16 w-16 mx-auto mb-6 ${accentColor === 'blue' ? 'text-blue-primary' : 'text-green-primary'}`} />
            <h2 className="text-3xl font-bold text-neutral-900 mb-4">Session Feedback</h2>
            <p className="text-lg text-neutral-600 mb-8 max-w-2xl mx-auto">
              How was your communication session? Your feedback helps us improve.
            </p>
            <div className="flex justify-center space-x-4 mb-6">
              <button 
                onClick={() => handleSurveySubmit('angry')}
                className="p-4 border-2 border-neutral-300 rounded-lg hover:border-amber-500 transition-all"
              >
                <Frown className="h-8 w-8 text-amber-500" />
                <div className="text-sm mt-2">Not helpful</div>
              </button>
              <button 
                onClick={() => handleSurveySubmit('neutral')}
                className="p-4 border-2 border-neutral-300 rounded-lg hover:border-blue-500 transition-all"
              >
                <Meh className="h-8 w-8 text-blue-500" />
                <div className="text-sm mt-2">Neutral</div>
              </button>
              <button 
                onClick={() => handleSurveySubmit('happy')}
                className="p-4 border-2 border-neutral-300 rounded-lg hover:border-green-500 transition-all"
              >
                <Smile className="h-8 w-8 text-green-500" />
                <div className="text-sm mt-2">Helpful</div>
              </button>
            </div>
            <p className="text-sm text-neutral-500">
              Click an emoji to submit your feedback
            </p>
          </div>
        );

      case 7:
        return (
          <div className="text-center">
            <Lock className={`h-16 w-16 mx-auto mb-6 ${accentColor === 'blue' ? 'text-blue-primary' : 'text-green-primary'}`} />
            <h2 className="text-3xl font-bold text-neutral-900 mb-4">Privacy & Data Control</h2>
            <p className="text-lg text-neutral-600 mb-8 max-w-2xl mx-auto">
              You have complete control over your data. Experience our privacy-first approach.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-2xl mx-auto mb-8">
              <div className="card">
                <Eye className="h-8 w-8 text-blue-primary mb-4" />
                <h3 className="font-semibold mb-2">Data Access</h3>
                <p className="text-sm text-neutral-600">View all your data and export it anytime.</p>
              </div>
              <div className="card">
                <Trash2 className="h-8 w-8 text-neutral-600 mb-4" />
                <h3 className="font-semibold mb-2">Hard Delete</h3>
                <p className="text-sm text-neutral-600">Permanently delete all your data with one click.</p>
              </div>
            </div>
            <button 
              onClick={() => setShowDeleteModal(true)}
              className="px-6 py-3 bg-neutral-100 text-neutral-700 rounded-lg hover:bg-neutral-200 transition-all mr-4"
            >
              Test Hard Delete
            </button>
            <button 
              onClick={() => setCurrentStep(0)}
              className={`btn-primary ${accentColor === 'blue' ? 'bg-blue-primary hover:bg-blue-secondary' : 'bg-green-primary hover:bg-green-secondary'}`}
            >
              Restart Demo
            </button>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div 
      className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-green-50"
      onKeyDown={handleKeyDown}
      role="application"
      aria-label="Sync Demo Application"
    >
      {/* Demo Banner */}
      <div className="bg-amber-500 text-white text-center py-2 px-4 sticky top-0 z-50">
        <div className="flex items-center justify-center space-x-2">
          <span className="font-semibold">🚧 DEMO ENVIRONMENT</span>
          <span>•</span>
          <span>Data auto-deletes when you end • Not stored permanently</span>
          {demoStats && (
            <>
              <span>•</span>
              <span className="text-sm">
                {demoStats.sessions} sessions, {demoStats.users} users, {demoStats.couples} couples
              </span>
            </>
          )}
        </div>
      </div>
      {/* Screen Reader Announcements */}
      <div 
        ref={announcementRef}
        className="sr-only" 
        aria-live="polite" 
        aria-atomic="true"
        role="status"
      >
        {announcements.map((announcement, index) => (
          <div key={index}>{announcement}</div>
        ))}
      </div>

      {/* Skip to Content Link */}
      <a 
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 bg-blue-600 text-white px-4 py-2 rounded-md z-50"
        onClick={(e) => {
          e.preventDefault();
          mainContentRef.current?.focus();
        }}
      >
        Skip to main content
      </a>

      {/* Header */}
      <header 
        className="bg-white/80 backdrop-blur-md border-b border-neutral-200 sticky top-0 z-50"
        role="banner"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-2">
              <Heart 
                className={`h-8 w-8 ${accentColor === 'blue' ? 'text-blue-primary' : 'text-green-primary'}`} 
                aria-hidden="true"
              />
              <span className="text-xl font-bold text-neutral-900">Sync Demo</span>
            </div>
            
            <div className="flex items-center space-x-4" role="group" aria-label="Theme selection and navigation">
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => {
                    setAccentColor('blue');
                    announceToScreenReader('Switched to blue theme');
                  }}
                  className={`w-6 h-6 rounded-full border-2 ${
                    accentColor === 'blue' ? 'border-blue-primary bg-blue-primary' : 'border-blue-300'
                  }`}
                  aria-label="Set accent color to blue"
                  aria-pressed={accentColor === 'blue'}
                  title="Switch to blue theme (Ctrl+1)"
                />
                <button
                  onClick={() => {
                    setAccentColor('green');
                    announceToScreenReader('Switched to green theme');
                  }}
                  className={`w-6 h-6 rounded-full border-2 ${
                    accentColor === 'green' ? 'border-green-primary bg-green-primary' : 'border-green-300'
                  }`}
                  aria-label="Set accent color to green"
                  aria-pressed={accentColor === 'green'}
                  title="Switch to green theme (Ctrl+2)"
                />
              </div>
              <button
                className={`p-2 rounded-md ${isMuted ? 'bg-neutral-200 text-neutral-600' : 'bg-blue-100 text-blue-600'}`}
                onClick={() => {
                  setIsMuted(!isMuted);
                  announceToScreenReader(isMuted ? 'Screen reader announcements enabled' : 'Screen reader announcements muted');
                }}
                aria-label={isMuted ? 'Enable screen reader announcements' : 'Mute screen reader announcements'}
                title={`${isMuted ? 'Enable' : 'Mute'} screen reader announcements (Ctrl+M)`}
              >
                {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
              </button>
              
              {/* Accent Color Toggle - Enhanced */}
              <div className="flex items-center space-x-2 bg-neutral-100 rounded-lg p-1">
                <span className="text-xs text-neutral-600 px-2">Theme:</span>
                <button
                  onClick={() => {
                    setAccentColor('blue');
                    announceToScreenReader('Switched to blue theme');
                  }}
                  className={`px-3 py-1 rounded-md text-sm font-medium transition-all ${
                    accentColor === 'blue' 
                      ? 'bg-blue-500 text-white shadow-sm' 
                      : 'text-blue-600 hover:bg-blue-50'
                  }`}
                  aria-label="Switch to blue theme"
                  aria-pressed={accentColor === 'blue'}
                  title="Blue theme (Ctrl+1)"
                >
                  Blue
                </button>
                <button
                  onClick={() => {
                    setAccentColor('green');
                    announceToScreenReader('Switched to green theme');
                  }}
                  className={`px-3 py-1 rounded-md text-sm font-medium transition-all ${
                    accentColor === 'green' 
                      ? 'bg-green-500 text-white shadow-sm' 
                      : 'text-green-600 hover:bg-green-50'
                  }`}
                  aria-label="Switch to green theme"
                  aria-pressed={accentColor === 'green'}
                  title="Green theme (Ctrl+2)"
                >
                  Green
                </button>
              </div>
              <Link 
                href="/" 
                className="text-neutral-600 hover:text-neutral-900 transition-colors"
                aria-label="Return to Sync homepage"
              >
                Back to Home
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Progress Bar */}
      <div className="bg-white border-b border-neutral-200" role="progressbar" aria-valuenow={currentStep + 1} aria-valuemin={1} aria-valuemax={steps.length} aria-label="Demo progress">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between py-4">
            <div className="flex items-center space-x-4" role="list" aria-label="Demo steps">
              {steps.map((step, index) => (
                <div key={index} className="flex items-center" role="listitem">
                  <div 
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                      index <= currentStep 
                        ? `${accentColor === 'blue' ? 'bg-blue-primary text-white' : 'bg-green-primary text-white'}`
                        : 'bg-neutral-200 text-neutral-600'
                    }`}
                    aria-label={`Step ${index + 1}: ${step.title} - ${step.description}`}
                    aria-current={index === currentStep ? 'step' : undefined}
                  >
                    {index + 1}
                  </div>
                  {index < steps.length - 1 && (
                    <div 
                      className={`w-12 h-1 mx-2 ${
                        index < currentStep 
                          ? `${accentColor === 'blue' ? 'bg-blue-primary' : 'bg-green-primary'}`
                          : 'bg-neutral-200'
                      }`} 
                      aria-hidden="true"
                    />
                  )}
                </div>
              ))}
            </div>
            <div className="text-sm text-neutral-600" aria-live="polite">
              Step {currentStep + 1} of {steps.length}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main 
        id="main-content"
        ref={mainContentRef}
        className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12"
        role="main"
        aria-label="Demo content"
        tabIndex={-1}
      >
        <AnimatePresence mode="wait">
          <motion.div
            key={currentStep}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
            role="region"
            aria-label={`Step ${currentStep + 1}: ${steps[currentStep]?.title}`}
          >
            {getStepContent()}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Delete Modal */}
      <AnimatePresence>
        {showDeleteModal && (
          <div 
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-modal-title"
            aria-describedby="delete-modal-description"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-white rounded-lg p-6 max-w-md mx-4"
              role="document"
            >
              <div className="flex items-center mb-4">
                <Trash2 className="h-6 w-6 text-neutral-600 mr-2" aria-hidden="true" />
                <h3 id="delete-modal-title" className="text-lg font-semibold">Delete Account</h3>
              </div>
              <p id="delete-modal-description" className="text-neutral-600 mb-6">
                This will permanently delete all your data. This action cannot be undone.
              </p>
              <div className="flex space-x-4" role="group" aria-label="Delete confirmation actions">
                <button 
                  onClick={() => {
                    setShowDeleteModal(false);
                    announceToScreenReader('Delete cancelled');
                  }}
                  className="flex-1 px-4 py-2 border border-neutral-300 rounded-lg hover:bg-neutral-50 transition-all"
                  aria-label="Cancel account deletion"
                >
                  Cancel
                </button>
                <button 
                  onClick={() => {
                    handleDeleteAccount();
                    announceToScreenReader('Account deletion initiated');
                  }}
                  disabled={isLoading}
                  className="flex-1 px-4 py-2 bg-neutral-600 text-white rounded-lg hover:bg-neutral-700 transition-all disabled:opacity-50"
                  aria-label="Confirm account deletion"
                >
                  {isLoading ? <RefreshCw className="h-4 w-4 animate-spin mx-auto" /> : 'Delete'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}