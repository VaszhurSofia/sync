import { randomBytes, createHash, createCipher, createDecipher } from 'crypto';

export interface SafetyClassification {
  level: 'low' | 'medium' | 'high' | 'critical';
  categories: string[];
  confidence: number;
  action: 'allow' | 'flag' | 'block' | 'emergency';
  metadata: {
    timestamp: string;
    sessionId: string;
    userId: string;
    contentHash: string;
  };
}

export interface PrivacySettings {
  dataRetention: number; // days
  encryptionLevel: 'standard' | 'enhanced' | 'military';
  auditLogging: boolean;
  gdprCompliance: boolean;
  dataAnonymization: boolean;
}

export interface AuditLog {
  id: string;
  timestamp: string;
  userId: string;
  sessionId: string;
  action: string;
  resource: string;
  outcome: 'success' | 'failure' | 'blocked';
  metadata: any;
  ipAddress: string;
  userAgent: string;
}

export class SafetyPrivacyManager {
  private auditLogs: AuditLog[] = [];
  private privacySettings: PrivacySettings = {
    dataRetention: 30,
    encryptionLevel: 'enhanced',
    auditLogging: true,
    gdprCompliance: true,
    dataAnonymization: true
  };

  /**
   * Enhanced safety classification with tier-2 analysis
   */
  async classifyContent(
    content: string,
    sessionId: string,
    userId: string,
    context: any = {}
  ): Promise<SafetyClassification> {
    const contentHash = this.hashContent(content);
    const timestamp = new Date().toISOString();

    // Tier-1: Deterministic patterns (existing)
    const tier1Result = this.tier1Classification(content);
    
    // Tier-2: Enhanced analysis
    const tier2Result = await this.tier2Classification(content, context);
    
    // Combine results
    const finalClassification = this.combineClassifications(tier1Result, tier2Result);

    // Log classification
    if (this.privacySettings.auditLogging) {
      this.logAuditEvent({
        id: `audit_${randomBytes(16).toString('hex')}`,
        timestamp,
        userId,
        sessionId,
        action: 'safety_classification',
        resource: 'content',
        outcome: finalClassification.action === 'allow' ? 'success' : 'blocked',
        metadata: {
          classification: finalClassification,
          contentLength: content.length,
          contentHash
        },
        ipAddress: context.ipAddress || 'unknown',
        userAgent: context.userAgent || 'unknown'
      });
    }

    return {
      ...finalClassification,
      metadata: {
        timestamp,
        sessionId,
        userId,
        contentHash
      }
    };
  }

