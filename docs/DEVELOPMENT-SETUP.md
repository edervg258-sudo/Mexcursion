# Development Setup Guide

Complete guide to setting up Mercursión for local development.

## Prerequisites

- **Node.js**: 18+ (recommended: 20 LTS)
- **npm**: 9+
- **Git**: Latest
- **Visual Studio Code** or similar IDE with TypeScript support
- **(Optional) Android Studio** for Android mobile development
- **(Optional) Xcode** for iOS mobile development (macOS only)

## Initial Setup (15 minutes)

### 1. Clone Repository

```bash
git clone https://github.com/edervg258/MiPrimerApp.git
cd MiPrimerApp
```

### 2. Install Dependencies

```bash
npm install
# or
yarn install
```

**What gets installed:**
- React Native + Expo framework
- Testing libraries (Jest, Detox)
- Build tools (TypeScript, ESLint)
- CLI tools (EAS, Supabase CLI)

### 3. Configure Environment

```bash
# Copy example environment file
cp .env.example .env

# Edit .env with your credentials
code .env
```

**Required variables:**
```bash
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJ...  # From Supabase > Settings > API
EXPO_PUBLIC_GOOGLE_MAPS_API_KEY=AIzaSy...  # From Google Cloud Console
EXPO_PUBLIC_SENTRY_DSN=https://...@sentry.io/...  # From Sentry
EXPO_PUBLIC_DEV_MODE=true
```

### 4. Start Development Server

```bash
npm start
# or
npx expo start
```

**Output:**
```
> Local:   http://localhost:8081
> LAN:    http://192.168.x.x:8081
```

## Running the App

### Web (Browser)

```bash
npm run web
# Opens http://localhost:8081 automatically
```

**Keyboard shortcuts:**
- `w` → Open web
- `a` → Open Android emulator
- `i` → Open iOS simulator
- `r` → Reload
- `m` → More options

### Android (Emulator)

**Prerequisites:**
- Android Studio installed
- AVD (Android Virtual Device) created

```bash
# Start Android emulator first
# Android Studio > Device Manager > [Device] > Play

# Then start Expo
npm start

# Press 'a' to open in Android emulator
```

**Or direct command:**
```bash
npm run android
```

### iOS (Simulator - macOS only)

**Prerequisites:**
- Xcode installed (`xcode-select --install`)
- Simulator available

```bash
npm run ios
# or
npm start
# Press 'i'
```

## Development Workflow

### Code Structure

```
src/
├── app/                 # Routes (file-based routing with Expo Router)
│   ├── (tabs)/         # Tab navigation container
│   ├── login.tsx       # Login screen
│   └── [id].tsx        # Dynamic routes
├── components/         # Reusable UI components
│   ├── BookingCard.tsx
│   ├── TripHeader.tsx
│   └── ...
├── lib/                # Business logic & utilities
│   ├── analytics.ts    # Event tracking
│   ├── supabase-db.ts  # Database queries
│   ├── validations.ts  # Input validation
│   └── ...
├── assets/             # Images, fonts, etc
└── ...
```

### Running Tests

```bash
# All tests
npm test

# Watch mode (rerun on file change)
npm run test:watch

# With coverage report
npm run test:coverage
# Opens: coverage/lcov-report/index.html

# Specific test file
npm test lib/validations.test.ts

# Specific test case
npm test -- --testNamePattern="validateEmail"
```

### Code Quality

```bash
# Type checking
npx tsc --noEmit

# Linting
npm run lint

# All checks together (used in CI)
npm run release:preflight
```

### Debugging

**VS Code Debugging:**
1. Install "Debugger for Chrome" extension
2. Create `.vscode/launch.json`:
   ```json
   {
     "version": "0.2.0",
     "configurations": [
       {
         "name": "Debug Web",
         "type": "chrome",
         "request": "attach",
         "port": 9223,
         "webRoot": "${workspaceFolder}"
       }
     ]
   }
   ```
3. Start Expo: `npm start`
4. Start debugging in VS Code

**React Native Debugger:**
```bash
# Install: https://github.com/jhen0409/react-native-debugger
# In Expo: Shake device > Debug

# Or press 'd' in terminal
```

## Advanced Setup

### Supabase Local Development

