# Mercursión 🗺️

Una aplicación móvil para descubrir y reservar viajes por México, construida con React Native y Expo. Explora 32 estados mexicanos con paquetes personalizados para todos los presupuestos.

## 🚀 Características

- **Descubrimiento de destinos**: Explora playas, cultura, aventura y gastronomía en México
- **Reservas en tiempo real**: Sistema completo de reservas con pagos integrados
- **Experiencias personalizadas**: Paquetes económicos, medios y premium
- **Favoritos y reseñas**: Guarda destinos favoritos y lee/comparte reseñas
- **Notificaciones push**: Alertas de ofertas y actualizaciones
- **Modo oscuro**: Interfaz adaptable al tema del sistema
- **Multi-idioma**: Soporte para español e inglés
- **Accesibilidad**: Diseño inclusivo con soporte VoiceOver
- **Análisis y monitoreo**: Firebase Analytics y Sentry para crash reporting

## 🛠️ Tecnologías

- **Framework**: React Native + Expo
- **Backend**: Supabase (PostgreSQL, Auth, Storage)
- **Estado**: TanStack Query + AsyncStorage
- **Navegación**: Expo Router (file-based routing)
- **UI**: React Native components + custom styling
- **Pagos**: Integración con MercadoPago/OXXO
- **Mapas**: Google Maps (planeado)
- **Analytics**: Firebase Analytics
- **Crash Reporting**: Sentry
- **Testing**: Jest + React Native Testing Library
- **CI/CD**: GitHub Actions

## 📱 Instalación y desarrollo

### Prerrequisitos

- Node.js 18+
- npm o yarn
- Expo CLI
- Android Studio (para Android)
- Xcode (para iOS, macOS)

### Configuración

1. **Clona el repositorio**
   ```bash
   git clone https://github.com/tu-usuario/mercursion.git
   cd mercursion
   ```

2. **Instala dependencias**
   ```bash
   npm install
   ```

3. **Configura variables de entorno**
   ```bash
   cp .env.example .env
   ```
   Edita `.env` con tus claves de API:
   - Supabase URL y anon key
   - Firebase config
   - Sentry DSN

4. **Configura Supabase**
   - Crea un proyecto en [supabase.com](https://supabase.com)
   - Ejecuta los scripts en `supabase/seed.sql`
   - Configura auth providers

5. **Inicia la app**
   ```bash
   npx expo start
   ```

### Comandos disponibles

```bash
# Desarrollo
npm start              # Inicia servidor Expo
npm run android        # Construye para Android
npm run ios           # Construye para iOS
npm run web           # Construye para web

# Testing
npm test              # Ejecuta tests
npm run test:watch    # Tests en modo watch
npm run test:coverage # Tests con cobertura

# Calidad de código
npm run lint          # Linting con ESLint
```

## 🏗️ Arquitectura

```
src/
├── app/                 # Páginas (file-based routing)
│   ├── (tabs)/         # Navegación por pestañas
│   ├── login.tsx       # Autenticación
│   └── ...
├── components/         # Componentes reutilizables
├── lib/                # Utilidades y configuración
│   ├── constantes/     # Constantes organizadas
│   ├── datos/          # Datos estáticos
│   ├── estilos/        # Estilos compartidos
│   ├── supabase-db.ts  # Funciones de BD
│   └── ...
├── assets/             # Imágenes y recursos
└── ...
```

## 📊 Testing

### Unit Tests
```bash
npm test                    # Tests unitarios
npm run test:watch          # Tests en modo watch
npm run test:coverage       # Con reporte de cobertura
```

### E2E Tests (Detox)
```bash
# Android
npm run build:e2e           # Construir APK de testing
npm run test:e2e            # Ejecutar tests E2E

# iOS (requiere macOS)
npm run build:e2e:ios       # Construir app de testing
npm run test:e2e:ios        # Ejecutar tests E2E
```

**Nota**: Para E2E, necesitas:
- Android Studio con emulador configurado
- Variables de entorno de desarrollo
- App construida con Detox

## 🚀 Despliegue

### CI/CD

Configurado con GitHub Actions:
- Tests automáticos en PR
- Build para web
- Despliegue automático a Vercel en main

### Producción

#### **Web (Vercel)**
1. **Conectar repositorio**: Importa tu repo en [vercel.com](https://vercel.com)
2. **Variables de entorno**: Agrega las variables de `.env.production`:
   - Ve a Project Settings > Environment Variables
   - Copia todas las variables de `.env.production`
3. **Build settings**: Deberían auto-detectarse del `vercel.json`
4. **Deploy**: Push a `main` activa el deploy automático

#### **Mobile (Expo Application Services)**
```bash
# Instalar EAS CLI
npm install -g @expo/eas-cli

# Login
eas login

# Configurar proyecto
eas build:configure

# Build para producción
eas build --platform android --profile production
eas build --platform ios --profile production

# Submit a stores
eas submit --platform android --profile production
eas submit --platform ios --profile production
```

#### **Backend**
- **Supabase**: Ya configurado, solo cambiar URLs en variables de entorno
- **Firebase**: Configurado para analytics y notificaciones
- **Sentry**: Configurado para crash reporting

### Variables de Entorno por Ambiente

| Ambiente | Archivo | Despliegue |
|----------|---------|------------|
| Desarrollo | `.env` | Local |
| Staging | `.env.staging` | Branch `develop` |
| Producción | `.env.production` | Branch `main` |

## 🤝 Contribución

1. Fork el proyecto
2. Crea una rama para tu feature (`git checkout -b feature/nueva-funcionalidad`)
3. Commit tus cambios (`git commit -m 'Agrega nueva funcionalidad'`)
4. Push a la rama (`git push origin feature/nueva-funcionalidad`)
5. Abre un Pull Request

### Guías de desarrollo

- Usa TypeScript estrictamente
- Sigue las convenciones de código (ESLint)
- Escribe tests para nuevas funcionalidades
- Actualiza documentación según cambios

## 📝 Licencia

Este proyecto está bajo la Licencia MIT. Ver el archivo `LICENSE` para más detalles.

## 🙋‍♂️ Soporte

- **Issues**: [GitHub Issues](https://github.com/tu-usuario/mercursion/issues)
- **Documentación**: Ver carpeta `docs/`
- **Comunidad**: Únete a nuestro Discord

---

Hecho con ❤️ para amantes de México
