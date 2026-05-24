# Mexcursión 🗺️

Aplicación móvil y web para descubrir y reservar experiencias de viaje por México. Construida con React Native, Expo y TypeScript. Accesible desde Android, iOS y navegadores web.

## 🎯 Características principales

- **Exploración de destinos**: Descubre experiencias de viajes personalizadas
- **Sistema de reservas**: Flujo completo de reserva con confirmación
- **Historial de viajes**: Seguimiento de reservas actuales y pasadas
- **Favoritos**: Guarda tus destinos y experiencias favoritas
- **Reseñas y calificaciones**: Lee y comparte experiencias con estrellas
- **Rutas y itinerarios**: Planificación detallada de viajes con timeline
- **Mapas integrados**: Visualización de destinos con Leaflet (web) y Google Maps (Android)
- **Notificaciones**: Sistema de notificaciones push para ofertas y actualizaciones
- **Modo oscuro**: Interfaz adaptable al tema del sistema (light/dark)
- **Multi-idioma**: Soporte para español e inglés
- **Admin dashboard**: Panel de control para gestión de destinos y reservas
- **Crash reporting**: Monitoreo con Sentry
- **Offline support**: Indicador de estado de conexión

## 🛠️ Stack tecnológico

- **Frontend**: React Native 0.81.5 + Expo 54
- **Routing**: Expo Router (file-based routing)
- **Lenguaje**: TypeScript 5.9
- **Estado**: TanStack React Query 5.96 + AsyncStorage
- **Backend**: Supabase (PostgreSQL, Auth, Storage)
- **Mapas**: expo-maps (nativo), react-leaflet 5.0 (web)
- **Pagos**: Simulación de tarjeta de crédito + OXXO/SPEI
- **UI Components**: React Native + Custom styling
- **Iconos**: Expo Vector Icons + SVG
- **Notifications**: expo-notifications
- **Crash Reporting**: Sentry (~7.2)
- **Testing**: Jest + React Native Testing Library + Detox (E2E)
- **Linting**: ESLint + TypeScript
- **Build**: Expo EAS (mobile) + Metro (web)

## 📱 Instalación y desarrollo

### Prerequisitos

- **Node.js**: 18+ (se recomienda 20+)
- **npm**: 9+ o **yarn**
- **Expo CLI**: `npm install -g expo-cli`
- **Android Studio**: Para desarrollo en Android
- **Xcode**: Para desarrollo en iOS (solo macOS)

### Quick Start

1. **Clona el repositorio**
   ```bash
   git clone https://github.com/tu-usuario/mercursion.git
   cd mercursion
   ```

2. **Instala dependencias**
   ```bash
   npm install
   ```

3. **Configura variables de entorno** (si usas Supabase en desarrollo)
   ```bash
   # Copia el archivo de ejemplo y completa tus credenciales
   cp .env.example .env
   ```
   Variables requeridas:
   - `EXPO_PUBLIC_SUPABASE_URL`: URL de tu proyecto Supabase
   - `EXPO_PUBLIC_SUPABASE_ANON_KEY`: Anon key de Supabase
   - `SENTRY_DSN`: (opcional) Para crash reporting

4. **Inicia el servidor de desarrollo**
   ```bash
   npm start
   ```
   Escanea el código QR con Expo Go (recomendado) o presiona:
   - `a` para Android (requiere emulador)
   - `i` para iOS (requiere macOS)
   - `w` para web

### Comandos disponibles

```bash
# Desarrollo
npm start                # Inicia servidor Expo en modo interactivo
npm run android          # Build y ejecuta en Android (requiere device/emulador)
npm run ios              # Build y ejecuta en iOS (solo macOS)
npm run web              # Inicia servidor web en http://localhost:19006

# Build/Preview
npm run build:web        # Exporta versión web optimizada a ./dist
npm run preview:web      # Build web + sirve en http://localhost:3000
npm run serve:web        # Sirve archivos de dist/ (útil después de build:web)

# Testing
npm test                 # Ejecuta tests con Jest
npm test:watch           # Tests en modo watch (re-run on file changes)
npm test:coverage        # Tests con reporte de cobertura

# E2E Tests (Detox)
npm run build:e2e        # Construye APK de testing para Android
npm run test:e2e         # Ejecuta tests E2E en Android
npm run build:e2e:ios    # Construye app de testing para iOS
npm run test:e2e:ios     # Ejecuta tests E2E en iOS

# Calidad de código
npm run lint             # ESLint check
npm run release:preflight # Lint + TypeScript + Tests (pre-release)

# Desarrollo
npm run reset-project    # Limpia node_modules y reinstala (si hay problemas)
```

## 🏗️ Estructura del proyecto

