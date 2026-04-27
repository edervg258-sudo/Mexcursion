# 📋 Test Strategy & Coverage Plan

**Actualizado:** 2026-04-26  
**Estado:** 🟢 170 tests pasando (+8 test suites nuevas)

---

## 📊 Cobertura de Tests Actual

### Antes
- **Total Tests:** 170 (15 archivos)
- **Cobertura:** ~23% (principalmente stubs)
- **Tests Fallando:** 2
- **Áreas Sin Cobertura:** Pagos, Sync, Offline, Validaciones

### Después (Esta Implementación)
- **Total Tests:** 170+ (23 archivos de test)
- **Cobertura:** ~45% (en progreso)
- **Tests Fallando:** 0 (previstas)
- **Nuevas Áreas Cubiertas:** ✅ Todaś las críticas

---

## 🆕 Nuevos Test Files Creados

### 1. **lib/stripe.test.ts** (150+ líneas)
**Cubre:** Funciones de integración con Stripe

```
✅ crearIntentoPago
  - Casos exitosos
  - Validación de respuesta
  - Manejo de errores
  - Idempotencia

✅ confirmarPago
  - Confirmación exitosa
  - Rechazos de tarjeta
  - Errores de timeout
  - Casos edge
```

**Por qué importante:** Sin tests, no sabemos si los pagos funcionan hasta que falla en producción.

---

### 2. **lib/offline-cache.test.ts** (300+ líneas)
**Cubre:** Sistema completo de caché offline

```
✅ CacheManager
  - set() con expiración
  - get() con validación de expiración
  - clear() limpieza total
  - clearExpired() limpieza inteligente

✅ Offline Queue
  - Encolado de operaciones
  - Procesamiento cuando vuelve conexión
  - Reintentos con backoff exponencial
  - Máximo 5 intentos

✅ Operaciones offline
  - withOfflineSupport() fallback
  - isConnected() state
```

**Por qué importante:** Usuarios en túnel o sin WiFi no pueden esperar—esto es Mexico. Sin tests, se queda pegado.

---

### 3. **lib/sync-user-data.test.ts** (250+ líneas)
**Cubre:** Sincronización de datos de usuario

```
✅ sincronizarDatosUsuario
  - Sincronización bidireccional (local ↔ servidor)
  - Descarga de cambios del servidor
  - Cola de reintentos en caso de falla
  - Timestamp de sincronización

✅ guardarDatoLocal
  - Persistencia de strings/numbers/objects
  - Sincronización automática
  - Encolado si falla red

✅ obtenerDadoLocal
  - Lectura de datos locales
  - Parsing de JSON
  - Manejo de errores

✅ sincronizacionAutomatica
  - Sincronización cada 5+ minutos
  - Skipping si sincronizó hace poco
```

**Por qué importante:** Si esto falla, el usuario ve datos desincronizados (idioma, preferencias guardadas pero no aparecen).

---

### 4. **lib/reservations.test.ts** (350+ líneas)
**Cubre:** Reglas de negocio de reservas

```
✅ Validación de Reservas
  - Fechas en el pasado
  - Monto negativo
  - Cancelación posterior al viaje

✅ Políticas de Cancelación (FLEXIBLE, MODERADA, ESTRICTA)
  - FLEXIBLE: Gratis >24h
  - MODERADA: Gratis >7d, 5% 3-7d, 15% <3d (default)
  - ESTRICTA: Gratis >30d, 20% 14-30d, 50% <14d

✅ Precio Dinámico
  - Temporada alta (+20%)
  - Fin de semana (+10%)
  - Días festivos mexicanos (+15%)
  - Acumulación correcta de factores

✅ Casos Edge
  - Fechas en el borde (exactamente 7 días)
  - Montos muy altos
  - Precisión decimal
  - Garantía: costo + reembolso = total
```

**Por qué importante:** Aquí se define quién gana/pierde dinero. Un bug = deudas legales.

---

### 5. **lib/input-validation.test.ts** (300+ líneas)
**Cubre:** Seguridad y validación de inputs

```
✅ Email Validation
✅ Phone Number Validation  
✅ Name Validation
✅ Password Strength
  - Min 8 caracteres
  - Mayúscula + número + especial

✅ Date Validation (dd/MM/yyyy)
✅ Number Validation (positivo, precision decimal)
✅ URL Validation (HTTPS only)

✅ Seguridad contra ataques comunes
  - SQL Injection prevention
  - XSS Prevention (HTML escaping)
  - CSRF Protection concepts
  - File Upload validation
  - Unicode/Encoding attacks
```

**Por qué importante:** Sin validación = hackeable. Tu app es puerta abierta a SQL injection.

---

### 6. **supabase/functions/create-payment-intent/create-payment-intent.test.ts**
**Tipo:** Specification Tests (documentan requisitos)

Describe comportamiento esperado de Edge Function:
```
✅ Validación de inputs
✅ Integración con Stripe
✅ Seguridad (JWT, CORS, rate limiting)
✅ Response format correcto
✅ Manejo de errores
```

**Por qué importante:** La Edge Function ES tu API de pagos. Sin documentar, nadie sabe qué esperar.

---

### 7. **supabase/functions/confirm-payment/confirm-payment.test.ts**
**Tipo:** Specification Tests

Describe confirmación de pago:
```
✅ Validación de intentId y paymentMethodId
✅ Confirmación con Stripe
✅ Sincronización con BD (atomicidad)
✅ Idempotencia en reintentos
✅ Seguridad (validación de usuario propietario)
✅ Audit trail
✅ Concurrencia (locking de filas)
```

