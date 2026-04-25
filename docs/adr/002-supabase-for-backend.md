# ADR-002: Supabase for Backend

**Status:** Accepted

**Date:** 2026-01-20

**Author:** Eder

## Context

We needed a backend solution for:
- User authentication
- Database (PostgreSQL for relational data)
- File storage (images, documents)
- Real-time updates
- Edge functions for business logic (payments, notifications)
- Minimal DevOps overhead

Key constraints:
- Limited DevOps resources
- Need for rapid development iteration
- Geographic distribution (Mexico-based users)
- Cost-effective scaling

## Decision

We chose **Supabase** (open-source Firebase alternative) as our Backend-as-a-Service (BaaS).

## Rationale

### Why Supabase?

1. **PostgreSQL Database**
   - Powerful relational database vs Firebase's NoSQL model
   - Better for complex queries (itineraries, pricing calculations)
   - Row-Level Security (RLS) for fine-grained access control

2. **Built-in Authentication**
   - OAuth providers (Google, GitHub, etc.)
   - Magic link authentication
   - Session management
   - Role-based access control

3. **Real-time Capabilities**
   - WebSocket-based real-time subscriptions
   - Instant updates for booking status, notifications
   - Built-in broadcast for cross-client communication

4. **Edge Functions**
   - Serverless functions for complex operations (MercadoPago payments)
   - Can be written in TypeScript/JavaScript
   - No infrastructure management needed

5. **Storage**
   - Object storage for images, documents
   - CDN-backed for global distribution
   - Integrated with database via foreign keys

6. **Developer Experience**
   - JavaScript/TypeScript client library
   - Rapid iteration without infrastructure setup
   - Easy local development with Docker

### Alternative Approaches

- **Firebase**: Simpler API but NoSQL constraints, worse for complex relationships
- **AWS (RDS + Lambda + S3)**: Maximum flexibility but requires DevOps expertise
- **Custom backend (Node + Postgres)**: Full control but maintenance burden

## Consequences

### Positive

✅ **No DevOps needed** - Supabase handles infrastructure, updates, scaling
✅ **RLS security** - Row-level security replaces need for complex authorization
✅ **Real-time updates** - Live features like booking status updates work out-of-box
✅ **Type-safe SDK** - TypeScript client auto-generates types from schema
✅ **Rapid prototyping** - Database schema changes reflect immediately
✅ **Cost-effective** - Pay only for usage; generous free tier for MVP

### Negative

❌ **Vendor lock-in** - Built on PostgreSQL but Supabase-specific features limit migration
❌ **Cost scaling** - Can become expensive at high usage
❌ **Limited regional control** - Data residency options limited
❌ **Cold starts** - Edge functions may have latency
❌ **Query complexity** - Some advanced PostgreSQL features require raw SQL

## Workarounds & Mitigations

- **Vendor lock-in**: Use standard PostgreSQL patterns; open-source alternative exists
- **Cost**: Monitor usage, optimize queries, use caching strategies
- **Latency**: Cache results in client, implement optimistic updates
- **Complex queries**: Use prepared functions and views for performance

## Related ADRs

- None yet

## References

- [Supabase Documentation](https://supabase.com/docs)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [Row-Level Security Guide](https://supabase.com/docs/guides/auth/row-level-security)
- [Edge Functions](https://supabase.com/docs/guides/functions)

## Review History

- **2026-01-20**: Decision accepted by team
- **2026-02-15**: Confirmed stable during payment integration phase
