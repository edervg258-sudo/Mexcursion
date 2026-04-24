# Security Testing Guide

Comprehensive guide for testing and validating security measures in MiPrimerApp.

## OWASP Validation Tests

Unit tests for all input validators are in `lib/__tests__/validation.test.ts`.

### Running Validation Tests

```bash
# Run all validation tests
npm test lib/__tests__/validation.test.ts

# Run with coverage
npm run test:coverage -- lib/__tests__/validation.test.ts

# Watch mode for development
npm run test:watch -- lib/__tests__/validation.test.ts
```

### Test Coverage

Validates rejection of:
- **XSS Payloads**: `<script>`, `<img onerror=`, event handlers
- **SQL Injection**: `'; DROP TABLE`, `' OR '1'='1`
- **Command Injection**: Shell commands, path traversal
- **LDAP Injection**: `*)(|`, LDAP filter bypass
- **Path Traversal**: `../`, `..\\`, null bytes
- **File Upload Attacks**: Executable extensions (.exe, .bat, etc.)
- **URL Attacks**: `javascript:`, `data:` protocols, open redirects

### Input Types Tested

1. **Email**: Regex pattern + special character rejection
2. **Phone**: Length validation + numeric filtering
3. **Username**: Alphanumeric + underscore only
4. **Password**: Minimum length + null byte rejection
5. **Text Input**: HTML tag stripping + event handler removal
6. **File Paths**: Path traversal prevention
7. **URLs**: Protocol validation + redirect safety

## Security E2E Tests

End-to-end security tests using Detox are in `e2e/security.e2e.js`.

### Running E2E Security Tests

```bash
# Build E2E app
npm run build:e2e

# Run security tests
npm run test:e2e

# Run with specific test filter
npm run test:e2e -- --testNamePattern="XSS"
```

### Environment Variables Required

```bash
# For E2E tests to run login flows
export E2E_TEST_EMAIL="test@example.com"
export E2E_TEST_PASSWORD="password123"
```

### E2E Test Scenarios

#### XSS Prevention
- Verify XSS payloads in favorite names don't execute
- Verify HTML in review comments is escaped
- Verify script tags in comments are sanitized
- Verify event handlers are removed

#### SQL Injection Prevention
- Test `' OR '1'='1` in search doesn't bypass filters
- Test `'; DROP TABLE` in category filter is safe
- Verify results are properly filtered, not all data returned

#### Auth Bypass Prevention
- Verify unauthenticated access redirects to login
- Verify tampered tokens are rejected
- Verify session expiration works

#### CSRF Protection
- Verify state-changing requests require proper auth
- Verify Supabase RLS policies enforce ownership
- Verify unauthorized users can't modify others' data

#### Rate Limiting
- Test rapid repeated requests (50+ per second)
- Verify graceful error messages
- Verify no DoS vulnerability

#### Input Length Limits
- Test 10,000 character review submissions
- Verify app truncates or rejects safely
- Verify no crash or buffer overflow

#### Error Message Disclosure
- Test invalid login attempts
- Verify generic error messages (not "Email not found")
- Verify no internal error details leaked

## CI/CD Integration

Security tests run automatically:

```yaml
# In .github/workflows/ci-cd.yml

jobs:
  test:
    steps:
      - name: Run validation tests
        run: npm test lib/__tests__/validation.test.ts -- --coverage

      - name: Run linting
        run: npm run lint  # Includes security rules

      - name: Type check
        run: npx tsc --noEmit
```

## Manual Security Checks

### Code Review Checklist

Before merging PR, verify:
- [ ] No `dangerouslySetInnerHTML` usage
- [ ] No `eval()` or `Function()` constructor calls
- [ ] No hardcoded secrets (API keys, tokens)
- [ ] Input sanitization on user-provided data
- [ ] Proper error handling without information disclosure
- [ ] No console.log of sensitive data
- [ ] RLS policies cover new tables
- [ ] No SQL string concatenation (use parameterized queries)

### Lint & ESLint Security Rules

```bash
# Check for security issues
npm run lint

# ESLint will catch:
- eval() usage → error
- Function() constructor → error
- dangerouslySetInnerHTML → already good in code
- Hardcoded secrets (regex pattern) → warn
```

### Static Analysis (Optional)

To add Snyk (optional, high-impact):

```bash
# Install Snyk CLI
npm install -g snyk

# Test for vulnerabilities
snyk test

# Fix vulnerabilities
snyk fix
```

## Dependency Vulnerability Scanning

npm audit runs automatically in CI, but you can also:

```bash
# Check for vulnerable dependencies locally
npm audit

# Fix automatically (if possible)
npm audit fix

# Fix with caution (may break things)
npm audit fix --force
```

## Testing Sensitive Flows

### Payment Security

Test payment processing with:
- **Test Cards** (from MercadoPago): 4111 1111 1111 1111
- **Test Mode**: Set `EXPO_PUBLIC_MERCADOPAGO_PUBLIC_KEY` to TEST key
- **Idempotency**: Verify duplicate payments with same `folio` fail safely

```bash
# Verify payment endpoint
# 1. Create booking with folio "TEST-001"
# 2. Submit payment with folio "TEST-001" → succeeds
# 3. Submit again with folio "TEST-001" → fails (folio unique constraint)
```

### Authentication & Session

Test auth security with:

```bash
# Test password validation
# Attempt password < 6 chars → rejected

# Test session expiration
# Login, wait for token timeout (24h), attempt action → redirect to login

# Test logout
# Logout, attempt to access protected route → redirect to login

# Test RLS enforcement
# Login as user A, try to access user B's reservations via API → error (RLS blocks)
```

## Monitoring & Incident Response

### Sentry Monitoring

Errors are tracked in Sentry. Check for:
- Unexpected 403 errors (possible auth bypass attempts)
- 400 errors with injection patterns (possible attacks)
- Repeated failed auth attempts from same IP
- Rate limit errors (possible DoS)

```bash
# Check Sentry dashboard for:
# 1. Error patterns suggesting attacks
# 2. Unusual error rates
# 3. New error types (possible vulnerability)
```

### Log Analysis

In Supabase Dashboard → Logs:
- Filter by slow queries (possible DoS)
- Check for unusual table access patterns
- Monitor auth failure rates

## Performance Impact of Security

Security measures have small performance costs:

| Feature | Impact | Mitigation |
|---------|--------|-----------|
| RLS policies | ~5-10ms per query | Cache results when possible |
| Input validation | ~1-2ms per submit | Validate on client + server |
| Rate limiting | ~0-5ms per request | Implement at API gateway |
| HTTPS/TLS | ~50-100ms initial | Negligible after handshake |

## Future Security Improvements

- [ ] Add Content Security Policy (CSP) headers
- [ ] Implement CORS properly for web version
- [ ] Add brute force protection (fail2ban/rate limiting)
- [ ] Implement JWT refresh token rotation
- [ ] Add database backup encryption
- [ ] Implement secrets rotation (API keys, tokens)
- [ ] Add security headers audit (HaveIBeenPwned, etc.)
- [ ] Setup intrusion detection/response
- [ ] Add mobile app code obfuscation
- [ ] Implement certificate pinning for Android/iOS

## Resources

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [OWASP Testing Guide](https://owasp.org/www-project-web-security-testing-guide/)
- [React Native Security](https://reactnative.dev/docs/security)
- [Supabase Security](https://supabase.com/docs/guides/auth)
- [CWE Top 25](https://cwe.mitre.org/top25/)