```
mercursion/
├── app/                              # Páginas (Expo Router - file-based routing)
│   ├── (tabs)/                      # Layout principal con navegación por tabs
│   │   ├── _layout.tsx
│   │   ├── menu.tsx                 # Inicio / Exploración de destinos
│   │   ├── rutas.tsx                # Planificación de itinerarios
│   │   ├── mis_reservas.tsx         # Historial de reservas
│   │   ├── favoritos.tsx            # Destinos guardados
│   │   ├── perfil.tsx               # Perfil de usuario
│   │   ├── admin.tsx                # Dashboard admin
│   │   ├── reserva.tsx              # Flujo de reserva
│   │   ├── pago.tsx                 # Procesamiento de pago
│   │   ├── confirmacion.tsx         # Confirmación post-pago
│   │   ├── detalle.tsx              # Detalle de destino
│   │   ├── resenas.tsx              # Reseñas y calificaciones
│   │   ├── historial.tsx            # Historial de viajes
│   │   ├── notificaciones.tsx       # Centro de notificaciones
│   │   └── skeletonloader.tsx       # Skeleton UI para loading
│   ├── _layout.tsx                  # Root layout
│   ├── +html.tsx                    # Configuración HTML (web)
│   ├── index.tsx                    # Página inicial (onboarding/splash)
│   ├── login.tsx                    # Autenticación
│   ├── registro.tsx                 # Registro de usuario
│   ├── onboarding.tsx               # Tutorial inicial
│   └── nueva-contrasena.tsx         # Reset de contraseña
│
├── components/                       # Componentes reutilizables
│   ├── Admin/                       # Componentes del panel admin
│   │   ├── AdminNavBar.tsx
│   │   ├── SeccionDestinos.tsx
│   │   ├── SeccionReservas.tsx
│   │   ├── SeccionUsuarios.tsx
│   │   └── adminStyles.ts
│   ├── Rutas/                       # Componentes para planificación de rutas
│   │   ├── RutaChip.tsx
│   │   ├── TimelineItem.tsx
│   │   ├── VistaDetalleItinerario.tsx
│   │   ├── ModalNuevoItinerario.tsx
│   │   ├── ModalAgregarSugerencia.tsx
│   │   └── ModalDetalleSugerencia.tsx
│   ├── ui/                          # Componentes UI primitivos
│   │   ├── collapsible.tsx
│   │   ├── icon-symbol.tsx
│   │   └── icon-symbol.ios.tsx
│   ├── MapView.tsx                  # Wrapper de mapas
│   ├── MapaEstatico.tsx
│   ├── MapaRutas.tsx                # Rutas con mapas (multiplataforma)
│   ├── MapaRutas.web.tsx
│   ├── MapaRutas.native.tsx
│   ├── DestinoCard.tsx              # Tarjeta de destino
│   ├── CarruselImagenes.tsx         # Carrusel de imágenes
│   ├── PagoTarjeta.tsx              # Formulario de pago
│   ├── PagoTarjeta.web.tsx
│   ├── CodigoBarrasOxxo.tsx         # Código de barras para OXXO
│   ├── DetalleReservaModal.tsx      # Modal de detalles
│   ├── ModalSeleccionItinerario.tsx
│   ├── OfflineBanner.tsx            # Indicador de offline
│   ├── SistemaFeedback.tsx          # Feedback del usuario
│   ├── ErrorBoundary.tsx            # Manejo de errores
│   ├── Toast.tsx                    # Notificaciones toast
│   ├── TabChrome.tsx                # Navegación de tabs
│   ├── TopActionHeader.tsx          # Header con acciones
│   ├── themed-text.tsx              # Texto con tema
│   ├── themed-view.tsx              # View con tema
│   └── external-link.tsx            # Enlaces externos
│
├── lib/                             # Lógica, utilidades y configuración
│   ├── constantes/                  # Constantes organizadas
│   │   ├── index.ts
│   │   └── navegacion.ts
│   ├── datos/                       # Datos estáticos
│   │   └── estados.ts              # Lista de estados mexicanos
│   ├── __tests__/                   # Tests unitarios
│   │   ├── validaciones.test.ts
│   │   └── validation.test.ts
│   ├── IdiomaContext.tsx            # Context para multi-idioma
│   ├── TemaContext.tsx              # Context para tema (light/dark)
│   ├── supabase-db.ts              # Funciones de BD con Supabase
│   ├── analytics.ts                # Analytics (stub)
│   ├── validaciones.ts             # Validaciones de formularios
│   └── constantes.ts               # Constantes generales
│
├── hooks/                           # Custom React hooks
│   ├── use-color-scheme.ts         # Hook para tema
│   ├── use-color-scheme.web.ts     # Variante web
│   ├── use-theme-color.ts          # Colores del tema
│   └── use-network-status.ts       # Status de conexión
│
├── constants/                       # Constantes de configuración
│   └── theme.ts                    # Colores y estilos globales
│
├── assets/                          # Recursos (imágenes, fonts)
│   ├── images/                      # SVG y PNG
│   │   ├── logo.png
│   │   ├── splash-icon.png
│   │   └── ...
│   └── fonts/
│
├── e2e/                             # Tests E2E con Detox
│   └── config.json
│
├── __tests__/                       # Tests unitarios globales
│
├── supabase/                        # Migraciones y configuración de BD
│   └── migrations/                  # SQL migrations versionadas
│
├── scripts/                         # Scripts auxiliares
│   ├── reset-project.js
│   ├── inject-pwa.js               # PWA setup para web
│   ├── bump-version.js
│   ├── generate-changelog.js
│   └── tag-release.sh
│
├── .github/workflows/               # CI/CD con GitHub Actions
│   └── ...
│
├── app.json                         # Configuración de Expo
├── eas.json                         # Configuración de EAS Build
├── .detoxrc.json                    # Configuración de Detox (E2E)
├── tsconfig.json                    # TypeScript config
├── jest.config.js                   # Jest config
├── eslintrc.js                      # ESLint config
├── package.json                     # Dependencias
└── README.md                        # Este archivo
```

