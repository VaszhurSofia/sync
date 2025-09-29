'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Heart, User, ArrowRight, Shield, Lock } from 'lucide-react';

interface SessionModeSelectorProps {
  onModeSelect: (mode: 'couple' | 'solo') => void;
  isLoading?: boolean;
}

export function SessionModeSelector({ onModeSelect, isLoading = false }: SessionModeSelectorProps) {
  const [selectedMode, setSelectedMode] = useState<'couple' | 'solo' | null>(null);

  const handleModeSelect = (mode: 'couple' | 'solo') => {
    setSelectedMode(mode);
    onModeSelect(mode);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="w-full max-w-4xl">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Choose Your Session Mode
          </h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Select how you'd like to engage with our AI therapist. Each mode is designed 
            to provide the most effective support for your specific needs.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Couple Session Card */}
          <Card 
            className={`cursor-pointer transition-all duration-200 hover:shadow-lg ${
              selectedMode === 'couple' 
                ? 'ring-2 ring-blue-500 bg-blue-50' 
                : 'hover:shadow-md'
            }`}
            onClick={() => handleModeSelect('couple')}
          >
            <CardHeader className="text-center">
              <div className="mx-auto w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-4">
                <Heart className="w-8 h-8 text-blue-600" />
              </div>
              <CardTitle className="text-2xl text-gray-900">Talk Together</CardTitle>
              <CardDescription className="text-lg">
                Couple Session
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex items-start space-x-3">
                  <ArrowRight className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                  <p className="text-gray-700">
                    <strong>Structured dialogue</strong> with turn-taking between partners
                  </p>
                </div>
                <div className="flex items-start space-x-3">
                  <ArrowRight className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                  <p className="text-gray-700">
                    <strong>AI facilitation</strong> to guide productive conversations
                  </p>
                </div>
                <div className="flex items-start space-x-3">
                  <ArrowRight className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                  <p className="text-gray-700">
                    <strong>Real-time feedback</strong> and conflict resolution support
                  </p>
                </div>
              </div>
              
              <div className="pt-4 border-t border-gray-200">
                <div className="flex items-center justify-between text-sm text-gray-600">
                  <span className="flex items-center">
                    <Shield className="w-4 h-4 mr-1" />
                    Privacy Protected
                  </span>
                  <span className="flex items-center">
                    <Lock className="w-4 h-4 mr-1" />
                    Encrypted
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Solo Session Card */}
          <Card 
            className={`cursor-pointer transition-all duration-200 hover:shadow-lg ${
              selectedMode === 'solo' 
                ? 'ring-2 ring-green-500 bg-green-50' 
                : 'hover:shadow-md'
            }`}
            onClick={() => handleModeSelect('solo')}
          >
            <CardHeader className="text-center">
              <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
                <User className="w-8 h-8 text-green-600" />
              </div>
              <CardTitle className="text-2xl text-gray-900">Reflect Alone</CardTitle>
              <CardDescription className="text-lg">
                Solo Session
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex items-start space-x-3">
                  <ArrowRight className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                  <p className="text-gray-700">
                    <strong>Personal reflection</strong> and self-discovery
                  </p>
                </div>
                <div className="flex items-start space-x-3">
                  <ArrowRight className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                  <p className="text-gray-700">
                    <strong>AI guidance</strong> for emotional processing
                  </p>
                </div>
                <div className="flex items-start space-x-3">
                  <ArrowRight className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                  <p className="text-gray-700">
                    <strong>Convert to couple</strong> when ready to share insights
                  </p>
                </div>
              </div>
              
              <div className="pt-4 border-t border-gray-200">
                <div className="flex items-center justify-between text-sm text-gray-600">
                  <span className="flex items-center">
                    <Shield className="w-4 h-4 mr-1" />
                    Private & Secure
                  </span>
                  <span className="flex items-center">
                    <Lock className="w-4 h-4 mr-1" />
                    Encrypted
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {isLoading && (
          <div className="mt-8 text-center">
            <div className="inline-flex items-center space-x-2 text-blue-600">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
              <span>Creating your session...</span>
            </div>
          </div>
        )}

        <div className="mt-8 text-center text-sm text-gray-500">
          <p>
            All sessions are protected with end-to-end encryption and privacy controls. 
            Your data is never shared without your explicit consent.
          </p>
        </div>
      </div>
    </div>
  );
}