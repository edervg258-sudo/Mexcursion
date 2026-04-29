# Contributing to Mercursión

Thank you for your interest in contributing to Mercursión! This document provides guidelines for contributing code, documentation, and bug reports.

## Quick Start

### Prerequisites

- Node.js 18+
- npm or yarn
- Git
- Basic familiarity with React/React Native
- (Optional) Android Studio / Xcode for mobile development

### Development Setup

```bash
# Clone the repository
git clone https://github.com/edervg258/MiPrimerApp.git
cd MiPrimerApp

# Install dependencies
npm install

# Configure environment
cp .env.example .env
# Edit .env with your development API keys

# Start development server
npm start
```

### Running the App Locally

```bash
# Web (http://localhost:8081)
npm run web

# Android
npm run android

# iOS
npm run ios
```

### Running Tests

```bash
# Unit tests
npm test

# Watch mode
npm run test:watch

# With coverage
npm run test:coverage

# E2E tests (Android)
npm run build:e2e && npm run test:e2e

# E2E tests (iOS)
npm run build:e2e:ios && npm run test:e2e:ios
```

## Code Style & Standards

### TypeScript

- **Strict mode required**: `tsconfig.json` enforces `strict: true`
- All components and functions must have TypeScript types
- Avoid `any` types; use generics if needed

```typescript
// ✅ Good
interface Props {
  title: string;
  onPress: () => void;
}

export function Button({ title, onPress }: Props) {
  return <TouchableOpacity onPress={onPress}>{title}</TouchableOpacity>;
}

// ❌ Bad
export function Button(props: any) {
  // ...
}
```

### ESLint & Formatting

```bash
# Check code style
npm run lint

# ESLint config is in `.eslintrc.js`
```

We follow Expo's ESLint configuration. Key rules:
- No unused variables
- No console.log() in production code (use logEvent() for analytics)
- Consistent naming conventions (camelCase for variables/functions, PascalCase for components)

### Component Structure

```typescript
// 1. Imports
import React from 'react';
import { View, Text } from 'react-native';

// 2. Types
interface Props {
  title: string;
  count: number;
}

// 3. Component
export function Counter({ title, count }: Props) {
  // Implementation
}

// 4. Exports
export default Counter;
```

### File Naming

- **Components**: PascalCase (e.g., `BookingCard.tsx`)
- **Utilities**: camelCase (e.g., `validateEmail.ts`)
- **Tests**: `.test.ts` or `.test.tsx` suffix
- **Styles**: Follow component name (e.g., `BookingCard.styles.ts`)

## Git Workflow

### Branch Naming

```
feature/feature-name          # New features
bugfix/bug-description        # Bug fixes
refactor/what-changed         # Refactoring
docs/documentation-topic      # Documentation
chore/maintenance-task        # Chores (deps, config)
```

### Commit Messages

Follow Conventional Commits:

```
type(scope): subject

body

footer
```

**Types**: `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `chore`

**Examples:**

```
feat(booking): add payment method selection screen

- Add simulated payment method options
- Implement OXXO cash payment flow
- Add payment method validation

Closes #123
```

```
fix(auth): fix token refresh on app resume

- Reset token refresh timeout when app resumes from background
- Add retry logic for failed token refresh

Fixes #456
```

### Pull Request Process

1. **Create a branch** from `main` or `develop`
   ```bash
   git checkout -b feature/my-feature
   ```

2. **Make changes** and commit with clear messages

3. **Push to GitHub**
   ```bash
   git push origin feature/my-feature
   ```

4. **Open a Pull Request**
   - Use the PR template
   - Link related issues
   - Describe changes and testing performed

5. **PR Checklist**
   - [ ] Tests added/updated for new code
   - [ ] All tests pass (`npm run release:preflight`)
   - [ ] Linting passes (`npm run lint`)
   - [ ] TypeScript compiles (`npx tsc --noEmit`)
   - [ ] Documentation updated if applicable
   - [ ] No `console.log()` or debug code left in
   - [ ] Branch is up to date with `main`/`develop`

6. **Code Review**
   - Respond to reviewer feedback
   - Re-request review after changes
   - Merge once approved

### Branching Strategy

```
main (production)
  ├─ v0.2.0 (release branch)
  │
develop (staging)
  ├─ feature/payment-retry (feature branch)
  ├─ bugfix/auth-token (bug fix branch)
  └─ docs/api-reference (docs branch)
```

**Rules:**
- `main`: Always deployable, tagged with versions
- `develop`: Staging branch, receives PRs from feature branches
- Feature branches: Short-lived, created from `develop`

## Testing Requirements

### Unit Tests

Write tests for:
- Business logic (validations, calculations, transformations)
- Utility functions
- Custom hooks
- Error handling

```typescript
// lib/validations.test.ts
describe('validateEmail', () => {
  it('should accept valid emails', () => {
    expect(validateEmail('user@example.com')).toBe(true);
  });

  it('should reject invalid emails', () => {
    expect(validateEmail('invalid')).toBe(false);
  });
});
```

### E2E Tests

Write E2E tests for critical user flows:
- User registration and login
- Booking creation and payment
- Search and filtering

```typescript
// e2e/booking-flow.e2e.ts
describe('Booking Flow', () => {
  it('should complete end-to-end booking', async () => {
    await element(by.id('login-screen')).tap();
    // ... steps
  });
});
```

### Coverage Goals

- **Target**: Minimum 60% coverage for lib/ directory
- **Critical paths**: 90%+ coverage for payments, auth, bookings
- Check coverage:
  ```bash
  npm run test:coverage
  open coverage/lcov-report/index.html  # View in browser
  ```

## Documentation

### When to Update Docs

- New features → Update README or create new doc
- API changes → Update API-REFERENCE.md
- Architecture decisions → Create ADR in docs/adr/
- Deployment procedures → Update RAILWAY-DEPLOYMENT.md
- Incidents → Create/update runbooks in docs/runbooks/

### Documentation Style

- Use clear, concise language
- Include code examples where helpful
- Keep docs up-to-date with code
- Link to related documents
- Use headers to organize content

## Reporting Issues

### Bug Reports

Include:
- Steps to reproduce
- Expected behavior
- Actual behavior
- Device/platform information
- Screenshots/videos if applicable

### Feature Requests

Include:
- Problem statement
- Proposed solution
- Alternative approaches considered
- Use cases

## Security

- Never commit `.env` files or secrets
- Report security vulnerabilities privately
- Use `npm audit` to check dependencies
- Enable CodeQL scanning for vulnerabilities

## Code Review Checklist (for Reviewers)

- [ ] Code follows style guide
- [ ] Tests added and passing
- [ ] No security vulnerabilities
- [ ] No hardcoded secrets
- [ ] Performance implications considered
- [ ] Documentation updated if needed
- [ ] Commit messages are clear

## Getting Help

- **Questions**: Open a discussion in GitHub
- **Bugs**: Create an issue with reproduction steps
- **Security**: Email security@mercursion.com (if applicable)
- **Chat**: Join our Discord community

## License

By contributing, you agree that your contributions will be licensed under the MIT License.

---

Thank you for helping make Mercursión better! 🚀
