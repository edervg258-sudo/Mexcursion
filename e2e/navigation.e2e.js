const { device, expect, element, by, waitFor } = require('detox');

const E2E_EMAIL = process.env.E2E_TEST_EMAIL;
const E2E_PASSWORD = process.env.E2E_TEST_PASSWORD;
const HAS_E2E_CREDS = Boolean(E2E_EMAIL && E2E_PASSWORD);

describe('Navegación y validaciones — Mercursión', () => {
  beforeEach(async () => {
    await device.launchApp({ newInstance: true });
  });

  it('debería mostrar errores al intentar continuar con campos vacíos en login', async () => {
    await expect(element(by.id('login-screen'))).toBeVisible();

    // Tap sin rellenar nada
    await element(by.id('login-continue-button')).tap();

    await expect(element(by.text('⚠ Ingresa tu correo electrónico'))).toBeVisible();
    await expect(element(by.text('⚠ Ingresa tu contraseña'))).toBeVisible();
  });

  it('debería navegar a la pestaña Favoritos tras iniciar sesión (requiere E2E_TEST_EMAIL/PASSWORD)', async () => {
    if (!HAS_E2E_CREDS) {
      return;
    }

    await element(by.id('login-email-input')).replaceText(E2E_EMAIL);
    await element(by.id('login-password-input')).replaceText(E2E_PASSWORD);
    await element(by.id('login-continue-button')).tap();

    await waitFor(element(by.id('menu-screen'))).toBeVisible().withTimeout(15000);

    // Navegar a favoritos desde la barra de pestañas
    await element(by.id('favoritos-tab')).tap();

    await waitFor(element(by.id('favoritos-screen'))).toBeVisible().withTimeout(8000);
  });

  it('debería navegar a Rutas y mostrar el botón para crear itinerario (requiere E2E_TEST_EMAIL/PASSWORD)', async () => {
    if (!HAS_E2E_CREDS) {
      return;
    }

    await element(by.id('login-email-input')).replaceText(E2E_EMAIL);
    await element(by.id('login-password-input')).replaceText(E2E_PASSWORD);
    await element(by.id('login-continue-button')).tap();

    await waitFor(element(by.id('menu-screen'))).toBeVisible().withTimeout(15000);

    // Navegar a rutas
    await element(by.id('rutas-tab')).tap();

    await waitFor(element(by.id('rutas-screen'))).toBeVisible().withTimeout(8000);
    await expect(element(by.id('create-itinerary-button'))).toBeVisible();
  });
});
