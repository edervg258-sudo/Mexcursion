// app.config.js — extiende app.json con valores dinámicos de env vars.
// Requerido para inyectar el API key de Google Maps en expo-maps (Android).
const base = require('./app.json');

module.exports = {
  ...base.expo,
  plugins: [
    'expo-router',
    [
      'expo-maps',
      {
        // Necesario para que expo-maps muestre tiles de Google Maps en Android.
        // Agrega EXPO_PUBLIC_GOOGLE_MAPS_API_KEY a tu archivo .env
        android: {
          apiKey: process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY ?? '',
        },
      },
    ],
    [
      'expo-notifications',
      {
        icon: './assets/images/logo.png',
        color: '#3AB7A5',
        sounds: [],
      },
    ],
    [
      'expo-splash-screen',
      {
        image: './assets/images/splash-icon.png',
        imageWidth: 200,
        resizeMode: 'contain',
        backgroundColor: '#ffffff',
        dark: { backgroundColor: '#000000' },
      },
    ],
    'expo-sqlite',
  ],
};