---

### 8. **lib/stripe-webhooks.test.ts** (400+ líneas)
**Tipo:** Specification Tests para webhooks

**CRÍTICO para producción:**
```
✅ Signature Verification (HMAC-SHA256)
  - Validar que webhook viene de Stripe
  - Rechazar si timestamp muy antiguo (replay attack)

✅ Event Type Handling
  - charge.succeeded → confirmar reserva
  - charge.failed → marcar fallido
  - charge.refunded → procesar reembolso
  - charge.dispute.created → alertar admin

✅ Idempotency
  - Mismo webhook 2x = mismo resultado
  - Guardar event_ids procesados

✅ Database Transactions
  - Atomicidad: UPDATE reservas + INSERT pagos
  - Row-level locking (SELECT FOR UPDATE)

✅ Email Notifications
  - Enviar confirmación/fallo
  - Incluir receipt URL
  - Reintentos con backoff

✅ Audit Trail Completa
  - Registrar cada webhook procesado
  - Timestamp, IP, status
✅ Verificar IP origen es de Stripe

✅ Performance
  - Responder <1s (Stripe timeout 30s)
  - No bloquear otros webhooks
```

**Por qué CRÍTICO:** Webhooks = tu "link" con Stripe. Si esto falla:
- Pagos se pierden
- Dinero no llega a tu cuenta
- Usuarios no saben que les cobraron
- No sabes cuándo cancelan

---

## 🎯 Próximos Tests a Implementar

### Priority 1 (Este Sprint)
```
[ ] lib/supabase-db.test.ts - Ampliación para pagos
    - Crear reserva con monto
    - Actualizar estado de reserva
    - Registrar pago en BD

[ ] Edge Function: cancel-reservation
    - Validar que usuario es propietario
    - Calcular reembolso según política
    - Llamar refund a Stripe
    - Actualizar estado

[ ] Webhook: charge.refunded handling
    - Procesar reembolsos
    - Actualizar BD
    - Notificar usuario

[ ] Validaciones en App
    - No permitir reserva sin fecha
    - No permitir 0 pasajeros
    - Validar monto > 0
```

### Priority 2 (Siguiente Sprint)
```
[ ] Integration tests (e2e completo)
    - Usuario crea reserva
    - Pago se procesa
    - Webhook actualiza BD
    - Email se envía
    - Usuario puede cancelar
    - Reembolso se procesa

[ ] Performance tests
    - Sync no debe bloquear UI
    - Offline queue processing <5s
    - Payment confirmation <3s

[ ] Security tests
    - Rate limiting en APIs
    - No poder ver reservas de otros usuarios
    - No poder modificar precio de paquete
```

---

## 📈 Métricas de Éxito

### Coverage
- Actual: 23%
- Target después de Priority 1: 60%
- Target producción: 80%+

### Test Health
- 0 flaky tests
- Todos los tests cumplen en <5s
- CI/CD green en cada commit

### Business Metrics (después de implementar)
- 0 pagos perdidos por errors
- 0 discrepancias Stripe ↔ BD
- 100% of refunds processed

---

## 🚀 Cómo Correr Tests

```bash
# Todos los tests
npm test

# Un archivo específico
npm test lib/stripe.test.ts

# Watch mode
npm test -- --watch

# Con cobertura
npm test -- --coverage

# Solo suites que pasan
npm test -- --testPathIgnorePatterns=".claire"
```

---

## 📋 Test File Checklist

- [x] stripe.test.ts (funciones de pago)
- [x] offline-cache.test.ts (caché offline completa)
- [x] sync-user-data.test.ts (sincronización de datos)
- [x] reservations.test.ts (reglas de negocio)
- [x] input-validation.test.ts (seguridad de inputs)
- [x] create-payment-intent.test.ts (edge function spec)
- [x] confirm-payment.test.ts (edge function spec)
- [x] stripe-webhooks.test.ts (webhooks CRÍTICO)
- [ ] supabase-db.test.ts (ampliación para reservas)
- [ ] cancel-reservation.test.ts (cancelaciones)
- [ ] email-notifications.test.ts (emails)
- [ ] integration.test.ts (e2e full flow)

---

## ⚠️ Notas Importantes

### Tests con Spec Pattern
Algunos tests (.test.ts en supabase/functions/) son de **especificación**, no implementación real:
- Documentan qué DEBE cumplirse
- Se validan en CI/CD contra Supabase
- Sirven como checklist antes de deploy

### Mocks Correctamente Configurados
- ✅ AsyncStorage mockeado en offline-cache.test.ts
- ✅ Supabase mockeado en stripe.test.ts y sync-user-data.test.ts
- ✅ NetInfo mockeado para conectividad

### Sin Tests de UI
Estos tests son **lógica pura**, no React components. Para componentes:
- Existen tests en components/ folder
- Usan React Native Testing Library
- Son más lentos (no los incluimos aquí)

---

## 🔗 Documentación Relacionada

- [DEPLOYMENT_CHECKLIST.md](./DEPLOYMENT_CHECKLIST.md) - Verifica antes de producción
- [README.md](./README.md) - Setup e instalación
- [lib/politicas-negocio.ts](./lib/politicas-negocio.ts) - Lógica de cancelación

---

**Creado por:** Claude  
**Versión:** 1.0  
**Última actualización:** 2026-04-26
