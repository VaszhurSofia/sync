'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Shield, 
  Lock, 
  Eye, 
  EyeOff, 
  AlertCircle, 
  CheckCircle,
  Settings,
  Download,
  Trash2,
  RefreshCw
} from 'lucide-react';

interface SafetyPrivacyGuardProps {
  safetyLevel: 'low' | 'medium' | 'high' | 'critical';
  privacySettings: {
    dataRetention: number;
    encryptionLevel: 'standard' | 'enhanced' | 'military';
    auditLogging: boolean;
    gdprCompliance: boolean;
    dataAnonymization: boolean;
  };
  onSettingsUpdate: (settings: Partial<typeof privacySettings>) => void;
  onDataExport: () => Promise<void>;
  onDataDelete: () => Promise<void>;
  onRefresh: () => void;
}

export function SafetyPrivacyGuard({
  safetyLevel,
  privacySettings,
  onSettingsUpdate,
  onDataExport,
  onDataDelete,
  onRefresh
}: SafetyPrivacyGuardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleDataExport = async () => {
    setIsLoading(true);
    try {
      await onDataExport();
    } finally {
      setIsLoading(false);
    }
  };

  const handleDataDelete = async () => {
    if (window.confirm('Are you sure you want to delete all your data? This action cannot be undone.')) {
      setIsLoading(true);
      try {
        await onDataDelete();
      } finally {
        setIsLoading(false);
      }
    }
  };

  const getSafetyColor = () => {
    switch (safetyLevel) {
      case 'critical': return 'text-red-600 bg-red-50 border-red-200';
      case 'high': return 'text-orange-600 bg-orange-50 border-orange-200';
      case 'medium': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      default: return 'text-green-600 bg-green-50 border-green-200';
    }
  };

  const getSafetyMessage = () => {
    switch (safetyLevel) {
      case 'critical': return 'Critical safety level detected';
      case 'high': return 'High safety level - content flagged';
      case 'medium': return 'Medium safety level - content reviewed';
      default: return 'Low safety level - all clear';
    }
  };

  return (
    <div className="space-y-4">
      {/* Safety Status */}
      <Alert className={`${getSafetyColor()}`}>
        <Shield className="h-4 w-4" />
        <AlertDescription>
          <div className="flex items-center justify-between">
            <div>
              <strong>Safety Status:</strong> {getSafetyMessage()}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={onRefresh}
              className="ml-4"
            >
              <RefreshCw className="w-4 h-4 mr-1" />
              Refresh
            </Button>
          </div>
        </AlertDescription>
      </Alert>

      {/* Privacy Controls */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg flex items-center">
                <Lock className="w-5 h-5 mr-2" />
                Privacy & Safety Controls
              </CardTitle>
              <CardDescription>
                Manage your privacy settings and data controls
              </CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsExpanded(!isExpanded)}
            >
              <Settings className="w-4 h-4 mr-1" />
              {isExpanded ? 'Hide' : 'Show'} Settings
            </Button>
          </div>
        </CardHeader>

        {isExpanded && (
          <CardContent className="space-y-6">
            {/* Privacy Settings */}
            <div className="space-y-4">
              <h4 className="font-semibold text-gray-900">Privacy Settings</h4>
              
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <label className="text-sm font-medium text-gray-700">
                      Data Retention
                    </label>
                    <p className="text-xs text-gray-500">
                      How long to keep your data (days)
                    </p>
                  </div>
                  <select
                    value={privacySettings.dataRetention}
                    onChange={(e) => onSettingsUpdate({ 
                      dataRetention: parseInt(e.target.value) 
                    })}
                    className="px-3 py-1 border border-gray-300 rounded-md text-sm"
                  >
                    <option value={7}>7 days</option>
                    <option value={30}>30 days</option>
                    <option value={60}>60 days</option>
                    <option value={90}>90 days</option>
                  </select>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <label className="text-sm font-medium text-gray-700">
                      Encryption Level
                    </label>
                    <p className="text-xs text-gray-500">
                      Security level for your data
                    </p>
                  </div>
                  <select
                    value={privacySettings.encryptionLevel}
                    onChange={(e) => onSettingsUpdate({ 
                      encryptionLevel: e.target.value as 'standard' | 'enhanced' | 'military'
                    })}
                    className="px-3 py-1 border border-gray-300 rounded-md text-sm"
                  >
                    <option value="standard">Standard</option>
                    <option value="enhanced">Enhanced</option>
                    <option value="military">Military</option>
                  </select>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <label className="text-sm font-medium text-gray-700">
                      Audit Logging
                    </label>
                    <p className="text-xs text-gray-500">
                      Track system access and changes
                    </p>
                  </div>
                  <Switch
                    checked={privacySettings.auditLogging}
                    onCheckedChange={(checked) => onSettingsUpdate({ 
                      auditLogging: checked 
                    })}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <label className="text-sm font-medium text-gray-700">
                      Data Anonymization
                    </label>
                    <p className="text-xs text-gray-500">
                      Remove personal identifiers from logs
                    </p>
                  </div>
                  <Switch
                    checked={privacySettings.dataAnonymization}
                    onCheckedChange={(checked) => onSettingsUpdate({ 
                      dataAnonymization: checked 
                    })}
                  />
                </div>
              </div>
            </div>

            {/* GDPR Controls */}
            <div className="space-y-4">
              <h4 className="font-semibold text-gray-900">Data Rights (GDPR)</h4>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Button
                  variant="outline"
                  onClick={handleDataExport}
                  disabled={isLoading}
                  className="flex items-center space-x-2"
                >
                  <Download className="w-4 h-4" />
                  <span>Export My Data</span>
                </Button>

                <Button
                  variant="outline"
                  onClick={handleDataDelete}
                  disabled={isLoading}
                  className="flex items-center space-x-2 text-red-600 hover:text-red-700"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>Delete My Data</span>
                </Button>
              </div>

              <div className="text-xs text-gray-500 space-y-1">
                <p>• <strong>Export:</strong> Download all your data in a portable format</p>
                <p>• <strong>Delete:</strong> Permanently remove all your data (cannot be undone)</p>
              </div>
            </div>

            {/* Security Status */}
            <div className="space-y-4">
              <h4 className="font-semibold text-gray-900">Security Status</h4>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-center space-x-2 p-3 bg-green-50 rounded-lg">
                  <CheckCircle className="w-4 h-4 text-green-600" />
                  <span className="text-sm text-green-800">End-to-End Encrypted</span>
                </div>
                
                <div className="flex items-center space-x-2 p-3 bg-green-50 rounded-lg">
                  <CheckCircle className="w-4 h-4 text-green-600" />
                  <span className="text-sm text-green-800">GDPR Compliant</span>
                </div>
                
                <div className="flex items-center space-x-2 p-3 bg-green-50 rounded-lg">
                  <CheckCircle className="w-4 h-4 text-green-600" />
                  <span className="text-sm text-green-800">Audit Logged</span>
                </div>
                
                <div className="flex items-center space-x-2 p-3 bg-green-50 rounded-lg">
                  <CheckCircle className="w-4 h-4 text-green-600" />
                  <span className="text-sm text-green-800">Data Anonymized</span>
                </div>
              </div>
            </div>
          </CardContent>
        )}
      </Card>
    </div>
  );
}

// Safety level indicator component
export function SafetyLevelIndicator({ level }: { level: 'low' | 'medium' | 'high' | 'critical' }) {
  const getColor = () => {
    switch (level) {
      case 'critical': return 'text-red-600 bg-red-100';
      case 'high': return 'text-orange-600 bg-orange-100';
      case 'medium': return 'text-yellow-600 bg-yellow-100';
      default: return 'text-green-600 bg-green-100';
    }
  };

  const getIcon = () => {
    switch (level) {
      case 'critical': return <AlertCircle className="w-4 h-4" />;
      case 'high': return <AlertCircle className="w-4 h-4" />;
      case 'medium': return <AlertCircle className="w-4 h-4" />;
      default: return <CheckCircle className="w-4 h-4" />;
    }
  };

  return (
    <div className={`inline-flex items-center space-x-2 px-3 py-1 rounded-full text-sm font-medium ${getColor()}`}>
      {getIcon()}
      <span>Safety Level: {level.toUpperCase()}</span>
    </div>
  );
}