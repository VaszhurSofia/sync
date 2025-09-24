# Key Rotation Runbook

## Overview
This runbook covers the secure rotation of Data Encryption Keys (DEKs) and Key Management Service (KMS) keys to maintain cryptographic hygiene and compliance.

## Prerequisites
- Access to KMS console
- Database admin privileges
- Monitoring system access
- Backup verification tools

## DEK Rotation Process

### 1. Pre-Rotation Checklist
- [ ] Verify all encrypted data is accessible
- [ ] Confirm backup integrity
- [ ] Check monitoring alerts are functional
- [ ] Notify team of maintenance window
- [ ] Prepare rollback plan

### 2. Create New DEK
```bash
# Generate new DEK
NEW_DEK=$(openssl rand -base64 32)
echo "New DEK: $NEW_DEK"

# Store in KMS
aws kms encrypt \
  --key-id alias/sync-dek \
  --plaintext "$NEW_DEK" \
  --region eu-west-1
```

### 3. Re-encrypt Data
```sql
-- Re-encrypt all encrypted columns
UPDATE messages SET content_enc = encrypt_with_new_key(content_enc);
UPDATE users SET display_name_enc = encrypt_with_new_key(display_name_enc);
UPDATE sessions SET summary_text_enc = encrypt_with_new_key(summary_text_enc);
UPDATE session_history SET summary_text_enc = encrypt_with_new_key(summary_text_enc);
```

### 4. Update Application Configuration
```bash
# Update environment variables
export SYNC_DEK_ID="new-dek-id"
export SYNC_DEK_AGE_THRESHOLD="90" # days

# Restart services
systemctl restart sync-api
systemctl restart sync-ai
```

### 5. Verification
- [ ] Test encryption/decryption with new key
- [ ] Verify all data is accessible
- [ ] Check monitoring metrics
- [ ] Run health checks

### 6. Cleanup
- [ ] Archive old DEK (encrypted)
- [ ] Update documentation
- [ ] Notify team of completion

## KMS Key Rotation

### 1. Create New KMS Key
```bash
# Create new KMS key
aws kms create-key \
  --description "Sync DEK Key v2" \
  --key-usage ENCRYPT_DECRYPT \
  --key-spec SYMMETRIC_DEFAULT \
  --region eu-west-1

# Create alias
aws kms create-alias \
  --alias-name alias/sync-dek-v2 \
  --target-key-id <new-key-id>
```

### 2. Update Application
```bash
# Update KMS key ID
export SYNC_KMS_KEY_ID="<new-key-id>"
export SYNC_KMS_ALIAS="alias/sync-dek-v2"
```

### 3. Verify and Cleanup
- [ ] Test KMS operations
- [ ] Update monitoring
- [ ] Schedule old key deletion (30 days)

## Monitoring and Alerts

### DEK Age Monitoring
```yaml
# Prometheus alert rule
- alert: DEKAgeExceeded
  expr: dek_age_days > 90
  for: 0m
  labels:
    severity: warning
  annotations:
    summary: "DEK age exceeded threshold"
    description: "DEK is {{ $value }} days old, rotation recommended"
```

### Health Check Endpoint
```typescript
// /health/crypto endpoint response
{
  "kms": "ok",
  "dek_age_days": 45,
  "selftest": "ok",
  "last_rotation": "2024-01-15T10:30:00Z",
  "next_rotation_due": "2024-04-15T10:30:00Z"
}
```

## Test Vectors

### Encryption Test Vector
```json
{
  "plaintext": "This is a test message for encryption",
  "expected_ciphertext": "base64_encoded_ciphertext",
  "key_id": "dek-v1",
  "algorithm": "AES-256-GCM",
  "nonce": "base64_encoded_nonce",
  "tag": "base64_encoded_tag"
}
```

### Decryption Test Vector
```json
{
  "ciphertext": "base64_encoded_ciphertext",
  "key_id": "dek-v1",
  "expected_plaintext": "This is a test message for encryption",
  "algorithm": "AES-256-GCM",
  "nonce": "base64_encoded_nonce",
  "tag": "base64_encoded_tag"
}
```

## Emergency Procedures

### Key Compromise
1. **Immediate Response**
   - Revoke compromised key
   - Generate new key
   - Re-encrypt all data
   - Audit access logs

2. **Investigation**
   - Determine scope of compromise
   - Identify affected data
   - Document timeline
   - Notify stakeholders

3. **Recovery**
   - Complete data re-encryption
   - Update all systems
   - Verify data integrity
   - Update security procedures

## Compliance Notes

### GDPR Requirements
- Data subjects have right to data portability
- Encryption keys must be properly managed
- Audit logs must be maintained
- Data retention policies apply

### SOC 2 Requirements
- Key rotation must be documented
- Access controls must be enforced
- Monitoring must be continuous
- Incident response must be tested

## Automation Scripts

### Automated Rotation Check
```bash
#!/bin/bash
# check-dek-age.sh

DEK_AGE=$(curl -s http://localhost:3000/health/crypto | jq -r '.dek_age_days')
THRESHOLD=90

if [ "$DEK_AGE" -gt "$THRESHOLD" ]; then
    echo "ALERT: DEK age $DEK_AGE days exceeds threshold $THRESHOLD"
    # Send alert to monitoring system
    curl -X POST "https://monitoring.example.com/alerts" \
         -H "Content-Type: application/json" \
         -d '{"alert": "DEK age exceeded", "value": "'$DEK_AGE'"}'
fi
```

### Rotation Automation
```bash
#!/bin/bash
# rotate-dek.sh

# Check if rotation is needed
DEK_AGE=$(curl -s http://localhost:3000/health/crypto | jq -r '.dek_age_days')
if [ "$DEK_AGE" -lt 90 ]; then
    echo "DEK age $DEK_AGE days is within acceptable range"
    exit 0
fi

# Perform rotation
echo "Starting DEK rotation..."
# Implementation details here
echo "DEK rotation completed"
```

## Troubleshooting

### Common Issues
1. **Decryption Failures**
   - Check key ID
   - Verify key availability
   - Check ciphertext format

2. **Performance Issues**
   - Monitor KMS latency
   - Check key caching
   - Verify network connectivity

3. **Access Denied**
   - Check IAM permissions
   - Verify key policies
   - Check region configuration

### Recovery Procedures
1. **Data Recovery**
   - Use backup keys
   - Restore from backups
   - Re-encrypt with new key

2. **Service Recovery**
   - Restart services
   - Clear caches
   - Verify configuration
