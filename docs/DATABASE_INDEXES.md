# Database Indexes

This document describes all indexes in the MiPrimerApp database and their purpose.

## Performance Indexes

### Primary Keys & Unique Constraints (Auto-Indexed)
- `usuarios.id` (PK) - UUID foreign key reference
- `estados.id` (PK) - Bigint state identifier
- `favoritos(usuario_id, estado_id)` - Unique constraint ensures no duplicate favorites per user
- `sugerencias_rutas.id` (PK) - Route suggestion identifier
- `reservas.id` (PK) - Booking identifier
- `notificaciones.id` (PK) - Notification identifier
- `itinerarios.id` (PK) - Itinerary identifier
- `itinerario_items.id` (PK) - Itinerary item identifier
- `resenas.id` (PK) - Review identifier
- `historial.id` (PK) - History entry identifier
- `analytics_eventos.id` (PK) - Analytics event identifier

### Foreign Key Indexes (Auto-Created)
- `usuarios.id` → `auth.users.id` - User authentication link
- `favoritos.usuario_id` → `usuarios.id` - User favorites lookup
- `favoritos.estado_id` → `estados.id` - State favorites lookup
- `reservas.usuario_id` → `usuarios.id` - User reservations lookup
- `notificaciones.usuario_id` → `usuarios.id` - User notifications lookup
- `itinerarios.usuario_id` → `usuarios.id` - User itineraries lookup
- `itinerario_items.itinerario_id` → `itinerarios.id` - Itinerary items lookup
- `resenas.usuario_id` → `usuarios.id` - User reviews lookup
- `historial.usuario_id` → `usuarios.id` - User history lookup
- `analytics_eventos.user_id` → `usuarios.id` - Analytics user events lookup

### Custom Indexes

#### reservas_folio_unique_idx
- **Table:** `reservas`
- **Column:** `folio` (WHERE folio IS NOT NULL)
- **Type:** UNIQUE
- **Purpose:** Idempotency for payment processing. Prevents duplicate bookings with the same folio, ensuring safe retry logic.
- **Cardinality:** Low (only non-null folios)
- **Created:** Initial schema

#### idx_schema_migrations_version
- **Table:** `schema_migrations`
- **Column:** `version`
- **Type:** UNIQUE
- **Purpose:** Fast lookup of applied migrations, ensures each migration runs only once
- **Cardinality:** Low (typically < 100 migrations)
- **Created:** 20260424_120000 (init_schema)

## Row-Level Security (RLS)

All tables have RLS **enabled** to enforce data access control:

| Table | Owner Access | Public Access | Admin Access |
|-------|--------------|---------------|--------------|
| usuarios | SELECT own, UPDATE own | - | SELECT all, UPDATE all |
| estados | - | SELECT | INSERT, UPDATE, DELETE |
| favoritos | SELECT/INSERT/UPDATE/DELETE own | - | - |
| sugerencias_rutas | - | SELECT | INSERT, UPDATE, DELETE |
| reservas | SELECT own, INSERT own | - | SELECT all, UPDATE all |
| notificaciones | SELECT/INSERT/UPDATE/DELETE own | - | - |
| itinerarios | SELECT/INSERT/UPDATE/DELETE own | - | - |
| itinerario_items | SELECT/INSERT/UPDATE/DELETE own | - | - |
| resenas | INSERT own | SELECT | - |
| historial | SELECT/INSERT/UPDATE/DELETE own | - | - |
| analytics_eventos | INSERT (if user_id IS NULL or own) | INSERT (if user_id IS NULL) | SELECT all |

**Verify RLS status:** Run `supabase/rls_audit.sql` to check that all tables have RLS enabled.

## Index Size & Performance Notes

### Known High-Cardinality Queries
- Listing user's reservations: Uses `reservas(usuario_id)` FK index
- Listing user's favorites: Uses `favoritos(usuario_id)` FK index
- Checking state details: Uses `estados(id)` PK index
- Analytics reporting: Uses `analytics_eventos(user_id)` FK index

### Future Index Candidates
If performance degrades, consider these additional indexes:

```sql
-- Analytics filtering by event type
CREATE INDEX idx_analytics_eventos_event_type ON public.analytics_eventos(event_name);

-- Reservations by date range (if time-series queries needed)
CREATE INDEX idx_reservas_created_at ON public.reservas(created_at DESC);

-- Favorites sorting by recency
CREATE INDEX idx_favoritos_created_at ON public.favoritos(created_at DESC);

-- Reviews by destination
CREATE INDEX idx_resenas_destino ON public.resenas(destino);
```

## Maintenance Guidelines

1. **Monitor index bloat:** Use `pg_stat_user_indexes` view to check unused indexes
2. **ANALYZE regularly:** Keep statistics up-to-date for query planner
3. **REINDEX if needed:** Rebuild indexes if they become fragmented
4. **Unique indexes:** Ensure idempotency patterns (like `folio` index) prevent duplicate data

## Query Planning

Always use `EXPLAIN ANALYZE` before deploying queries that join multiple tables:

```sql
-- Example: Find user's reservations with destination details
EXPLAIN ANALYZE
SELECT r.*, e.nombre, e.categoria
FROM reservas r
JOIN estados e ON r.destino = e.nombre
WHERE r.usuario_id = 'user-uuid'
ORDER BY r.created_at DESC;
```

This helps the query planner use the right indexes and avoid full table scans.
