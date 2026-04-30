# 🎯 Roadmap a Producción - Mexcursión

## Resumen Ejecutivo
El proyecto está en **80% de madurez**. La arquitectura base es sólida (React Native + Expo + Supabase), pero hay 10 áreas críticas antes de producción. Estimado: **4-6 sprints**.

---

## 🔴 **SPRINT 1: SEGURIDAD & AUTH (Crítico)**

### 1.1 Rate Limiting en Auth
**Por qué**: Sin límites, cualquiera puede hacer bruteforce en login/register.

**Tareas**:
- [ ] Implementar rate limiting en Supabase Auth (via RLS triggers)
- [ ] Alternativa: CloudFlare Workers para limitar por IP
- [ ] Teste: 10 intentos fallidos = bloqueo por 15min
- [ ] Métrica: Track intentos fallidos en Sentry

**Archivos afectados**: `lib/supabase-db.ts` (auth functions)

### 1.2 Refresh Token Rotation
**Por qué**: Tokens no deberían vivir más de 1 hora. Si se roban, el daño es limitado.

**Tareas**:
- [ ] Configurar token expiry en Supabase (1h access, 7d refresh)
- [ ] Implementar refresh token endpoint
- [ ] Test de tokens expirados → refresh automático
- [ ] Verificar `lib/secure-storage.ts` para storage de tokens

**Archivo**: Crear `lib/token-manager.ts`

### 1.3 OWASP Top 10 Audit
**Tareas**:
- [ ] SQL Injection: Supabase lo previene con prepared statements ✓
- [ ] XSS: Revisa `components/` - ¿hay `dangerouslySetInnerHTML`? 
- [ ] CSRF: Agrega CSRF tokens en formularios web
- [ ] Broken Access Control: Revisar RLS policies en cada tabla
- [ ] Sensitive Data: Tokens no deben logearse en Sentry

**Script**: 
```bash
grep -r "dangerouslySetInnerHTML\|eval\|Function(" app/ lib/ components/
```

---

## 🟠 **SPRINT 2: DATA SYNC & OFFLINE**

### 2.1 Sync Strategy Completa
**Problema actual**: `sync-user-data.ts` existe pero:
- ¿Qué pasa si 2 usuarios editan el mismo itinerario?
- ¿Y si el sync falla a mitad de camino?

**Tareas**:
- [ ] Documentar conflict resolution (Last-Write-Wins vs Operational Transform)
- [ ] Implementar idempotency keys en toda operación offline
- [ ] Test E2E: Offline → Realizar cambios → Volver online → Verificar sync
- [ ] Rollback automático si sync falla

**Archivo**: Expandir `lib/offline-cache.ts`

### 2.2 Exponential Backoff
**Tareas**:
- [ ] Implementar retry con backoff: 1s → 2s → 4s → 8s → fail
- [ ] Max 5 intentos antes de alertar al usuario
- [ ] Test: Simular red lenta/intermitente

---

## 🟡 **SPRINT 3: PERFORMANCE & ASSETS**

### 3.1 Asset Optimization
**Problema**: 37 MB en `/assets` es demasiado.

**Tareas**:
- [ ] Auditar imágenes con `du -sh assets/`
- [ ] Comprimir con ImageMagick/Sharp:
  ```bash
  npx sharp -i assets/images/*.png -o dist/ --resize 1920 1080 --quality 80
  ```
- [ ] WebP format para web (fallback PNG para móvil)
- [ ] Target: < 15 MB total

**Script a agregar**: `scripts/optimize-images.js`

### 3.2 Bundle Size & Code Splitting
**Tareas**:
- [ ] Ejecutar análisis: `npm run build:web && node scripts/analyze-bundle.js`
- [ ] Identificar top 5 librerías por tamaño
- [ ] Code split por ruta: `expo router` lo soporta nativamente
- [ ] Lazy load mapas (solo cargar Leaflet si usuario abre tab de mapa)

**Target**: < 2.5 MB bundle (gzipped)

### 3.3 Image Lazy Loading
**Tareas**:
- [ ] Revisar `components/` - agregar `loading="lazy"` en `<Image>`
- [ ] Usar thumbnails (blur placeholder) mientras carga imagen full

---

## 🔵 **SPRINT 4: TESTING & OBSERVABILITY**

### 4.1 Coverage Audit
**Tareas**:
- [ ] Ejecutar: `npm run test:coverage`
- [ ] Target mínimo: 70% coverage
- [ ] Identificar rutas sin tests

**Áreas críticas (deben tener 100% coverage)**:
- `lib/supabase-db.ts` - auth & reservas
- `lib/reservations.test.ts` - pagos
- `lib/offline-cache.ts` - sync

### 4.2 E2E Tests
**Tareas**:
- [ ] Escribir flujo completo en Detox:
  ```
  1. Abrir app
  2. Registro new user
  3. Explorar destinos
  4. Agregar favorito
  5. Hacer reserva
  6. Pagar (simulado)
  7. Ver confirmación
  ```
- [ ] Test offline: Desactivar wifi → realizar acción → activar wifi → sync

