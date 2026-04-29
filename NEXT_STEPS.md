# 🚀 Plan de Implementación - Próximos Pasos

**Commit:** `9604d8d6`  
**Tests:** 8 suites nuevas creadas  
**Coverage:** 23% → 45% (esperado)  
**Fecha:** 2026-04-26

---

## 📋 Lo que se Hizo (Esta Session)

✅ **8 Test Suites Completos** (~2,000 líneas)
- stripe.test.ts - Pagos con Stripe
- offline-cache.test.ts - Caché offline completa
- sync-user-data.test.ts - Sincronización de datos
- reservations.test.ts - Reglas de negocio + políticas
- input-validation.test.ts - Seguridad de inputs
- stripe-webhooks.test.ts - Webhooks (CRÍTICO)
- Edge Function specs (create-payment-intent, confirm-payment)

✅ **TEST_STRATEGY.md** - Documentación completa del plan de tests

---

## 🎯 Plan de Implementación (3 Sprints)

### **SPRINT 1: Faltantes Críticos (1-2 semanas)**

#### Tareas:
1. **Ampliar supabase-db.test.ts** para operaciones de pago
   ```typescript
   // Agregar tests para:
   - crearReserva(destino, fecha, personas, monto)
   - actualizarEstadoReserva(id, estado)
   - registrarPago(reserva_id, stripe_charge_id, monto)
   - obtenerReservasPorUsuario()
   - cancelarReserva(id, politica) → calcula reembolso
   ```

2. **Implementar Edge Function: cancel-reservation**
   ```
   POST /cancel-reservation
   Body: { reservation_id, cancellation_policy }
   Response: { success, refund_amount, stripe_refund_id }
   
   Debe:
   - Validar que usuario sea propietario
   - Calcular reembolso según política
   - Llamar Stripe refund API
   - Actualizar BD transaccionalmente
   ```

3. **Implementar Webhook Handler: charge.refunded**
   ```
   Event: stripe.charge.refunded
   
   Debe:
   - Verificar firma webhook
   - Buscar reserva por charge_id
   - Marcar como "refunded"
   - Enviar email al usuario
   - Registrar en audit trail
   ```

4. **Agregar Validaciones en App**
   ```
   Antes de permitir reservar:
   [ ] Validar fecha no está en el pasado
   [ ] Validar fecha < 2 años en futuro
   [ ] Validar personas > 0
   [ ] Validar monto > 0
   [ ] Validar usuario está logged in
   [ ] Validar destino existe
   ```

**Archivos a Modificar:**
- `lib/supabase-db.ts` - Agregar funciones CRUD
- `supabase/functions/cancel-reservation/` - Edge Function nueva
- `app/(tabs)/reserva.tsx` - Agregar validaciones
- `app/(tabs)/mis_reservas.tsx` - Botón cancelar

**Estimado:** 4-5 días

---

### **SPRINT 2: Integration Testing (1 semana)**

#### Tareas:
1. **E2E Completo: Happy Path**
   ```
   Usuario:
   1. Navega a catálogo
   2. Selecciona Cancún, 2 personas, 25/05/2026
   3. Selecciona paquete "Premium" ($5,000)
   4. Clickea "Reservar"
   5. Selecciona Stripe
   6. Llena forma de pago (test card)
   7. Recibe email de confirmación
   8. Puede ver reserva en "Mis Reservas"
   9. Hace click "Cancelar Reserva"
   10. Selecciona política FLEXIBLE (>24h = gratis)
   11. Recibe refund en BD
   12. Recibe email de cancelación
   ```

   **Tests:**
   - `integration.test.ts` - Describe el flow completo
   - Usa mocks para Stripe (no pagos reales)
   - Verifica BD está correcta después de cada paso

2. **Performance Tests**
   ```
   [ ] Offline queue processing <5s
   [ ] User sync <3s
   [ ] Payment confirmation <2s
   [ ] Email sent <10s
   ```

3. **Security Tests**
   ```
   [ ] Rate limiting funciona (max 5 intent/minuto)
   [ ] Usuario no puede ver reservas de otros
   [ ] Usuario no puede modificar precio
   [ ] XSS payloads son escapados
   [ ] SQL injection attempts fallidas
   ```

**Archivos a Crear:**
- `integration.test.ts` - E2E complete flow
- `performance.test.ts` - Benchmarks
- `security.test.ts` - Security validations

**Estimado:** 3-4 días

---

### **SPRINT 3: Producción (1 semana)**

#### Tareas:
1. **Ejecutar Todos los Tests en CI/CD**
   ```bash
   npm test
   npm run lint
   npm run build:web
   npm run test:e2e
   ```
   
   **Success Criteria:**
   - 0 test failures
   - Coverage ≥ 60%
   - Build sin warnings
   - E2E tests verdes

