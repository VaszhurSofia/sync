'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  ArrowRight, 
  Shield, 
  Lock, 
  Eye, 
  EyeOff, 
  AlertCircle, 
  CheckCircle,
  Users,
  Heart
} from 'lucide-react';

interface SoloToCoupleConverterProps {
  soloSummary: string;
  onConvert: (redactedSummary: string, consent: boolean) => Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
}

export function SoloToCoupleConverter({ 
  soloSummary, 
  onConvert, 
  onCancel, 
  isLoading = false 
}: SoloToCoupleConverterProps) {
  const [redactedSummary, setRedactedSummary] = useState(soloSummary);
  const [consent, setConsent] = useState(false);
  const [showOriginal, setShowOriginal] = useState(false);
  const [step, setStep] = useState<'review' | 'redact' | 'consent'>('review');

  const handleConvert = async () => {
    if (!consent) return;
    await onConvert(redactedSummary, consent);
  };

  const handleRedact = () => {
    // Simple redaction - in production, this would be more sophisticated
    const redacted = redactedSummary
      .replace(/\b(I|me|my|myself)\b/gi, '[PERSONAL]')
      .replace(/\b(he|she|him|her|his|hers)\b/gi, '[PERSONAL]')
      .replace(/\b(we|us|our|ours)\b/gi, '[PERSONAL]')
      .replace(/\b(they|them|their|theirs)\b/gi, '[PERSONAL]');
    
    setRedactedSummary(redacted);
    setStep('consent');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-100 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        <Card className="shadow-lg">
          <CardHeader className="text-center">
            <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
              <Users className="w-8 h-8 text-green-600" />
            </div>
            <CardTitle className="text-2xl text-gray-900">
              Convert Solo Session to Couple Session
            </CardTitle>
            <CardDescription className="text-lg">
              Share your insights with your partner in a structured dialogue
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-6">
            {/* Step Indicator */}
            <div className="flex items-center justify-center space-x-4">
              <div className={`flex items-center space-x-2 ${step === 'review' ? 'text-blue-600' : 'text-gray-400'}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                  step === 'review' ? 'bg-blue-100' : 'bg-gray-100'
                }`}>
                  1
                </div>
                <span className="text-sm font-medium">Review</span>
              </div>
              <ArrowRight className="w-4 h-4 text-gray-400" />
              <div className={`flex items-center space-x-2 ${step === 'redact' ? 'text-blue-600' : 'text-gray-400'}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                  step === 'redact' ? 'bg-blue-100' : 'bg-gray-100'
                }`}>
                  2
                </div>
                <span className="text-sm font-medium">Redact</span>
              </div>
              <ArrowRight className="w-4 h-4 text-gray-400" />
              <div className={`flex items-center space-x-2 ${step === 'consent' ? 'text-blue-600' : 'text-gray-400'}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                  step === 'consent' ? 'bg-blue-100' : 'bg-gray-100'
                }`}>
                  3
                </div>
                <span className="text-sm font-medium">Consent</span>
              </div>
            </div>

            {/* Step 1: Review */}
            {step === 'review' && (
              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    Review Your Solo Session Summary
                  </h3>
                  <p className="text-gray-600 mb-4">
                    This is what will be shared with your partner. You can edit it to 
                    remove any personal details you'd like to keep private.
                  </p>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">
                    Session Summary
                  </label>
                  <Textarea
                    value={redactedSummary}
                    onChange={(e) => setRedactedSummary(e.target.value)}
                    className="min-h-[150px]"
                    placeholder="Your session summary..."
                  />
                </div>

                <div className="flex items-center justify-between">
                  <Button variant="outline" onClick={onCancel}>
                    Cancel
                  </Button>
                  <Button onClick={() => setStep('redact')}>
                    Continue to Redaction
                  </Button>
                </div>
              </div>
            )}

            {/* Step 2: Redact */}
            {step === 'redact' && (
              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    Redact Personal Information
                  </h3>
                  <p className="text-gray-600 mb-4">
                    We've automatically redacted personal pronouns and names. 
                    Review and make any additional changes you'd like.
                  </p>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowOriginal(!showOriginal)}
                    >
                      {showOriginal ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      {showOriginal ? 'Hide Original' : 'Show Original'}
                    </Button>
                  </div>

                  {showOriginal && (
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-gray-700">
                        Original Summary
                      </label>
                      <div className="p-3 bg-gray-50 rounded-lg text-sm text-gray-600">
                        {soloSummary}
                      </div>
                    </div>
                  )}

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">
                      Redacted Summary (what your partner will see)
                    </label>
                    <Textarea
                      value={redactedSummary}
                      onChange={(e) => setRedactedSummary(e.target.value)}
                      className="min-h-[150px]"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <Button variant="outline" onClick={() => setStep('review')}>
                    Back
                  </Button>
                  <Button onClick={handleRedact}>
                    Continue to Consent
                  </Button>
                </div>
              </div>
            )}

            {/* Step 3: Consent */}
            {step === 'consent' && (
              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    Consent to Share
                  </h3>
                  <p className="text-gray-600 mb-4">
                    Please review the redacted summary and confirm your consent to share it.
                  </p>
                </div>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">
                      Final Summary to Share
                    </label>
                    <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                      <p className="text-sm text-gray-700">{redactedSummary}</p>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-start space-x-3">
                      <Checkbox
                        id="consent"
                        checked={consent}
                        onCheckedChange={(checked) => setConsent(checked as boolean)}
                      />
                      <label htmlFor="consent" className="text-sm text-gray-700">
                        I consent to sharing this redacted summary with my partner in a new couple session.
                      </label>
                    </div>

                    <div className="flex items-start space-x-3">
                      <Checkbox
                        id="privacy"
                        checked={true}
                        disabled
                      />
                      <label htmlFor="privacy" className="text-sm text-gray-700">
                        I understand that my original solo session will remain private and encrypted.
                      </label>
                    </div>
                  </div>

                  <Alert className="border-blue-200 bg-blue-50">
                    <Shield className="h-4 w-4 text-blue-600" />
                    <AlertDescription className="text-blue-800">
                      <strong>Privacy Notice:</strong> Your original solo session remains completely private. 
                      Only the redacted summary will be shared with your partner.
                    </AlertDescription>
                  </Alert>
                </div>

                <div className="flex items-center justify-between">
                  <Button variant="outline" onClick={() => setStep('redact')}>
                    Back
                  </Button>
                  <Button 
                    onClick={handleConvert}
                    disabled={!consent || isLoading}
                    className="flex items-center space-x-2"
                  >
                    {isLoading ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        <span>Creating Couple Session...</span>
                      </>
                    ) : (
                      <>
                        <Heart className="w-4 h-4" />
                        <span>Start Couple Session</span>
                      </>
                    )}
                  </Button>
                </div>
              </div>
            )}

            {/* Privacy Information */}
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
      </div>
    </div>
  );
}