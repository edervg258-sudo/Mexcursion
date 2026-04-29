# ADR-001: React Native over Flutter

**Status:** Accepted

**Date:** 2026-01-15

**Author:** Eder

## Context

When starting the Mercursión project, we needed to choose a cross-platform mobile framework to build an iOS and Android travel/booking application for the Mexican market. Two main contenders were:

1. **React Native** - Meta's JavaScript-based framework, strong ecosystem
2. **Flutter** - Google's Dart-based framework, growing adoption

Key requirements were:
- Fast iteration and prototype delivery
- Ability to hire JavaScript developers (more abundant than Dart developers)
- Strong web support (Expo can export to web)
- Access to native modules and third-party integrations
- Active community and library ecosystem

## Decision

We chose **React Native with Expo** as our primary framework.

### Specific Constraints

- Use **Expo-managed workflow** for maximum code sharing between web and mobile
- Avoid unnecessary native modules; prefer Expo-compatible libraries
- Leverage Expo's web export to maintain single codebase for iOS, Android, and web
- Use **TypeScript** for type safety and better developer experience

## Rationale

### Why React Native?

1. **JavaScript Ecosystem**: React Native leverages JavaScript and React, which have:
   - Much larger developer pool in the market
   - More third-party integrations (payments, analytics, maps)
   - Faster iteration and fewer breaking changes

2. **Expo Platform**: Expo provides:
   - Zero-config development and deployment
   - Web export capability (crucial for MVP with limited resources)
   - Built-in features: push notifications, file storage, camera, maps
   - Managed CI/CD for app store submissions
   - Fast development loop with live reload

3. **Code Sharing**: Single codebase for web + mobile (iOS/Android) reduces:
   - Development time
   - Maintenance burden
   - Testing complexity

4. **Community & Ecosystem**:
   - React Native has 100k+ GitHub stars
   - Massive community support and libraries
   - Better integration with common services (Supabase, Firebase)

### Alternative Approaches

- **Flutter**: Strong performance, hot reload, growing ecosystem, but:
  - Dart language less familiar to JavaScript developers
  - Web support was experimental (limited at time of decision)
  - Smaller third-party library ecosystem
  - Harder to find experienced Dart developers

- **Native iOS/Android**: Maximum performance but:
  - Massive effort duplication (2 codebases)
  - Slower iteration
  - Much higher maintenance cost

## Consequences

### Positive

✅ **Fast MVP delivery** - Expo's managed workflow enabled rapid prototyping
✅ **Single codebase** - iOS, Android, and web from one TypeScript codebase
✅ **Easy hiring** - JavaScript developers are abundant and familiar with React
✅ **Rich ecosystem** - Access to thousands of npm packages and React Native libraries
✅ **Web compatibility** - Free web version enables desktop/progressive web access
✅ **Hot reload** - Fast feedback loop improves developer productivity
✅ **Built-in tools** - Expo provides analytics, push notifications, file storage out-of-box

### Negative

❌ **Performance tradeoffs** - React Native can't match native app performance in demanding scenarios
❌ **Limited hardware access** - Some advanced device features require native modules
❌ **JavaScript runtime overhead** - Startup time slower than native apps
❌ **Bridge limitations** - Native-JS bridge can become bottleneck for heavy computations
❌ **Library fragmentation** - Some libraries have maintenance issues or platform inconsistencies

## Workarounds & Mitigations

- **Performance**: Use FlatList optimization presets, lazy loading, and code splitting
- **Native features**: Leverage Expo's extensive library (maps, notifications, camera, sensors)
- **Advanced needs**: Use development builds with native modules when necessary
- **Testing**: E2E testing with Detox ensures cross-platform consistency

## Related ADRs

- ADR-003: Expo Router for Navigation - follows from this decision for consistent routing

## References

- [React Native Official](https://reactnative.dev/)
- [Expo Documentation](https://docs.expo.dev/)
- [Expo for Web](https://docs.expo.dev/basics/web/)
- [React Native + TypeScript](https://www.typescriptlang.org/)

## Review History

- **2026-01-15**: Decision accepted by team
- **2026-02-10**: Confirmed effective during Phase 1 implementation