2. **Deploy a Staging**
   ```bash
   git push origin main
   # GitHub Actions corre tests
   # Deploy a Railway staging
   # Run Lighthouse CI
   ```

3. **Manual Testing en Staging**
   ```
   [ ] Crear reserva exitosamente
   [ ] Procesar pago con Stripe test key
   [ ] Verificar BD está correcta
   [ ] Recibir email de confirmación
   [ ] Cancelar reserva
   [ ] Recibir refund
   [ ] Recibir email de cancelación
   [ ] Offline mode funciona
   [ ] Sync automática funciona
   ```

4. **Monitoring Setup**
   ```
   [ ] Sentry DSN configurado
   [ ] Stripe webhook endpoint registered
   [ ] Email service (SendGrid/Mailgun) configurado
   [ ] Database backups diarios
   [ ] Alertas en Slack si error crítico
   ```

**Estimado:** 2-3 días

---

## 📊 Success Metrics

### Code Quality
- ✅ Test Coverage ≥ 60% (vs 23% actual)
- ✅ 0 critical security issues
- ✅ 0 flaky tests
- ✅ Linting green

### Business Metrics
- ✅ 100% of successful payments processed
- ✅ 0 missing payments (stripe ↔ DB sync)
- ✅ 100% of refunds processed automatically
- ✅ <1% failed transactions
- ✅ <100ms average payment confirmation

### User Experience
- ✅ Works offline (queue + sync)
- ✅ Fast payment (<3s confirmation)
- ✅ Email confirmations sent reliably
- ✅ Can cancel reservations anytime

---

## 🔧 Herramientas Necesarias

```bash
# Testing
npm test

# Linting
npm run lint

# Building
npm run build:web

# E2E
npm run build:e2e
npm run test:e2e

# CI/CD
git push origin main  # Triggers GitHub Actions
```

---

## 📝 Checklist de Deploy

- [ ] Todos los tests pasan localmente
- [ ] Coverage ≥ 60%
- [ ] Linting verde (npm run lint)
- [ ] TypeScript sin errores (npx tsc --noEmit)
- [ ] E2E tests verdes
- [ ] Lighthouse CI score ≥ 80
- [ ] Webhook endpoint registrado en Stripe
- [ ] Email service configurado
- [ ] Database backups habilitados
- [ ] Sentry DSN en variables de entorno
- [ ] Rate limiting configurado
- [ ] CDN para imágenes (si usa Storage)
- [ ] Manual testing en staging exitoso
- [ ] Deploy a producción
- [ ] Monitor webhooks en producción
- [ ] Audit trail de pagos visibles en admin

---

## 💰 Estimado de Tiempo

| Sprint | Tarea | Días |
|--------|-------|------|
| 1 | Implementar faltantes críticos | 5 |
| 2 | Integration + Performance + Security tests | 4 |
| 3 | Producción + Monitoring | 3 |
| **Total** | | **12 días** |

*Estimado: ~2-3 semanas si trabajas 6h/día*

---

## ⚠️ Notas Críticas

1. **Webhooks son CRÍTICO**
   - Sin webhooks, pagos se pierden
   - Implementar primero
   - Testear con Stripe CLI antes de deploy

2. **Idempotencia es IMPORTANTE**
   - Mismo webhook 2x debe = mismo resultado
   - Guardar event_ids procesados en BD
   - No es opcional

3. **Refunds deben ser automáticos**
   - Si usuario cancela, refund a Stripe inmediato
   - Si hay error, alertar a admin
   - No dejar refunds manuales

4. **Offline Queue es IMPORTANTE para México**
   - Conexión es intermitente
   - Queue debe persistir si app se cierra
   - Sync debe ocurrir automáticamente

5. **Testing con dinero real**
   - Use Stripe test keys (pk_test_*, sk_test_*)
   - No cambiar a producción hasta que esté listo
   - Si lanzas, ASEGÚRATE que todo funciona

---

## 🚀 Comando para Empezar

```bash
# 1. Ir al proyecto
cd /c/Users/usuario/MiPrimerApp

# 2. Crear rama de desarrollo
git checkout -b feature/payment-tests

# 3. Ver los tests nuevos
npm test -- lib/stripe.test.ts

# 4. Ampliar con supabase-db tests
# Editar lib/supabase-db.test.ts

# 5. Implementar Edge Function cancel-reservation
# Crear supabase/functions/cancel-reservation/index.ts

# 6. Hacer commit
git add -A && git commit -m "feat: Implement payment cancellation with refunds"

# 7. Push
git push origin feature/payment-tests

# 8. Create PR
gh pr create --title "Payment system with tests and refunds" ...
```

---

**¿Preguntas?** Revisa TEST_STRATEGY.md para más detalles.  
**Status:** Listo para empezar Sprint 1

