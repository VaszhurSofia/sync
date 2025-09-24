# Log Security Scan Report

❌ **FAILED** - 6 security violations found

## Violations:

1. **services/api/src/ai-integrated-server.ts:78**
   `console.log(`🔑 Verification code for ${email}: ${code}`);`
   Reason: Console.log with sensitive data detected

2. **services/api/src/m5-enhanced-server.ts:116**
   `console.log(`🔑 Verification code for ${email}: ${code}`);`
   Reason: Console.log with sensitive data detected

3. **services/api/src/safety-enhanced-server.ts:126**
   `console.log(`🔑 Verification code for ${email}: ${code}`);`
   Reason: Console.log with sensitive data detected

4. **services/api/src/sessions-server.ts:29**
   `console.log(`🔑 Verification code for ${email}: ${code}`);`
   Reason: Console.log with sensitive data detected

5. **services/api/src/simple-m2-server.ts:38**
   `console.log(`🔑 Verification code for ${email}: ${code}`);`
   Reason: Console.log with sensitive data detected

6. **services/api/src/simple-server.ts:27**
   `console.log(`🔑 Verification code for ${email}: ${code}`);`
   Reason: Console.log with sensitive data detected

## Summary
- Total files scanned: 70
- Violations found: 6
- Status: FAILED

## Recommendations
1. Remove or redact sensitive data from console.log statements
2. Use structured logging with redaction
3. Never log passwords, tokens, or API keys
4. Use environment variables for configuration, not hardcoded values
