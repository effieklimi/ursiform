# API Key Sanitization Security Feature

## Overview

This project implements a comprehensive API key sanitization system to prevent sensitive API keys from being exposed in error messages displayed to users in the browser.

## Problem

The settings page displays error messages from API calls to OpenAI, Gemini, and database services. These error messages could potentially contain:

- Full API keys in error responses
- Bearer tokens in authorization headers
- API keys embedded in URLs (query parameters)
- Credentials in database connection strings
- Other sensitive authentication information

## Solution

### Implementation

A `sanitizeErrorMessage` function has been added to `components/settings-page.tsx` that:

1. **Detects sensitive patterns** using regex patterns for:

   - OpenAI API keys (starting with `sk-`)
   - Google/Gemini API keys (starting with `AIza`)
   - Bearer tokens
   - Authorization headers
   - API keys in URL parameters
   - Basic auth credentials in URLs
   - Long alphanumeric strings that could be keys

2. **Replaces sensitive data** with `[REDACTED]` while preserving the error context

3. **Applied automatically** to all error messages before display in:
   - API key status descriptions
   - Database connection error messages

### Code Location

```typescript
// In components/settings-page.tsx
const sanitizeErrorMessage = (errorMessage: string): string => {
  // Implementation handles various API key patterns
};

// Used in:
const getStatusDescription = (status: APIKeyStatus, error?: string) => {
  return error ? `API key failed: ${sanitizeErrorMessage(error)}` : "...";
};
```

## Security Patterns Handled

| Pattern        | Example                  | Sanitized Output       |
| -------------- | ------------------------ | ---------------------- |
| OpenAI API Key | `sk-1234567890abcdef...` | `[REDACTED]`           |
| Gemini API Key | `AIzaSyDOC...`           | `[REDACTED]`           |
| Bearer Token   | `Bearer sk-abc123...`    | `[REDACTED]`           |
| URL API Key    | `?api_key=sk-123...`     | `?api_key=[REDACTED]`  |
| Basic Auth     | `https://user:pass@host` | `https:[REDACTED]host` |
| Long Keys      | Any 32+ char string      | `[REDACTED]`           |

## Testing

### Test Suite

Run the comprehensive test suite:

```bash
node tests/integration-test.js
```

### Test Coverage

- ✅ Real API error messages from health endpoint
- ✅ Dangerous messages with various API key patterns
- ✅ Edge cases (null, undefined, empty strings)
- ✅ Multiple API keys in single message
- ✅ URL-embedded credentials
- ✅ Authorization headers

### Security Verification

The test suite verifies that no actual API keys remain in sanitized output and includes patterns for:

- OpenAI keys: `sk-[a-zA-Z0-9]{20,}`
- Gemini keys: `AIza[a-zA-Z0-9_-]{35}`
- Generic long keys: `[a-zA-Z0-9_-]{32,}`

## Usage

The sanitization is applied automatically when error messages are displayed in the settings page. No additional configuration is required.

### Example

```typescript
// Before sanitization
"API key sk-1234567890abcdef1234567890abcdef is invalid";

// After sanitization
"API key [REDACTED] is invalid";
```

## Benefits

1. **Security**: Prevents API key exposure in browser
2. **User Experience**: Maintains meaningful error messages
3. **Compliance**: Reduces risk of credential leakage
4. **Comprehensive**: Handles multiple API key formats
5. **Tested**: Full test coverage with security verification

## Maintenance

- Add new patterns to the `patterns` array in `sanitizeErrorMessage`
- Update tests when adding new API providers
- Review sanitization patterns periodically for new threats
- Monitor error logs to identify new patterns that need sanitization

## Development

To test the sanitization locally:

1. Start the development server: `npm run dev`
2. Visit `/settings` to see API key status
3. Check browser console for any exposed credentials
4. Run test suite: `node tests/integration-test.js`

The sanitization ensures that even if APIs return full credentials in error messages, users will only see safe, redacted versions in the browser interface.
