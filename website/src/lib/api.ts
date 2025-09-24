/**
 * API client for Sync website
 * Connects to the M5-enhanced API server
 */

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3001';

export interface ApiResponse<T = any> {
  data?: T;
  error?: string;
  message?: string;
}

export interface User {
  id: string;
  email: string;
  displayName: string;
}

export interface AuthResponse {
  accessToken: string;
}

export interface Couple {
  id: string;
  createdAt: string;
  members: Array<{
    id: string;
    email: string;
    displayName: string;
    role: string;
  }>;
}

export interface Session {
  id: string;
  coupleId: string;
  startedAt: string;
  endedAt?: string;
}

export interface Message {
  id: string;
  sessionId: string;
  sender: 'userA' | 'userB' | 'ai';
  content: string;
  createdAt: string;
  safetyTags?: string[];
}

export interface SurveyResponse {
  id: string;
  sessionId: string;
  rating: 'angry' | 'neutral' | 'happy';
  feedback?: string;
  submittedAt: string;
}

export interface SafetyStatus {
  userId: string;
  violations: number;
  rateLimit: {
    maxRequests: number;
    windowMs: number;
    message: string;
  };
  frontendLock: {
    isLocked: boolean;
    reason: string;
    message: string;
    resources: string[];
    unlockConditions: string[];
  };
  safetyGuidelines: string[];
}

class ApiClient {
  private baseUrl: string;
  private token: string | null = null;

