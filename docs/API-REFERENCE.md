# API Reference

Complete reference for Mercursión's Supabase schema, Edge Functions, and authentication.

## Database Tables

### Users (auth.users)

Managed by Supabase Auth.

| Column | Type | Notes |
|--------|------|-------|
| id | UUID | Primary key |
| email | text | Email address |
| email_confirmed_at | timestamp | When email was verified |
| last_sign_in_at | timestamp | Last login time |
| created_at | timestamp | Account creation date |
| phone | text | Phone number (optional) |

**Related roles table:**
```sql
SELECT * FROM roles WHERE user_id = 'user-uuid';
```

### Trips

Travel packages offered by Mercursión.

| Column | Type | Notes |
|--------|------|-------|
| id | UUID | Primary key |
| name | text | Trip name (e.g., "Playa del Carmen Week") |
| description | text | Full description |
| state | text | Mexican state (32 states) |
| location | geometry | GPS coordinates |
| image_url | text | Featured image from Supabase Storage |
| price_per_person | integer | Base price in cents |
| duration_days | integer | Trip length |
| max_participants | integer | Group size limit |
| created_at | timestamp | Creation date |
| updated_at | timestamp | Last modification |

**Example query:**
```typescript
const { data: trips } = await supabase
  .from('trips')
  .select('id, name, price_per_person')
  .eq('state', 'Quintana Roo')
  .limit(10);
```

### Bookings

User reservations for trips.

| Column | Type | Notes |
|--------|------|-------|
| id | UUID | Primary key |
| user_id | UUID | FK to auth.users |
| trip_id | UUID | FK to trips |
| booking_date | date | Reservation date |
| num_participants | integer | Group size |
| total_price | integer | Total price in cents |
| payment_status | enum | 'pending', 'completed', 'failed', 'refunded' |
| status | enum | 'confirmed', 'cancelled' |
| created_at | timestamp | Creation time |

**Example query:**
```typescript
const { data: bookings } = await supabase
  .from('bookings')
  .select('id, trips(name), num_participants, total_price')
  .eq('user_id', userId)
  .order('created_at', { ascending: false });
```

### Favorites

User-saved trips.

| Column | Type | Notes |
|--------|------|-------|
| id | UUID | Primary key |
| user_id | UUID | FK to auth.users |
| trip_id | UUID | FK to trips |
| created_at | timestamp | When favorited |

### Reviews

Trip ratings and comments.

| Column | Type | Notes |
|--------|------|-------|
| id | UUID | Primary key |
| user_id | UUID | FK to auth.users |
| trip_id | UUID | FK to trips |
| rating | integer | 1-5 stars |
| comment | text | Optional review text |
| created_at | timestamp | Review date |

## Edge Functions

### create-mercadopago-preference

Creates a MercadoPago payment preference for a booking.

**Endpoint:** `POST /functions/v1/create-mercadopago-preference`

**Request:**
```json
{
  "booking_id": "uuid",
  "user_id": "uuid",
  "trip_id": "uuid",
  "num_participants": 2,
  "total_price": 50000,
  "currency": "MXN"
}
```

**Response:**
```json
{
  "preference_id": "mercadopago-id",
  "init_point": "https://www.mercadopago.com.mx/checkout/...",
  "sandbox_init_point": "https://sandbox.mercadopago.com.mx/checkout/..."
}
```

**Error codes:**
- 400: Invalid request body
- 401: Unauthorized (invalid API key)
- 500: MercadoPago API error

**Usage:**
```typescript
const { data } = await supabase.functions.invoke('create-mercadopago-preference', {
  body: {
    booking_id: booking.id,
    user_id: user.id,
    trip_id: trip.id,
    num_participants: 2,
    total_price: 50000,
  }
});

// Open payment link
Linking.openURL(data.init_point);
```

## Authentication

### Sign Up

```typescript
const { user, error } = await supabase.auth.signUp({
  email: 'user@example.com',
  password: 'secure-password',
  options: {
    data: {
      full_name: 'User Name',
      phone: '+521234567890',
    }
  }
});
```

### Sign In

```typescript
const { user, session, error } = await supabase.auth.signInWithPassword({
  email: 'user@example.com',
  password: 'password',
});

// session.access_token used for API requests
// session.refresh_token used to get new access token
```

### Sign Out

```typescript
const { error } = await supabase.auth.signOut();
```

### Get Current User

```typescript
const { data: { user } } = await supabase.auth.getUser();

// Or via session
const { data: { session } } = await supabase.auth.getSession();
```

### Refresh Session

```typescript
const { data, error } = await supabase.auth.refreshSession();
// Returns new access_token
```

## Row-Level Security (RLS)

All tables have RLS policies:

### Users can only see their own bookings
```sql
-- bookings table
SELECT * FROM bookings WHERE user_id = auth.uid();
```

### Users can only see public trips
```sql
-- trips table  
SELECT * FROM trips WHERE public = true;
```

### Users can only see their own reviews
```sql
-- Can create: any trip
-- Can read: all reviews for all trips
-- Can update: only own reviews
-- Can delete: only own reviews
```

## File Storage

### Buckets

- `trip-images` - Trip featured images
- `user-avatars` - User profile pictures

**Upload:**
```typescript
const { data, error } = await supabase.storage
  .from('trip-images')
  .upload(`trips/${trip.id}/image.jpg`, imageFile);

// Access via public URL
const imageUrl = `${SUPABASE_URL}/storage/v1/object/public/trip-images/trips/${trip.id}/image.jpg`;
```

## Real-time Subscriptions

Subscribe to changes:

```typescript
const subscription = supabase
  .from('bookings')
  .on('*', payload => {
    console.log('Change:', payload.eventType, payload.new);
  })
  .subscribe();

// Unsubscribe
subscription.unsubscribe();
```

## Performance Tips

1. **Use `.select()` with specific columns** (not `SELECT *`)
   ```typescript
   .select('id, name, price_per_person')  // ✅ Good
   .select('*')  // ❌ Slower
   ```

2. **Eager load related data**
   ```typescript
   .select('id, trips(name, price_per_person)')  // ✅ One query
   // vs multiple separate queries
   ```

3. **Add indexes to frequently filtered columns**
   ```sql
   CREATE INDEX idx_bookings_user_id ON bookings(user_id);
   CREATE INDEX idx_trips_state ON trips(state);
   ```

4. **Use filtering on the backend** (not in app)
   ```typescript
   .eq('state', 'Quintana Roo')  // ✅ Filter in query
   // vs fetch all and filter in JavaScript
   ```

## Error Handling

```typescript
try {
  const { data, error } = await supabase
    .from('bookings')
    .select()
    .eq('id', bookingId);
  
  if (error) {
    console.error('Error code:', error.code);
    console.error('Message:', error.message);
    // Handle RLS errors, network errors, etc.
  }
} catch (error) {
  // Network or other unexpected errors
}
```

## Related Documentation

- [Supabase Docs](https://supabase.com/docs)
- [Database Schema](./DATABASE-SCHEMA.md)
- [Security Testing](./docs/SECURITY_TESTING.md)

---

**Last Updated**: 2026-04-24  
**Version**: 1.0
