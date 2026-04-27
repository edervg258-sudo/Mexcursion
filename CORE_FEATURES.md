# 🎯 Funcionalidades Core Incompletas

**Última actualización:** 2026-04-27  
**Estado:** En Desarrollo  
**Prioridad:** Crítica para MVP

---

## 2. Funcionalidades Core Incompletas

### A. Sistema de Reservas

- ✅ Hacer reserva
- ❌ Modificar reserva (cambiar fechas/pasajeros)
- ❌ Cancelar reserva (con políticas de reembolso)
- ❌ Validar disponibilidad en tiempo real
- ❌ Double-booking prevention

**Impacto:** Sin cancelación, usuarios no pueden cambiar planes  
**Complejidad:** Media  
**Estimado:** 3-4 días

---

### B. Pagos

- ✅ Stripe (tarjeta)
- ✅ SPEI/OXXO simulados
- ❌ Webhooks de Stripe sin validar
- ❌ Refunds automáticos en cancelaciones
- ❌ Reintentos si falla pago
- ❌ Reconciliación manual si algo falla

**Impacto:** Sin webhooks, pagos se pierden (CRÍTICO)  
**Complejidad:** Alta  
**Estimado:** 4-5 días

---

### C. Notificaciones

- ✅ Push básicas
- ❌ Email transaccionales (confirmación, cambios)
- ❌ SMS (importante para reminders)
- ❌ In-app notifications persistentes
- ❌ Preferences/Settings de notificaciones

**Impacto:** Usuarios no reciben confirmaciones importantes  
**Complejidad:** Media  
**Estimado:** 3-4 días

---

### D. Analytics

- ✅ Sentry (crashes)
- ❌ Event tracking real (stub/no-op según README)
- ❌ Funnels (cuántos dropouts en checkout?)
- ❌ User behavior tracking
- ❌ Revenue analytics

**Impacto:** Sin analytics, no podemos optimizar  
**Complejidad:** Media  
**Estimado:** 2-3 días

---

## 📊 Matriz de Prioridad

| Funcionalidad | Crítica | Usuario | Dev | Sprint |
|---|---|---|---|---|
| Cancelar Reserva | ✅ | Alta | Media | 1 |
| Webhooks Stripe | ✅ | Alta | Alta | 1 |
| Refunds Automáticos | ✅ | Alta | Media | 1 |
| Email Transaccionales | ⚠️ | Alta | Media | 2 |
| Validación Real-time | ⚠️ | Media | Media | 2 |
| SMS | ⚠️ | Media | Media | 2 |
| Analytics | ⭕ | Baja | Media | 3 |

---

## 🚀 Plan de Implementación

Ver [NEXT_STEPS.md](./NEXT_STEPS.md) para el roadmap detallado con:
- **Sprint 1**: Faltantes críticos (pagos + cancelaciones)
- **Sprint 2**: Integration testing completo
- **Sprint 3**: Monitoreo y producción

---

## ⚠️ Bloqueos Actuales

1. **Webhooks no validados** → Pagos pueden perderse
2. **Sin refunds automáticos** → Experiencia de usuario pobre
3. **Sin emails transaccionales** → Usuarios confundidos
4. **Sin double-booking prevention** → Posible sobrestock

---

## 📝 Checklist de Implementación

### Sprint 1: Pagos & Reservas
- [ ] Implementar cancel-reservation Edge Function
- [ ] Validar webhooks de Stripe
- [ ] Refunds automáticos en BD y API
- [ ] Tests para cancelación
- [ ] Validaciones en UI

### Sprint 2: Notificaciones & Testing
- [ ] Email transaccionales (SendGrid/Mailgun)
- [ ] SMS setup (Twilio)
- [ ] Integration tests E2E
- [ ] Performance tests
- [ ] Security tests

### Sprint 3: Analytics & Producción
- [ ] Event tracking real
- [ ] Dashboard de analytics
- [ ] Deploy a producción
- [ ] Monitoring setup
- [ ] Runbooks

---

**Documentación relacionada:**
- [NEXT_STEPS.md](./NEXT_STEPS.md) - Plan detallado
- [TEST_STRATEGY.md](./TEST_STRATEGY.md) - Estrategia de testing
- [DEPLOYMENT_STRATEGY.md](./docs/DEPLOYMENT_STRATEGY.md) - Deploy
