# Pull Request

## 📋 Description
<!-- Provide a clear description of what this PR does -->

## 🔗 Related Issues
<!-- Link to related issues using "Fixes #123" or "Closes #123" -->

## 🧪 Testing
<!-- Describe how you tested this change -->

- [ ] Unit tests added/updated
- [ ] Integration tests added/updated
- [ ] Manual testing completed
- [ ] All existing tests pass

## 📚 Documentation
<!-- Describe any documentation changes -->

- [ ] README updated (if needed)
- [ ] API documentation updated (if needed)
- [ ] Code comments added/updated
- [ ] Changelog updated (if needed)

## 🔒 Security & Privacy Checklist
<!-- CRITICAL: All items must be checked for security-sensitive changes -->

### Data Protection
- [ ] No sensitive data (PII, tokens, secrets) in code
- [ ] No hardcoded credentials or API keys
- [ ] Database queries use parameterized statements
- [ ] Input validation implemented for all user inputs
- [ ] Output encoding applied to prevent XSS

### Logging & Monitoring
- [ ] No plaintext logging of sensitive data
- [ ] Log redaction implemented where needed
- [ ] Security events properly logged
- [ ] No sensitive data in error messages

### Authentication & Authorization
- [ ] Authentication checks implemented
- [ ] Authorization properly enforced
- [ ] Session management secure
- [ ] No privilege escalation vulnerabilities

### Data Encryption
- [ ] Sensitive data encrypted at rest
- [ ] Sensitive data encrypted in transit
- [ ] Encryption keys properly managed
- [ ] No encryption bypasses

### Privacy Compliance
- [ ] GDPR compliance maintained
- [ ] Data minimization principles followed
- [ ] User consent properly handled
- [ ] Data retention policies respected

## 🚀 Deployment
<!-- Describe deployment considerations -->

- [ ] Database migrations included (if needed)
- [ ] Environment variables documented
- [ ] Configuration changes documented
- [ ] Backward compatibility maintained

## 🔄 Rollback Plan
<!-- Describe how to rollback this change if needed -->

**Rollback Steps:**
1. 
2. 
3. 

**Rollback Impact:**
- 

## 📊 Performance Impact
<!-- Describe any performance implications -->

- [ ] No performance regression
- [ ] Performance improvements documented
- [ ] Load testing completed (if applicable)

## 🎯 Demo/Testing Links
<!-- Provide links to staging/demo environments -->

- **Staging**: 
- **Demo**: 
- **Test Results**: 

## 📝 Additional Notes
<!-- Any additional information for reviewers -->

## ✅ Pre-merge Checklist
<!-- Final checks before merging -->

- [ ] Code reviewed by at least one team member
- [ ] All CI checks passing
- [ ] Security scan passed
- [ ] No merge conflicts
- [ ] Branch is up to date with main
- [ ] Commit messages are clear and descriptive

---

## 🔍 Reviewer Guidelines

### Security Review Focus Areas
1. **Data Flow**: Trace how sensitive data flows through the system
2. **Authentication**: Verify auth checks are properly implemented
3. **Input Validation**: Ensure all inputs are validated and sanitized
4. **Error Handling**: Check that errors don't leak sensitive information
5. **Logging**: Verify no sensitive data in logs

### Privacy Review Focus Areas
1. **Data Collection**: Ensure only necessary data is collected
2. **Data Processing**: Verify lawful basis for processing
3. **Data Sharing**: Check if data is shared with third parties
4. **User Rights**: Ensure user rights are respected
5. **Retention**: Verify data retention policies are followed

### Code Quality Review
1. **Readability**: Code is clear and well-documented
2. **Maintainability**: Code follows established patterns
3. **Testability**: Code is properly tested
4. **Performance**: No obvious performance issues
5. **Scalability**: Solution scales appropriately

---

**⚠️ IMPORTANT**: This PR template is mandatory for all security-sensitive changes. Failure to complete the security checklist may result in PR rejection.
