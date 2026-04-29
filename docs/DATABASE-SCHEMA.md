# Database Schema

Complete Entity-Relationship Diagram (ERD) and table documentation for Mercursión.

## ERD (Entity Relationship Diagram)

```
┌─────────────────┐
│   auth.users    │
│  (Supabase)     │
├─────────────────┤
│ id (UUID)       │
│ email           │
│ phone           │
│ created_at      │
└────────┬────────┘
         │
         ├───────────────────┬───────────────────┬──────────────┐
         │                   │                   │              │
    ┌────▼──────────┐  ┌──────▼─────────┐  ┌─────▼───────┐  ┌─▼─────────────┐
    │    bookings   │  │    favorites   │  │   reviews   │  │    roles      │
    ├───────────────┤  ├────────────────┤  ├─────────────┤  ├───────────────┤
    │ id (UUID)     │  │ id (UUID)      │  │ id (UUID)   │  │ id (UUID)     │
    │ user_id ──────┼──┼─ user_id ──────┼──┼ user_id ────┼──┼─ user_id ──── ┤
    │ trip_id       │  │ trip_id        │  │ trip_id     │  │ role          │
    │ status        │  │ created_at     │  │ rating      │  │ created_at    │
    │ payment_status│  └────────────────┘  │ comment     │  └───────────────┘
    │ total_price   │                      │ created_at  │
    │ created_at    │                      └──────┬──────┘
    └────┬──────────┘                             │
         │                                        │
         └────────────────┬──────────────────────┘
                          │
                    ┌─────▼──────────┐
                    │     trips      │
                    ├────────────────┤
                    │ id (UUID)      │
                    │ name           │
                    │ description    │
                    │ state          │
                    │ location       │
                    │ image_url      │
                    │ price_per_person
                    │ duration_days  │
                    │ max_participants
                    │ created_at     │
                    │ updated_at     │
                    └────────────────┘
```

## Core Tables

### users (auth.users)

**Managed by Supabase Authentication** - Do not modify directly

```sql
CREATE TABLE auth.users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text UNIQUE NOT NULL,
  phone text,
  encrypted_password text,
  email_confirmed_at timestamptz,
  last_sign_in_at timestamptz,
  created_at timestamptz DEFAULT NOW(),
  updated_at timestamptz DEFAULT NOW()
);
```

**RLS Policies:**
- Each user can view only their own row
- Auth system manages all access

---

### trips

Public travel packages available for booking.

```sql
CREATE TABLE public.trips (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  state text NOT NULL,
  location geometry(POINT, 4326),
  image_url text,
  price_per_person integer NOT NULL, -- In cents (e.g., 5000 = $50)
  duration_days integer NOT NULL,
  max_participants integer,
  slug text UNIQUE,
  public boolean DEFAULT true,
  created_at timestamptz DEFAULT NOW(),
  updated_at timestamptz DEFAULT NOW()
);

CREATE INDEX idx_trips_state ON trips(state);
CREATE INDEX idx_trips_public ON trips(public);
CREATE INDEX idx_trips_location ON trips USING GIST(location);
```

**Mexican States (32):**
```
Aguascalientes, Baja California, Baja California Sur, Campeche,
Chiapas, Chihuahua, CDMX, Coahuila, Colima, Durango, Guanajuato,
Guerrero, Hidalgo, Jalisco, México, Michoacán, Morelos, Nayarit,
Nuevo León, Oaxaca, Puebla, Querétaro, Quintana Roo, San Luis Potosí,
Sinaloa, Sonora, Tabasco, Tamaulipas, Tlaxcala, Veracruz, Yucatán, Zacatecas
```

**RLS Policies:**
```sql
-- Anyone can read public trips
CREATE POLICY "public_trips_select" ON trips
  FOR SELECT USING (public = true);
```

---

### bookings

User reservations for trips.

```sql
CREATE TABLE public.bookings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  trip_id uuid NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  booking_date date NOT NULL,
  num_participants integer NOT NULL CHECK (num_participants > 0),
  total_price integer NOT NULL, -- In cents
  payment_status text DEFAULT 'pending'
    CHECK (payment_status IN ('pending', 'completed', 'failed', 'refunded')),
  status text DEFAULT 'confirmed'
    CHECK (status IN ('confirmed', 'cancelled')),
  payment_reference_id text,
  notes text,
  created_at timestamptz DEFAULT NOW(),
  updated_at timestamptz DEFAULT NOW()
);

CREATE INDEX idx_bookings_user_id ON bookings(user_id);
CREATE INDEX idx_bookings_trip_id ON bookings(trip_id);
CREATE INDEX idx_bookings_payment_status ON bookings(payment_status);
```

**RLS Policies:**
```sql
-- Users can only view their own bookings
CREATE POLICY "users_bookings_select" ON bookings
  FOR SELECT USING (auth.uid() = user_id);

-- Users can insert their own bookings
CREATE POLICY "users_bookings_insert" ON bookings
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can update their own non-completed bookings
CREATE POLICY "users_bookings_update" ON bookings
  FOR UPDATE USING (
    auth.uid() = user_id
    AND status != 'cancelled'
  );
```

---

### favorites

Saved trips by user.

```sql
CREATE TABLE public.favorites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  trip_id uuid NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT NOW(),
  UNIQUE(user_id, trip_id)
);

CREATE INDEX idx_favorites_user_id ON favorites(user_id);
```

**RLS Policies:**
```sql
-- Users can only manage their own favorites
CREATE POLICY "users_favorites" ON favorites
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
```

---

### reviews

Trip ratings and feedback.