```bash
# Install Supabase CLI
npm install -g @supabase/supabase-cli

# Initialize local database
supabase init

# Run local instance
supabase start
# Runs PostgreSQL + Supabase in Docker

# Stop local instance
supabase stop
```

### Android Development

**Setup Android SDK:**
```bash
# Via Android Studio (recommended)
# Device Manager > Create Virtual Device

# Or via command line
sdkmanager "system-images;android-31;google_apis;x86_64"
avdmanager create avd -n Pixel_5_API_31 -k "system-images;android-31;google_apis;x86_64"

# Start emulator
$ANDROID_HOME/emulator/emulator -avd Pixel_5_API_31
```

**Build for Android:**
```bash
npm run android
# Builds and installs on emulator/device
```

### iOS Development

**Setup Xcode:**
```bash
# Install Xcode Command Line Tools
xcode-select --install

# Accept Xcode license
sudo xcode-select --reset
sudo xcode-select --switch /Applications/Xcode.app/Contents/Developer

# Verify setup
xcrun --version
```

**Build for iOS:**
```bash
npm run ios
# Builds and opens in iOS simulator
```

### E2E Testing

```bash
# Build E2E test app
npm run build:e2e

# Run E2E tests
npm run test:e2e

# With iOS
npm run build:e2e:ios
npm run test:e2e:ios
```

## Environment Files

### `.env.example` (Template)
- Used as template for new developers
- Contains placeholders like `your-api-key`
- Committed to repo

### `.env` (Local Development)
- Created by copying `.env.example`
- Contains YOUR actual API keys
- **Never commit this file**
- `.gitignore` prevents accidental commits

### `.env.staging` (Staging Deployment)
- Staging API keys
- Used in GitHub Actions for staging deploy
- Sensitive values stored in GitHub Secrets

### `.env.production` (Production Deployment)
- Production API keys
- Used in GitHub Actions for production deploy
- Sensitive values stored in GitHub Secrets

## IDE Configuration

### VS Code Extensions

Recommended:
- **ES7+ React/Redux/React-Native snippets** - Code snippets
- **Prettier** - Code formatter
- **ESLint** - Linter
- **Thunder Client** - API testing
- **Supabase** - Database browser

### VS Code Settings

`.vscode/settings.json`:
```json
{
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "editor.formatOnSave": true,
  "[typescript]": {
    "editor.defaultFormatter": "esbenp.prettier-vscode"
  },
  "typescript.tsdk": "node_modules/typescript/lib",
  "typescript.enablePromptUseWorkspaceTsdk": true
}
```

## Common Issues

### Port 8081 Already in Use

```bash
# Kill process using port
lsof -i :8081 | grep LISTEN | awk '{print $2}' | xargs kill -9

# Or use different port
npx expo start --port 8090
```

### Module Not Found Error

```bash
# Clear cache and reinstall
npm ci
npx expo start --clear
```

### TypeScript Errors

```bash
# Check all TypeScript errors
npx tsc --noEmit

# Enable strict mode to catch issues early
# tsconfig.json has "strict": true
```

### Android Emulator Slow

```bash
# Use hardware acceleration
$ANDROID_HOME/emulator/emulator -avd Pixel_5_API_31 -accel on

# Use API 31+ (newer Android versions are faster)
```

## Useful Commands Reference

```bash
# Development
npm start                 # Start Expo dev server
npm run web              # Run in browser
npm run android          # Build and run on Android
npm run ios              # Build and run on iOS

# Testing
npm test                 # Run unit tests
npm test:watch          # Run in watch mode
npm test:coverage       # Generate coverage report
npm run test:e2e        # Run E2E tests

# Code Quality
npm run lint             # Check code style
npx tsc --noEmit        # Check TypeScript
npm run release:preflight # Full pre-release checks

# Building
npm run build:web       # Build for web production
npm run build:e2e       # Build E2E test app

# Utility
npm run reset-project   # Reset to default state
```

## Getting Help

- **Docs**: See `docs/` directory
- **Issues**: GitHub > Issues
- **Discord**: Join community
- **Stack Overflow**: Tag with `react-native` + `expo`

---

**Last Updated**: 2026-04-24  
**Version**: 1.0
