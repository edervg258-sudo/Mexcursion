# ADR-004: MercadoPago for Payment Processing

**Status:** Accepted

**Date:** 2026-02-01

**Author:** Eder

## Context

Mercursión requires payment processing for travel bookings in Mexico. Requirements:
- Support multiple payment methods (cards, digital wallets, bank transfers)
- PCI compliance (we cannot store card data)
- Real-time payment confirmation
- Widely accepted in Mexico
- Developer-friendly API

## Decision

We chose **MercadoPago** (Mercado Libre's payments subsidiary) for payment processing.

## Rationale

### Why MercadoPago?

1. **Market Dominance**
   - Largest payment processor in Latin America
   - ~90% acceptance among Mexican online shoppers
   - Backed by Mercado Libre ecosystem

2. **Multiple Payment Methods**
   - Credit/debit cards, OXXO cash, SPEI transfers
   - Digital wallets (Apple Pay, Google Pay via MercadoPago)
   - Buy-now-pay-later options

3. **API Quality**
   - Well-documented REST API
   - Mobile-friendly checkout (WebView or native)
   - Webhook support for async payment confirmations
   - Sandbox environment for testing

4. **PCI Compliance**
   - Offloads card handling to MercadoPago servers
   - We use their checkout form in WebView
   - No direct card data touch required

## Consequences

### Positive

✅ Industry-standard in Latin America
✅ Multiple payment methods reduce checkout friction
✅ Webhooks enable asynchronous payment confirmation
✅ Sandbox environment for testing
✅ Clear pricing and documentation

### Negative

❌ Fees higher than Stripe in some regions
❌ Spanish-language support primarily (though English available)
❌ Regional restrictions (focused on LatAm)

## Implementation Pattern

- **Server-side**: Supabase Edge Function creates payment preference
- **Client-side**: Mobile app opens MercadoPago checkout in WebView
- **Confirmation**: Webhook listener updates order status on success
- **Timeout handling**: Polling in case webhook fails

## Related ADRs

- ADR-002: Supabase for Backend - Edge Function handles preference creation

## References

- [MercadoPago Documentation](https://www.mercadopago.com.mx/developers/)
- [Payment Integration Guide](https://www.mercadopago.com.mx/developers/es/docs/checkout-web/)