```sql
CREATE TABLE public.reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  trip_id uuid NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  rating integer NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment text,
  helpful_count integer DEFAULT 0,
  created_at timestamptz DEFAULT NOW(),
  updated_at timestamptz DEFAULT NOW()
);

CREATE INDEX idx_reviews_trip_id ON reviews(trip_id);
CREATE INDEX idx_reviews_user_id ON reviews(user_id);
CREATE INDEX idx_reviews_rating ON reviews(rating);
```

**RLS Policies:**
```sql
-- Anyone can read published reviews
CREATE POLICY "reviews_select_public" ON reviews
  FOR SELECT USING (true);

-- Users can create reviews
CREATE POLICY "reviews_insert" ON reviews
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can update/delete their own reviews
CREATE POLICY "reviews_update_own" ON reviews
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "reviews_delete_own" ON reviews
  FOR DELETE USING (auth.uid() = user_id);
```

---

### roles

User roles and permissions.

```sql
CREATE TABLE public.roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL
    CHECK (role IN ('user', 'admin', 'moderator')),
  created_at timestamptz DEFAULT NOW(),
  UNIQUE(user_id, role)
);

CREATE INDEX idx_roles_user_id ON roles(user_id);
CREATE INDEX idx_roles_role ON roles(role);
```

**RLS Policies:**
```sql
-- Only admins can read/modify roles
CREATE POLICY "admin_roles" ON roles
  USING (
    EXISTS (
      SELECT 1 FROM roles r
      WHERE r.user_id = auth.uid()
      AND r.role = 'admin'
    )
  );
```

---

## Data Types

### Currency
All prices stored as **integers in cents** (MXN).
- Example: 50000 = $500.00 MXN
- Avoids floating-point precision issues

### Location
GPS coordinates stored as **geometry(POINT, 4326)**
- POINT(longitude, latitude)
- SRID 4326 = WGS 84 (standard GPS)
- Enables geographic queries

### Status Enums
Implemented as **text CHECK constraints** (not PostgreSQL enums for flexibility)
- payment_status: 'pending', 'completed', 'failed', 'refunded'
- status: 'confirmed', 'cancelled'
- role: 'user', 'admin', 'moderator'

---

## Key Constraints

### Foreign Keys
- `bookings.user_id` → `auth.users.id` (ON DELETE CASCADE)
- `bookings.trip_id` → `trips.id` (ON DELETE CASCADE)
- `reviews.user_id` → `auth.users.id` (ON DELETE CASCADE)
- `reviews.trip_id` → `trips.id` (ON DELETE CASCADE)
- `favorites.user_id` → `auth.users.id` (ON DELETE CASCADE)
- `favorites.trip_id` → `trips.id` (ON DELETE CASCADE)
- `roles.user_id` → `auth.users.id` (ON DELETE CASCADE)

### Unique Constraints
- `auth.users.email` - No duplicate emails
- `trips.slug` - Unique URL slug per trip
- `favorites(user_id, trip_id)` - User can't favorite trip twice

---

## Indexes

| Table | Column | Type | Purpose |
|-------|--------|------|---------|
| trips | state | B-tree | Filter by state |
| trips | public | B-tree | Filter public trips |
| trips | location | GIST | Geographic queries |
| bookings | user_id | B-tree | Get user's bookings |
| bookings | trip_id | B-tree | Get bookings for trip |
| bookings | payment_status | B-tree | Find pending payments |
| favorites | user_id | B-tree | Get user's favorites |
| reviews | trip_id | B-tree | Get trip reviews |
| reviews | user_id | B-tree | Get user's reviews |
| reviews | rating | B-tree | Find high-rated trips |
| roles | user_id | B-tree | Get user's roles |
| roles | role | B-tree | Find admins |

---

## Common Queries

### Get all trips in a state with user rating
```sql
SELECT 
  t.id, t.name, t.state, t.price_per_person,
  AVG(r.rating) as avg_rating,
  COUNT(b.id) as booking_count
FROM trips t
LEFT JOIN reviews r ON t.id = r.trip_id
LEFT JOIN bookings b ON t.id = b.trip_id
WHERE t.state = 'Quintana Roo' AND t.public = true
GROUP BY t.id
ORDER BY avg_rating DESC;
```

### Get user's bookings with trip details
```sql
SELECT 
  b.id, b.booking_date, b.num_participants, b.total_price,
  t.name, t.state, t.duration_days,
  COUNT(r.id) as review_count
FROM bookings b
JOIN trips t ON b.trip_id = t.id
LEFT JOIN reviews r ON b.trip_id = r.trip_id AND b.user_id = r.user_id
WHERE b.user_id = $1
ORDER BY b.booking_date DESC;
```

### Find trips near geographic location
```sql
SELECT id, name, state,
  ST_Distance(location, ST_GeomFromText('POINT(-87.0 21.0)', 4326)) as distance_meters
FROM trips
WHERE ST_Distance(location, ST_GeomFromText('POINT(-87.0 21.0)', 4326)) < 50000
ORDER BY distance_meters;
```

---

## Migrations

Migrations are version-controlled in `supabase/migrations/` directory.

Run locally:
```bash
supabase migration new create_initial_schema
# Edit generated file
supabase db push
```

Deploy to production:
```bash
supabase db push --linked
```

---

## Related Documentation

- [API Reference](./API-REFERENCE.md)
- [Supabase Docs](https://supabase.com/docs/guides/database)
- [PostgreSQL Docs](https://www.postgresql.org/docs/)
- [Row-Level Security](https://supabase.com/docs/guides/auth/row-level-security)

---

**Last Updated**: 2026-04-24  
**Version**: 1.0