  constructor(baseUrl: string = API_BASE) {
    this.baseUrl = baseUrl;
    this.token = typeof window !== 'undefined' ? localStorage.getItem('sync_token') : null;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    const url = `${this.baseUrl}${endpoint}`;
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    if (this.token) {
      (headers as any).Authorization = `Bearer ${this.token}`;
    }

    try {
      const response = await fetch(url, {
        ...options,
        headers,
      });

      let data;
      if (response.ok) {
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          data = await response.json();
        } else {
          data = await response.text();
        }
      } else {
        data = await response.text();
      }

      if (!response.ok) {
        return {
          error: `HTTP ${response.status}: ${data}`,
        };
      }

      return { data };
    } catch (error) {
      return {
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  // Authentication
  async requestCode(email: string): Promise<ApiResponse> {
    return this.request('/auth/request-code', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
  }

  async verifyCode(email: string, code: string): Promise<ApiResponse<AuthResponse>> {
    const response = await this.request<AuthResponse>('/auth/verify-code', {
      method: 'POST',
      body: JSON.stringify({ email, code }),
    });

    if (response.data?.accessToken) {
      this.token = response.data.accessToken;
      if (typeof window !== 'undefined') {
        localStorage.setItem('sync_token', this.token);
      }
    }

    return response;
  }

  async getCurrentUser(): Promise<ApiResponse<User>> {
    return this.request<User>('/auth/me');
  }

  // Couple Management
  async createCouple(): Promise<ApiResponse<{ coupleId: string }>> {
    return this.request<{ coupleId: string }>('/couples', {
      method: 'POST',
    });
  }

  async createInvite(): Promise<ApiResponse<{ code: string; link: string; expiresAt: string }>> {
    return this.request<{ code: string; link: string; expiresAt: string }>('/invites', {
      method: 'POST',
    });
  }

  async acceptInvite(code: string): Promise<ApiResponse> {
    return this.request(`/invites/${code}/accept`, {
      method: 'POST',
    });
  }

  async getCouple(): Promise<ApiResponse<Couple>> {
    return this.request<Couple>('/couples/me');
  }

  // Session Management
  async createSession(): Promise<ApiResponse<{ sessionId: string }>> {
    return this.request<{ sessionId: string }>('/sessions', {
      method: 'POST',
    });
  }

  async sendMessage(
    sessionId: string,
    content: string,
    clientMessageId: string
  ): Promise<ApiResponse<{ messageId: string; status: string }>> {
    return this.request<{ messageId: string; status: string }>(`/sessions/${sessionId}/messages`, {
      method: 'POST',
      body: JSON.stringify({ content, client_message_id: clientMessageId }),
    });
  }

  async getMessages(
    sessionId: string,
    after?: string,
    waitMs?: number
  ): Promise<ApiResponse<Message[]>> {
    const params = new URLSearchParams();
    if (after) params.append('after', after);
    if (waitMs) params.append('waitMs', waitMs.toString());

    const queryString = params.toString();
    const endpoint = `/sessions/${sessionId}/messages${queryString ? `?${queryString}` : ''}`;

    return this.request<Message[]>(endpoint);
  }

  async endSession(sessionId: string): Promise<ApiResponse> {
    return this.request(`/sessions/${sessionId}/end`, {
      method: 'POST',
    });
  }

  async deleteSession(sessionId: string): Promise<ApiResponse> {
    return this.request(`/sessions/${sessionId}`, {
      method: 'DELETE',
    });
  }

  // Survey System
  async submitSurvey(
    sessionId: string,
    rating: 'angry' | 'neutral' | 'happy',
    feedback?: string
  ): Promise<ApiResponse<{ id: string; message: string }>> {
    return this.request<{ id: string; message: string }>(`/sessions/${sessionId}/survey`, {
      method: 'POST',
      body: JSON.stringify({ rating, feedback }),
    });
  }

  async getSurveyAnalytics(): Promise<ApiResponse<{
    analytics: {
      totalResponses: number;
      ratingDistribution: {
        angry: number;
        neutral: number;
        happy: number;
      };
      averageRating: number;
      responseRate: number;
      recentTrends: {
        last7Days: SurveyResponse[];
        last30Days: SurveyResponse[];
      };
    };
    insights: {
      insights: string[];
      recommendations: string[];
    };
    config: {
      enabled: boolean;
      required: boolean;
      textFeedback: {
        enabled: boolean;
        maxLength: number;
      };
    };
  }>> {
    return this.request('/survey/analytics');
  }

  // Safety System
  async getSafetyStatus(): Promise<ApiResponse<SafetyStatus>> {
    return this.request<SafetyStatus>('/safety/status');
  }

  // Delete System
  async requestAccountDeletion(
    reason: 'user_request' | 'privacy_compliance' | 'account_closure' | 'data_breach',
    confirmation: boolean = false
  ): Promise<ApiResponse<{
    confirmationRequired?: boolean;
    confirmation?: {
      confirmationId: string;
      message: string;
      warning: string;
      estimatedRecords: number;
      gracePeriod: number;
    };
    message?: string;
    deleteRequestId?: string;
    result?: {
      success: boolean;
      deletedRecords: {
        users: number;
        couples: number;
        sessions: number;
        messages: number;
        surveyResponses: number;
        safetyViolations: number;
        analytics: number;
        auditLogs: number;
      };
      errors: string[];
      completedAt: string;
    };
  }>> {
    return this.request('/account/delete', {
      method: 'POST',
      body: JSON.stringify({ reason, confirmation }),
    });
  }

  async getDeleteStatus(): Promise<ApiResponse<{
    deleteRequests: Array<{
      id: string;
      userId: string;
      requestedAt: string;
      reason: string;
      status: string;
      completedAt?: string;
      errorMessage?: string;
    }>;
    config: {
      enabled: boolean;
      retentionPeriod: number;
      auditLogging: boolean;
      confirmationRequired: boolean;
      gracePeriod: number;
      batchSize: number;
      maxRetries: number;
    };
  }>> {
    return this.request('/account/delete/status');
  }

  // Health Check
  async getHealth(): Promise<ApiResponse<{
    status: string;
    timestamp: string;
    features: string[];
    safety: string;
    survey: string;
    delete: string;
  }>> {
    return this.request('/health');
  }

  // Utility methods
  setToken(token: string) {
    this.token = token;
    if (typeof window !== 'undefined') {
      localStorage.setItem('sync_token', token);
    }
  }

  clearToken() {
    this.token = null;
    if (typeof window !== 'undefined') {
      localStorage.removeItem('sync_token');
    }
  }

  isAuthenticated(): boolean {
    return !!this.token;
  }
}

// Export singleton instance
export const apiClient = new ApiClient();

// Export class for testing
export { ApiClient };
