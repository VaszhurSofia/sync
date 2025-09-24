/**
 * Metrics System (No PII)
 * Tracks session metrics without storing personal information
 */

export interface SessionMetrics {
  sessionStarted: number;
  sessionCompleted: number;
  sessionBoundary: number;
  sessionSurvey: number;
  sessionDelete: number;
  messageSent: number;
  messageReceived: number;
  boundaryViolation: number;
  safetyCheck: number;
  longPollRequest: number;
  longPollTimeout: number;
  longPollAbort: number;
}

export class MetricsCollector {
  private metrics: SessionMetrics;

  constructor() {
    this.metrics = {
      sessionStarted: 0,
      sessionCompleted: 0,
      sessionBoundary: 0,
      sessionSurvey: 0,
      sessionDelete: 0,
      messageSent: 0,
      messageReceived: 0,
      boundaryViolation: 0,
      safetyCheck: 0,
      longPollRequest: 0,
      longPollTimeout: 0,
      longPollAbort: 0
    };
  }

  // Session lifecycle metrics
  incrementSessionStarted(): void {
    this.metrics.sessionStarted++;
  }

  incrementSessionCompleted(): void {
    this.metrics.sessionCompleted++;
  }

  incrementSessionBoundary(): void {
    this.metrics.sessionBoundary++;
  }

  incrementSessionSurvey(): void {
    this.metrics.sessionSurvey++;
  }

  incrementSessionDelete(): void {
    this.metrics.sessionDelete++;
  }

  // Message metrics
  incrementMessageSent(): void {
    this.metrics.messageSent++;
  }

  incrementMessageReceived(): void {
    this.metrics.messageReceived++;
  }

  // Safety metrics
  incrementBoundaryViolation(): void {
    this.metrics.boundaryViolation++;
  }

  incrementSafetyCheck(): void {
    this.metrics.safetyCheck++;
  }

  // Long-polling metrics
  incrementLongPollRequest(): void {
    this.metrics.longPollRequest++;
  }

  incrementLongPollTimeout(): void {
    this.metrics.longPollTimeout++;
  }

  incrementLongPollAbort(): void {
    this.metrics.longPollAbort++;
  }

  // Get current metrics
  getMetrics(): SessionMetrics {
    return { ...this.metrics };
  }

  // Reset metrics (for testing)
  reset(): void {
    this.metrics = {
      sessionStarted: 0,
      sessionCompleted: 0,
      sessionBoundary: 0,
      sessionSurvey: 0,
      sessionDelete: 0,
      messageSent: 0,
      messageReceived: 0,
      boundaryViolation: 0,
      safetyCheck: 0,
      longPollRequest: 0,
      longPollTimeout: 0,
      longPollAbort: 0
    };
  }

  // Generate Prometheus format
  toPrometheus(): string {
    const lines: string[] = [];
    
    lines.push('# HELP session_started_total Total number of sessions started');
    lines.push('# TYPE session_started_total counter');
    lines.push(`session_started_total ${this.metrics.sessionStarted}`);
    
    lines.push('# HELP session_completed_total Total number of sessions completed');
    lines.push('# TYPE session_completed_total counter');
    lines.push(`session_completed_total ${this.metrics.sessionCompleted}`);
    
    lines.push('# HELP session_boundary_total Total number of sessions that hit boundary');
    lines.push('# TYPE session_boundary_total counter');
    lines.push(`session_boundary_total ${this.metrics.sessionBoundary}`);
    
    lines.push('# HELP session_survey_total Total number of surveys submitted');
    lines.push('# TYPE session_survey_total counter');
    lines.push(`session_survey_total ${this.metrics.sessionSurvey}`);
    
    lines.push('# HELP session_delete_total Total number of sessions deleted');
    lines.push('# TYPE session_delete_total counter');
    lines.push(`session_delete_total ${this.metrics.sessionDelete}`);
    
    lines.push('# HELP message_sent_total Total number of messages sent');
    lines.push('# TYPE message_sent_total counter');
    lines.push(`message_sent_total ${this.metrics.messageSent}`);
    
    lines.push('# HELP message_received_total Total number of messages received');
    lines.push('# TYPE message_received_total counter');
    lines.push(`message_received_total ${this.metrics.messageReceived}`);
    
    lines.push('# HELP boundary_violation_total Total number of boundary violations');
    lines.push('# TYPE boundary_violation_total counter');
    lines.push(`boundary_violation_total ${this.metrics.boundaryViolation}`);
    
    lines.push('# HELP safety_check_total Total number of safety checks performed');
    lines.push('# TYPE safety_check_total counter');
    lines.push(`safety_check_total ${this.metrics.safetyCheck}`);
    
    lines.push('# HELP longpoll_request_total Total number of long-poll requests');
    lines.push('# TYPE longpoll_request_total counter');
    lines.push(`longpoll_request_total ${this.metrics.longPollRequest}`);
    
    lines.push('# HELP longpoll_timeout_total Total number of long-poll timeouts');
    lines.push('# TYPE longpoll_timeout_total counter');
    lines.push(`longpoll_timeout_total ${this.metrics.longPollTimeout}`);
    
    lines.push('# HELP longpoll_abort_total Total number of long-poll aborts');
    lines.push('# TYPE longpoll_abort_total counter');
    lines.push(`longpoll_abort_total ${this.metrics.longPollAbort}`);
    
    return lines.join('\n');
  }
}

// Global metrics instance
export const metricsCollector = new MetricsCollector();
