# Architecture Decision Records (ADRs)

This directory contains Architecture Decision Records (ADRs) for the Mercursión project. ADRs document major architectural decisions, including the context, trade-offs, and consequences of each decision.

## What is an ADR?

An ADR is a lightweight decision record that captures:
- **Status**: Proposed, Accepted, Deprecated, Superseded
- **Context**: Why the decision was needed
- **Decision**: What was decided
- **Consequences**: What will happen as a result

## ADR Template

```markdown
# ADR-NNN: [Decision Title]

**Status:** Accepted (or Proposed/Deprecated/Superseded)

**Date:** YYYY-MM-DD

## Context

[Explain the issue or problem that led to this decision]

## Decision

[State the architectural decision that was made]

## Rationale

[Explain why this decision was chosen over alternatives]

### Alternative Approaches

- **[Alternative A]**: [Why we didn't choose this]
- **[Alternative B]**: [Why we didn't choose this]

## Consequences

### Positive
- [Benefit 1]
- [Benefit 2]

### Negative
- [Drawback 1]
- [Drawback 2]

## Related ADRs

- ADR-XXX: [Related decision]

## References

- [Link 1]
- [Link 2]
```

## Current ADRs

| ID | Title | Status | Date |
|----|-------|--------|------|
| 001 | React Native over Flutter | Accepted | 2026-01-15 |
| 002 | Supabase for Backend | Accepted | 2026-01-20 |
| 003 | Expo Router for Navigation | Accepted | 2026-01-25 |

## How to Use

1. **Reference existing ADRs** when explaining architectural decisions
2. **Create new ADRs** for significant decisions (new services, major refactors, technology choices)
3. **Update status** when decisions change (e.g., Accepted → Deprecated)
4. **Link related ADRs** to show decision dependencies

## When to Create an ADR

Create an ADR when:
- Choosing between competing technologies or approaches
- Making a significant architectural change
- Establishing patterns that will be used widely in the codebase
- Making trade-offs that affect multiple teams or future development
- Documenting decisions made during planning or design reviews

## When NOT to Create an ADR

Don't create an ADR for:
- Minor implementation details or code refactoring
- Bug fixes or performance optimizations
- Library version updates or dependency changes (unless highly impactful)
- Process changes (use your team wiki or handbook instead)
