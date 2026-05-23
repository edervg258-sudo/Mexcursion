// app.config.js — extiende app.json con valores dinámicos de env vars.
const base = require('./app.json');

module.exports = {
  ...base.expo,
  plugins: [
    'expo-router',
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