  /**
   * Tier-1: Deterministic pattern matching
   */
  private tier1Classification(content: string): Partial<SafetyClassification> {
    const patterns = {
      selfHarm: [
        /\b(kill|hurt|harm|end|suicide|suicidal)\s+(myself|me|my\s+life)\b/i,
        /\b(self-harm|selfharm|cut myself|slit my wrists)\b/i,
      ],
      violence: [
        /\b(kill|murder|assault|rape|abuse|hit|punch|strangle)\s+(you|him|her|them|my\s+partner)\b/i,
        /\b(i will|i'm going to)\s+(kill|hurt|harm)\s+(you|my\s+partner)\b/i,
      ],
      threats: [
        /\b(threaten|threat|violence|violent)\b/i,
        /\b(i will|i'm going to)\s+(hurt|harm|kill)\b/i,
      ]
    };

    const categories: string[] = [];
    let maxLevel: 'low' | 'medium' | 'high' | 'critical' = 'low';

    for (const [category, patternList] of Object.entries(patterns)) {
      for (const pattern of patternList) {
        if (pattern.test(content)) {
          categories.push(category);
          if (category === 'selfHarm' || category === 'violence') {
            maxLevel = 'critical';
          } else if (category === 'threats') {
            maxLevel = 'high';
          }
        }
      }
    }

    return {
      level: maxLevel,
      categories,
      confidence: categories.length > 0 ? 0.9 : 0.1,
      action: maxLevel === 'critical' ? 'emergency' : maxLevel === 'high' ? 'block' : 'allow'
    };
  }

  /**
   * Tier-2: Enhanced analysis with context
   */
  private async tier2Classification(content: string, context: any): Promise<Partial<SafetyClassification>> {
    // Simulate enhanced analysis (in production, this would use ML models)
    const contentLength = content.length;
    const wordCount = content.split(/\s+/).length;
    const emotionalIntensity = this.analyzeEmotionalIntensity(content);
    const contextRisk = this.analyzeContextRisk(context);

    let level: 'low' | 'medium' | 'high' | 'critical' = 'low';
    let confidence = 0.5;
    let action: 'allow' | 'flag' | 'block' | 'emergency' = 'allow';

    // Emotional intensity analysis
    if (emotionalIntensity > 0.8) {
      level = 'high';
      confidence = 0.7;
      action = 'flag';
    }

    // Context risk analysis
    if (contextRisk > 0.7) {
      level = 'critical';
      confidence = 0.9;
      action = 'emergency';
    }

    // Content length and complexity analysis
    if (contentLength > 1000 && emotionalIntensity > 0.6) {
      level = 'medium';
      confidence = 0.6;
      action = 'flag';
    }

    return {
      level,
      confidence,
      action,
      categories: this.extractCategories(content)
    };
  }

  /**
   * Combine tier-1 and tier-2 classifications
   */
  private combineClassifications(
    tier1: Partial<SafetyClassification>,
    tier2: Partial<SafetyClassification>
  ): SafetyClassification {
    // Use the more severe classification
    const levels = ['low', 'medium', 'high', 'critical'];
    const tier1Level = levels.indexOf(tier1.level || 'low');
    const tier2Level = levels.indexOf(tier2.level || 'low');
    const finalLevel = levels[Math.max(tier1Level, tier2Level)] as 'low' | 'medium' | 'high' | 'critical';

    // Combine confidence scores
    const combinedConfidence = Math.max(tier1.confidence || 0, tier2.confidence || 0);

    // Determine final action
    let finalAction: 'allow' | 'flag' | 'block' | 'emergency' = 'allow';
    if (finalLevel === 'critical') {
      finalAction = 'emergency';
    } else if (finalLevel === 'high') {
      finalAction = 'block';
    } else if (finalLevel === 'medium') {
      finalAction = 'flag';
    }

    return {
      level: finalLevel,
      categories: [...(tier1.categories || []), ...(tier2.categories || [])],
      confidence: combinedConfidence,
      action: finalAction,
      metadata: {
        timestamp: new Date().toISOString(),
        sessionId: '',
        userId: '',
        contentHash: ''
      }
    };
  }

  /**
   * Analyze emotional intensity of content
   */
  private analyzeEmotionalIntensity(content: string): number {
    const emotionalWords = [
      'angry', 'furious', 'rage', 'hate', 'despise', 'devastated', 'crushed',
      'hopeless', 'desperate', 'terrified', 'scared', 'anxious', 'worried',
      'sad', 'depressed', 'lonely', 'isolated', 'abandoned', 'betrayed'
    ];

    const words = content.toLowerCase().split(/\s+/);
    const emotionalWordCount = words.filter(word => emotionalWords.includes(word)).length;
    
    return Math.min(emotionalWordCount / words.length * 10, 1);
  }

  /**
   * Analyze context risk factors
   */
  private analyzeContextRisk(context: any): number {
    let risk = 0;

    // Time-based risk (late night/early morning)
    const hour = new Date().getHours();
    if (hour < 6 || hour > 22) {
      risk += 0.2;
    }

    // Session history risk
    if (context.sessionMessageCount > 50) {
      risk += 0.3;
    }

    // User behavior risk
    if (context.recentBoundaryViolations > 0) {
      risk += 0.4;
    }

    return Math.min(risk, 1);
  }

  /**
   * Extract content categories
   */
  private extractCategories(content: string): string[] {
    const categories: string[] = [];
    
    if (content.includes('relationship') || content.includes('partner')) {
      categories.push('relationship');
    }
    
    if (content.includes('work') || content.includes('job')) {
      categories.push('work');
    }
    
    if (content.includes('family') || content.includes('parent')) {
      categories.push('family');
    }
    
    if (content.includes('money') || content.includes('financial')) {
      categories.push('financial');
    }

    return categories;
  }

  /**
   * Encrypt sensitive data
   */
  encryptData(data: string, key: string): string {
    const cipher = createCipher('aes-256-cbc', key);
    let encrypted = cipher.update(data, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return encrypted;
  }

  /**
   * Decrypt sensitive data
   */
  decryptData(encryptedData: string, key: string): string {
    const decipher = createDecipher('aes-256-cbc', key);
    let decrypted = decipher.update(encryptedData, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  }

  /**
   * Hash content for privacy
   */
  private hashContent(content: string): string {
    return createHash('sha256').update(content).digest('hex');
  }

  /**
   * Anonymize user data for GDPR compliance
   */
  anonymizeData(data: any): any {
    if (this.privacySettings.dataAnonymization) {
      return {
        ...data,
        userId: this.hashContent(data.userId || ''),
        email: this.hashContent(data.email || ''),
        ipAddress: this.hashContent(data.ipAddress || ''),
        userAgent: this.hashContent(data.userAgent || '')
      };
    }
    return data;
  }

  /**
   * Log audit event
   */
  private logAuditEvent(auditLog: AuditLog): void {
    if (this.privacySettings.auditLogging) {
      this.auditLogs.push(auditLog);
      
      // In production, this would be stored in a secure audit database
      console.log('AUDIT LOG:', JSON.stringify(auditLog, null, 2));
    }
  }

  /**
   * Get audit logs (with privacy controls)
   */
  getAuditLogs(userId: string, startDate?: string, endDate?: string): AuditLog[] {
    let logs = this.auditLogs.filter(log => log.userId === userId);
    
    if (startDate) {
      logs = logs.filter(log => log.timestamp >= startDate);
    }
    
    if (endDate) {
      logs = logs.filter(log => log.timestamp <= endDate);
    }

    // Apply privacy settings
    if (this.privacySettings.dataAnonymization) {
      return logs.map(log => this.anonymizeData(log));
    }

    return logs;
  }

  /**
   * Delete user data (GDPR right to be forgotten)
   */
  async deleteUserData(userId: string): Promise<boolean> {
    try {
      // Remove audit logs
      this.auditLogs = this.auditLogs.filter(log => log.userId !== userId);
      
      // In production, this would delete from all databases
      console.log(`User data deleted for user: ${userId}`);
      
      return true;
    } catch (error) {
      console.error('Error deleting user data:', error);
      return false;
    }
  }

  /**
   * Export user data (GDPR data portability)
   */
  exportUserData(userId: string): any {
    const userLogs = this.auditLogs.filter(log => log.userId === userId);
    
    return {
      userId,
      exportDate: new Date().toISOString(),
      dataRetention: this.privacySettings.dataRetention,
      auditLogs: userLogs,
      privacySettings: this.privacySettings
    };
  }

  /**
   * Update privacy settings
   */
  updatePrivacySettings(settings: Partial<PrivacySettings>): void {
    this.privacySettings = { ...this.privacySettings, ...settings };
  }

  /**
   * Get privacy settings
   */
  getPrivacySettings(): PrivacySettings {
    return { ...this.privacySettings };
  }
}

// Global safety and privacy manager
export const safetyPrivacyManager = new SafetyPrivacyManager();
