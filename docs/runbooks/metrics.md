# Metrics and Observability

## Overview

The Sync platform includes a comprehensive metrics system that tracks key performance indicators and system health without storing any personal information (PII).

## Metrics Endpoints

### GET /metrics
Returns Prometheus-formatted metrics for monitoring and alerting.

**Response Format:**
```
# HELP session_started_total Total number of sessions started
# TYPE session_started_total counter
session_started_total 42

# HELP session_completed_total Total number of sessions completed
# TYPE session_completed_total counter
session_completed_total 38
```

### GET /metrics/json
Returns JSON-formatted metrics for debugging and analysis.

**Response Format:**
```json
{
  "sessionStarted": 42,
  "sessionCompleted": 38,
  "sessionBoundary": 2,
  "sessionSurvey": 35,
  "sessionDelete": 1,
  "messageSent": 156,
  "messageReceived": 156,
  "boundaryViolation": 3,
  "safetyCheck": 159,
  "longPollRequest": 89,
  "longPollTimeout": 12,
  "longPollAbort": 5
}
```

## Tracked Metrics

### Session Lifecycle
- **session_started_total**: Number of new sessions created
- **session_completed_total**: Number of sessions that reached completion
- **session_boundary_total**: Number of sessions that hit safety boundaries
- **session_survey_total**: Number of surveys submitted
- **session_delete_total**: Number of sessions deleted

### Message Flow
- **message_sent_total**: Number of messages sent by users
- **message_received_total**: Number of messages received by users
- **longpoll_request_total**: Number of long-polling requests
- **longpoll_timeout_total**: Number of long-polling timeouts
- **longpoll_abort_total**: Number of long-polling aborts

### Safety and Security
- **boundary_violation_total**: Number of safety boundary violations
- **safety_check_total**: Number of safety checks performed

## Privacy and Compliance

### No PII Storage
- Metrics only track counts and aggregates
- No message content, user IDs, or personal data
- No session content or conversation details
- No timestamps or location data

### Data Retention
- Metrics are stored in memory only
- No persistent storage of metrics data
- Metrics reset on application restart
- No cross-session correlation

## Monitoring and Alerting

### Key Performance Indicators
1. **Session Completion Rate**: `session_completed_total / session_started_total`
2. **Boundary Hit Rate**: `session_boundary_total / session_started_total`
3. **Survey Response Rate**: `session_survey_total / session_completed_total`
4. **Message Success Rate**: `message_received_total / message_sent_total`

### Recommended Alerts
- High boundary violation rate (>10%)
- Low session completion rate (<80%)
- High long-poll timeout rate (>20%)
- Unusual message volume spikes

## Integration with Monitoring Systems

### Prometheus
The `/metrics` endpoint is compatible with Prometheus scraping:

```yaml
scrape_configs:
  - job_name: 'sync-api'
    static_configs:
      - targets: ['api.sync.com:3000']
    metrics_path: '/metrics'
    scrape_interval: 30s
```

### Grafana Dashboards
Create dashboards using the following queries:

```promql
# Session completion rate
rate(session_completed_total[5m]) / rate(session_started_total[5m])

# Boundary violation rate
rate(session_boundary_total[5m]) / rate(session_started_total[5m])

# Message throughput
rate(message_sent_total[1m])
```

## Testing Metrics

### Reset Metrics
```bash
curl -X POST http://localhost:3000/metrics/reset
```

### Verify Metrics
```bash
curl http://localhost:3000/metrics/json
```

## Troubleshooting

### Common Issues

1. **Metrics not updating**: Check if metrics collector is properly initialized
2. **High memory usage**: Metrics are stored in memory; restart if needed
3. **Missing metrics**: Verify that metric increment calls are in place

### Debug Commands

```bash
# Check metrics endpoint
curl -v http://localhost:3000/metrics

# Check JSON metrics
curl http://localhost:3000/metrics/json

# Reset metrics for testing
curl -X POST http://localhost:3000/metrics/reset
```

## Security Considerations

- Metrics endpoint is public (no authentication required)
- No sensitive data is exposed
- Rate limiting may be applied to prevent abuse
- Consider IP whitelisting for production environments

## Future Enhancements

- Add histogram metrics for response times
- Include system resource metrics (CPU, memory)
- Add custom business metrics
- Implement metrics aggregation across instances
