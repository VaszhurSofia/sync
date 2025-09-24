# Copy Guidelines - Single Source of Truth

## Overview
This document serves as the single source of truth for all copy, messaging, and content across the Sync platform. All UI text, error messages, and user-facing content should reference this document.

## Brand Voice & Tone

### Core Principles
- **Empathetic**: Understanding and supportive
- **Clear**: Simple, jargon-free language
- **Neutral**: Never takes sides in conflicts
- **Professional**: Respectful and appropriate
- **Inclusive**: Accessible to all users

### Tone Guidelines
- Use "you" and "your" to create connection
- Avoid clinical or therapy jargon
- Use active voice when possible
- Keep sentences concise (under 20 words)
- Use positive framing when possible

## Core Messaging

### Platform Description
**Primary**: "A safe space for couples to communicate and grow together"
**Secondary**: "Guided conversations that help partners understand each other better"

### Value Propositions
1. **Safety First**: "Your conversations are private, encrypted, and secure"
2. **Neutral Guidance**: "AI that helps without taking sides"
3. **Evidence-Based**: "Built on proven communication techniques"
4. **Accessible**: "Available whenever you need it"

## UI Copy Standards

### Authentication
- **Login**: "Sign in to your account"
- **Signup**: "Create your account"
- **Forgot Password**: "Reset your password"
- **Email Verification**: "Check your email for verification link"

### Session Management
- **Start Session**: "Begin your conversation"
- **End Session**: "Finish your conversation"
- **Your Turn**: "It's your turn to respond"
- **Waiting**: "Waiting for your partner"
- **Session Ended**: "Your conversation has ended"

### Therapist Responses
- **Mirror**: "Here's what I'm hearing:"
- **Clarify**: "It seems like this is about:"
- **Explore**: "What would it look like if:"
- **Micro Actions**: "You might try:"
- **Check**: "Does this feel accurate to both of you?"

### Survey & Feedback
- **How was your session?**: "How helpful was this conversation?"
- **Not Helpful**: "Not helpful"
- **Neutral**: "Somewhat helpful"
- **Helpful**: "Very helpful"
- **Submit**: "Send feedback"
- **Thank You**: "Thank you for sharing your feedback!"

### Safety & Boundaries
- **Boundary Detected**: "We've detected content that may need professional support"
- **Safety Resources**: "Professional help is available"
- **Emergency**: "If you're in immediate danger, call emergency services"
- **Crisis Support**: "Crisis support is available 24/7"

### Settings & Privacy
- **Language**: "Choose your language"
- **Theme**: "Select your preferred theme"
- **Notifications**: "Manage your notifications"
- **Privacy**: "Your privacy settings"
- **Data Retention**: "How long we keep your data"
- **Delete Account**: "Delete your account"

## Error Messages

### Authentication Errors
- **Invalid Credentials**: "Email or password is incorrect"
- **Account Locked**: "Your account is temporarily locked. Please try again later"
- **Email Not Verified**: "Please verify your email address to continue"

### Session Errors
- **Session Not Found**: "This conversation is no longer available"
- **Session Expired**: "This conversation has expired"
- **Access Denied**: "You don't have permission to access this conversation"
- **Partner Not Found**: "Your partner is not available"

### Network Errors
- **Connection Lost**: "Connection lost. Attempting to reconnect..."
- **Reconnection Failed**: "Unable to reconnect. Please check your internet connection"
- **Timeout**: "Request timed out. Please try again"

### Validation Errors
- **Message Too Long**: "Your message is too long. Please shorten it"
- **Message Too Short**: "Please write a longer message"
- **Invalid Content**: "This content cannot be sent"
- **Rate Limited**: "Please wait before sending another message"

## Success Messages

### Session Success
- **Session Started**: "Your conversation has begun"
- **Message Sent**: "Your message has been sent"
- **Session Ended**: "Your conversation has been saved"

### Account Success
- **Account Created**: "Your account has been created successfully"
- **Password Reset**: "Your password has been reset"
- **Settings Saved**: "Your settings have been saved"

## Accessibility Copy

### Screen Reader Announcements
- **New Message**: "New message received"
- **Typing Indicator**: "Partner is typing"
- **Connection Status**: "Connected" / "Disconnected"
- **Focus Changes**: "Focused on [element name]"

### ARIA Labels
- **Send Button**: "Send message"
- **Delete Button**: "Delete message"
- **Edit Button**: "Edit message"
- **Close Button**: "Close dialog"
- **Menu Button**: "Open menu"

## Localization Considerations

### Text Expansion
- German text is typically 20-30% longer than English
- Plan for 40% expansion in UI elements
- Use flexible layouts that accommodate longer text

### Cultural Sensitivity
- Avoid idioms and colloquialisms
- Use universal concepts and metaphors
- Consider cultural differences in communication styles
- Respect different approaches to conflict resolution

### Date & Time Formats
- **English**: MM/DD/YYYY, 12-hour format
- **German**: DD.MM.YYYY, 24-hour format
- **Universal**: ISO 8601 for data storage

## Pseudo-Localization

### Test Strings
Use these pseudo-localized strings to test UI layout:

```
English: "How was your session?"
Pseudo:  "Høw wås ÿøür sëssïøn?"
German:  "Wie war Ihre Sitzung?"
```

### Expansion Testing
```
English: "Send message"
Pseudo:  "Sënd mëssågë wïth løngër tëxt"
German:  "Nachricht senden"
```

## Content Guidelines

### Prohibited Content
- Clinical diagnoses or medical advice
- Relationship counseling recommendations
- Specific therapy techniques
- Personal opinions about relationships
- Judgmental language

### Required Content
- Safety resources and crisis support
- Privacy and data protection information
- Accessibility information
- Terms of service and privacy policy links

## Testing Checklist

### Copy Review
- [ ] All text follows brand voice guidelines
- [ ] No clinical or therapy jargon
- [ ] Consistent terminology throughout
- [ ] Appropriate tone for context
- [ ] Clear and actionable language

### Localization Testing
- [ ] Pseudo-localization applied
- [ ] Text expansion accommodated
- [ ] Cultural sensitivity reviewed
- [ ] Date/time formats correct
- [ ] RTL support if needed

### Accessibility Testing
- [ ] Screen reader announcements clear
- [ ] ARIA labels descriptive
- [ ] Focus indicators visible
- [ ] Color contrast sufficient
- [ ] Keyboard navigation works

## Maintenance

### Review Schedule
- **Monthly**: Review user feedback for copy issues
- **Quarterly**: Full copy audit and updates
- **Annually**: Complete brand voice review

### Update Process
1. Identify copy issue or improvement
2. Update this document
3. Implement changes across platform
4. Test with pseudo-localization
5. Deploy and monitor feedback

### Version Control
- Track all copy changes in version control
- Maintain change log with rationale
- Keep backup of previous versions
- Document translation updates

## Contact

For copy questions or updates:
- **Primary**: Content Team
- **Secondary**: Product Team
- **Emergency**: Legal Team (for safety/legal copy)

---

*Last updated: [Current Date]*
*Version: 1.0*
*Next review: [Next Quarter]*