**Archivo**: `e2e/critical-flow.e2e.ts`

### 4.3 Logging Estructurado
**Tareas**:
- [ ] Reemplazar `console.log` con logger estructurado
- [ ] Usar `pino` o similar (no logs de texto plano)
- [ ] Enviar logs críticos a tabla `logs` en Supabase
- [ ] Alertas: Error rate > 1% en última hora → PagerDuty/Slack

**Archivo**: Mejorar `lib/logger.ts`

### 4.4 Error Boundary
**Tareas**:
- [ ] Crear `components/ErrorBoundary.tsx`
- [ ] Captura crashes no esperados
- [ ] Muestra mensaje amigable al usuario
- [ ] Envía a Sentry automáticamente

---

## 🟣 **SPRINT 5: ANALYTICS & CONVERSIÓN**

### 5.1 Eventos de Negocio
**Tareas**:
- [ ] Definir events en Mixpanel:
  - `app_opened`, `destination_viewed`, `favorites_added`, `reservation_started`, `payment_completed`
  - `payment_failed`, `offline_action_queued`, `offline_action_synced`
- [ ] Implementar tracking en cada screen
- [ ] Validar events llegan a Mixpanel

**Archivo**: Actualizar `lib/analytics.ts` (actualmente es stub)

### 5.2 Funnels
**Tareas**:
- [ ] Medir: Usuarios que ven destino → Hacen reserva
- [ ] Medir: Usuarios que empiezan checkout → Pagan
- [ ] Identificar drop-off points
- [ ] A/B test: ¿Agregar social proof? ¿Cambiar CTA?

### 5.3 Deep Linking
**Tareas**:
- [ ] Configurar deep links en `app.json`
- [ ] Test: Clic en notificación → Abre app en destino correcto
- [ ] Web fallback: Si no tienen app, ir a web version

---

## 🟢 **SPRINT 6: DEPLOYMENT & RUNBOOKS**

### 6.1 Mobile App Release
**Tareas** (Android/iOS):
- [ ] Generar certificates & signing keys
- [ ] Configurar EAS Build
- [ ] Internal testing track (Google Play Internal Testing)
- [ ] 1 semana de beta antes de production
- [ ] Rollback plan: ¿Qué hacemos si v1.0.1 rompe pagos?

### 6.2 Disaster Recovery
**Tareas**:
- [ ] Documentar: "¿Qué pasa si Supabase cae?" → Fallback?
- [ ] Documentar: "¿Qué pasa si pagos no se sincronizan?" → Manual reconciliation?
- [ ] Backup automático de BD (Supabase lo hace, pero verifica)
- [ ] Runbooks para:
  - Pago caído
  - BD lenta
  - Auth provider down
  - App crash loop

**Archivo**: `docs/runbooks/`

### 6.3 Monitoring & Alerting
**Tareas**:
- [ ] Sentry: Configurar alertas por error rate
- [ ] Supabase: Monitorear query slowness
- [ ] Uptime monitoring: Ping `/health` endpoint cada 5min
- [ ] SLO: 99.5% uptime, < 500ms response time

---

## 📋 **CHECKLIST PRE-PRODUCCIÓN**

- [ ] Security audit completo (OWASP Top 10)
- [ ] Load testing (mínimo 1000 concurrent users)
- [ ] Backup & restore procedure testado
- [ ] Incident response plan documentado
- [ ] Team on-call rotation definido
- [ ] Privacy policy & Terms actualizado
- [ ] GDPR/CCPA compliance audit
- [ ] App Store review process iniciado
- [ ] Firebase referencias removidas (¿aún necesarias?)
- [ ] PowerShell script `fix_picsum.ps1` documentado o removido

---

## 📊 **MÉTRICAS A MONITOREAR**

| Métrica | Target | Tool |
|---------|--------|------|
| Error Rate | < 1% | Sentry |
| P95 Latency | < 500ms | Supabase/Lighthouse |
| Availability | 99.5% | StatusPage |
| Bundle Size | < 2.5 MB | webpack-bundle-analyzer |
| Test Coverage | > 70% | Jest |
| Crash Rate | < 0.5% | Sentry/App Store |

---

## 🚀 **SIGUIENTE PASO INMEDIATO**

1. **Hoy**: Start Sprint 1 (Rate Limiting + Refresh Tokens)
2. **Semana 1**: Complete auth audit
3. **Semana 2-3**: Data sync + offline strategy
4. **Semana 4-5**: Performance + Testing
5. **Semana 6-7**: Analytics + Monitoring
6. **Semana 8**: Deploy a staging, internal testing
7. **Semana 9**: App Store submission
8. **Semana 10**: Production monitoring

---

## 💬 **NOTAS**

- Supabase RLS es tu amigo - usa bien
- Testing offline es tedioso pero salva vidas
- No dejes logging en prod que sea "debug level"
- Cada feature nueva debe incluir: test + monitoring + runbook
- Deploy es el inicio, no el fin - monitorea 24/7 primera semana

¡Buena suerte! El proyecto está bien estructurado para llegar a producción. 🚀
