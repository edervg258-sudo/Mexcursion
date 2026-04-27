# ADR-003: Expo Router for File-Based Navigation

**Status:** Accepted

**Date:** 2026-01-25

**Author:** Eder

## Context

We needed a navigation solution that:
- Provides consistent routing across iOS, Android, and web
- Supports deep linking (open specific screens from URLs, push notifications)
- Enables code sharing between web and mobile
- Reduces boilerplate vs traditional navigation libraries

## Decision

We chose **Expo Router** - a file-based routing library similar to Next.js but for React Native.

## Rationale

### Why Expo Router?

1. **File-Based Routing**
   - No manual route registration needed
   - Directory structure mirrors app navigation
   - More familiar to web developers using Next.js

2. **Native URL Support**
   - Deep linking out-of-the-box for mobile
   - Web URLs work naturally (no custom route handling)
   - Universal routing across all platforms

3. **Type Safety**
   - Built-in TypeScript support
   - Type-safe route params and queries
   - Catch-all routes for fallbacks

4. **Tab Navigation**
   - Native tab bars (bottom tabs) with file-based layout
   - Code colocation with segments

## Consequences

### Positive

✅ Web and mobile use same routing structure
✅ Deep linking works automatically
✅ Familiar to Next.js developers
✅ Less boilerplate than React Navigation alone
✅ File structure clearly shows app structure

### Negative

❌ Newer project (vs established React Navigation)
❌ Less extensive customization options
❌ Documentation smaller than React Navigation

## Related ADRs

- ADR-001: React Native over Flutter - enables web-mobile code sharing

## References

- [Expo Router Documentation](https://docs.expo.dev/routing/introduction/)