## ✅ Testing

### Unit Tests (Jest)
```bash
# Ejecutar tests una vez
npm test

# Modo watch - re-run automático cuando los archivos cambian
npm test:watch

# Con reporte de cobertura
npm test:coverage
```

Los tests están ubicados en:
- `lib/__tests__/` - Tests de lógica
- `components/*.test.tsx` - Tests de componentes
- `hooks/*.test.ts` - Tests de custom hooks

### E2E Tests (Detox)

```bash
# Android
npm run build:e2e           # Construir APK optimizado para testing
npm run test:e2e            # Ejecutar tests E2E

# iOS (requiere macOS)
npm run build:e2e:ios       # Construir app de testing
npm run test:e2e:ios        # Ejecutar tests E2E
```

Tests E2E localizados en `e2e/` directory.

**Requisitos para E2E:**
- Emulador Android configurado en Android Studio
- Xcode y simulador de iOS (para iOS)
- Build de testing previamente construido
- Node 18+

### Pre-release Checks
```bash
# Ejecuta lint + TypeScript check + tests
npm run release:preflight
```

## 📦 Versionado y Releases

### Semantic Versioning

Este proyecto sigue [Semantic Versioning](https://semver.org):
- **MAJOR** (X.0.0): Cambios incompatibles (cambios de esquema, breaking changes)
- **MINOR** (0.Y.0): Nuevas features, backward compatible
- **PATCH** (0.0.Z): Bug fixes y parches de seguridad

Versión actual: **1.0.0** (en `package.json` y `app.json`)

### Proceso de Release

1. Asegúrate que todo está en orden:
   ```bash
   npm run release:preflight  # Lint + TypeScript + Tests
   ```

2. Actualiza versión en:
   - `package.json` - `"version"`
   - `app.json` - `"version"`
   - Crea entrada en `CHANGELOG.md`

3. Commit y tag:
   ```bash
   git commit -m "chore: release v1.1.0"
   git tag v1.1.0
   git push origin main --tags
   ```

4. GitHub Actions automáticamente:
   - Ejecuta tests
   - Crea release notes
   - Construye web assets

---

## 🚀 Despliegue y distribución

### CI/CD Pipeline (GitHub Actions)

Workflows automáticos configurados:
- ✅ Tests en cada PR
- ✅ Linting y type checking
- ✅ Build de web assets
- ✅ Deploy automático de web en `main`
- 📋 Status checks requeridos para merge

### Plataformas de despliegue

#### Web (Vercel / Self-hosted)

**Opción 1: Vercel (Recomendado)**
1. Conecta tu repo en [vercel.com](https://vercel.com)
2. Agrega variables de entorno en Project Settings:
   - `EXPO_PUBLIC_SUPABASE_URL`
   - `EXPO_PUBLIC_SUPABASE_ANON_KEY`
   - `SENTRY_DSN` (opcional)
3. Push a `main` activa deploy automático
4. Vercel auto-detecta config de `vercel.json`

**Opción 2: Self-hosted**
```bash
npm run build:web       # Genera archivos en ./dist
npm run serve:web       # Sirve localmente en :3000
# O usa `npx serve dist` para production
```

#### Mobile (EAS - Expo Application Services)

```bash
# 1. Instala EAS CLI
npm install -g @expo/eas-cli

# 2. Login con tu cuenta Expo
eas login

# 3. Android
eas build --platform android --profile production
eas submit --platform android

# 4. iOS (requiere Apple Developer account)
eas build --platform ios --profile production
eas submit --platform ios
```

Configuración en `eas.json`:
- `projectId`: "d84a3cc9-6abb-4f01-9b22-cb70f8227452"
- Perfiles: `development`, `preview`, `production`

#### Backend (Supabase)

Opciones:
1. **Proyecto hosted**: Usa Supabase Cloud (recomendado)
2. **Self-hosted**: Docker en tu propio servidor

Variables necesarias (en Vercel/EAS/local):
```
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

#### Crash Reporting (Sentry)

```
SENTRY_DSN=https://key@sentry.io/project-id
```

Sentry DSN requerido para producción. Sin él, errores no se reportarán.

### Ambientes y variables de entorno

| Ambiente | Archivo | Propósito |
|----------|---------|----------|
| Desarrollo | `.env` (local) | Dev local con Expo |
| Staging | `.env.staging` | Pre-producción (si existe) |
| Producción | `.env.production` | Vercel, EAS, Supabase prod |

**Nota**: Las variables en `.env.production` son requeridas para builds de EAS y Vercel.

## 🔧 Troubleshooting

### Problemas comunes en desarrollo

**"Metro bundler crashed" o error en Expo start**
```bash
npm run reset-project   # Limpia y reinstala todo
rm -rf node_modules .expo
npm install
npm start
```

**El web no muestra cambios (cached)**
```bash
npm run build:web       # Force rebuild
npm run preview:web     # Revisa en nuevo puerto
```

**Emulador Android no se conecta**
- Verifica: `adb devices` en terminal
- Abre Android Studio > Device Manager > Crea emulador si no existe
- Reinicia emulador y Expo

**iOS en Mac: código sin firmar**
- Requiere desarrollo en Xcode: `npm run ios`
- O usa EAS para builds de producción

**Tests fallan después de cambios**
```bash
npm test -- --clearCache  # Limpia cache de Jest
npm test:watch            # Debuggea interactivamente
```

**Mapas no cargan en web**
- Verifica `EXPO_PUBLIC_SUPABASE_URL` en `.env`
- React-leaflet require OpenStreetMap (sin API key)

**Supabase offline/conexión rechazada**
- Verifica URL y credenciales en `.env`
- Supabase cloud: [dashboard](https://supabase.com/dashboard)
- Self-hosted: verifica servidor corriendo

### Guía de estructura para nuevos features

1. **Nueva página**: Crea archivo en `app/(tabs)/` siguiendo naming
2. **Nuevo componente**: Crea en `components/` y exporta desde `index.ts` si es reutilizable
3. **Nueva lógica**: Coloca en `lib/` y crea test en `lib/__tests__/`
4. **Nuevas rutas**: Expo Router auto-detecta archivos en `app/`
5. **Estilos**: Usa `constants/theme.ts` para colores y espaciado consistente

### Debug y logging

```typescript
// Logging en development
if (__DEV__) {
  console.log('Debug info:', data);
}

// React Query devtools en web
// Agregar en _layout.tsx para inspeccionar queries
```

Sentry automáticamente captura errores. Ver dashboard en https://sentry.io

---

## 🤝 Contribución

### Flujo de trabajo

1. Crea una rama descriptiva: `git checkout -b feature/nueva-caracteristica` o `git checkout -b fix/nombre-bug`
2. Haz cambios y commits:
   ```bash
   git add .
   git commit -m "feat: descripción concisa del cambio"
   ```
3. Ejecuta checks antes de push:
   ```bash
   npm run release:preflight  # Lint + TypeScript + Tests
   ```
4. Push y abre Pull Request:
   ```bash
   git push origin feature/nueva-caracteristica
   ```
5. Describe cambios en la PR (qué, por qué, cómo testeaste)

### Estándares de código

- ✅ **TypeScript**: Sin `any`, types explícitos
- ✅ **ESLint**: `npm run lint` debe pasar
- ✅ **Pruebas**: Tests unitarios para lógica nueva
- ✅ **Documentación**: Actualiza README/comments si cambias APIs
- ✅ **Commits**: Mensajes descriptivos y concisos

### Estructura de commits

```
feat: agrega nueva característica
fix: corrige bug específico
refactor: reorganiza código sin cambiar comportamiento
docs: actualiza documentación
test: agrega o modifica tests
chore: cambios en build, deps, etc.
```

## 📝 Licencia

Licencia MIT - ver archivo `LICENSE` para detalles

## 🙋‍♂️ Soporte y contacto

- **Reportar bugs**: [GitHub Issues](https://github.com/tu-usuario/mercursion/issues)
- **Documentación**: Archivo `docs/` y `CHANGELOG.md`
- **Email**: Para consultas comerciales

---

Hecho con ❤️ por amantes de México 🇲🇽
