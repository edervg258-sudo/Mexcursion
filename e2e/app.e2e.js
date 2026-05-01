const { device, expect, element, by, waitFor } = require('detox');

const E2E_EMAIL = process.env.E2E_TEST_EMAIL;
const E2E_PASSWORD = process.env.E2E_TEST_PASSWORD;
const HAS_E2E_CREDS = Boolean(E2E_EMAIL && E2E_PASSWORD);

describe('Mercursión App', () => {
  beforeEach(async () => {
    await device.launchApp({ newInstance: true });
  });

  it('should show login screen when not authenticated', async () => {
    await expect(element(by.id('login-screen'))).toBeVisible();
  });

  it('should complete booking flow end-to-end (requires E2E_TEST_EMAIL/PASSWORD)', async () => {
    if (!HAS_E2E_CREDS) {
      return;
    }

    await expect(element(by.id('login-email-input'))).toBeVisible();
    await element(by.id('login-email-input')).replaceText(E2E_EMAIL);
    await element(by.id('login-password-input')).replaceText(E2E_PASSWORD);
    await element(by.id('login-continue-button')).tap();

    await waitFor(element(by.id('menu-screen'))).toBeVisible().withTimeout(15000);

    await expect(element(by.id('search-input'))).toBeVisible();
    await element(by.id('search-input')).replaceText('Yucatán');
    await element(by.id('destination-card')).atIndex(0).tap();

    await waitFor(element(by.id('detail-screen'))).toBeVisible().withTimeout(10000);
    await element(by.id('reserve-package-button')).atIndex(0).tap();

    await waitFor(element(by.id('reserva-screen'))).toBeVisible().withTimeout(10000);
    await element(by.id('traveler-name-input')).replaceText('Usuario Prueba');
    await element(by.id('traveler-email-input')).replaceText(E2E_EMAIL);
    await element(by.id('traveler-phone-input')).replaceText('5512345678');
    await element(by.id('travel-date-input')).replaceText('30/12/2026');
    await element(by.id('reserve-continue-button')).tap();

    await waitFor(element(by.id('pago-screen'))).toBeVisible().withTimeout(10000);
    await element(by.id('payment-method-spei')).tap();
    await element(by.id('pay-submit-button')).tap();

    await waitFor(element(by.id('confirmacion-screen'))).toBeVisible().withTimeout(20000);
  });

  it('should validate simulated card inputs before continuing (requires E2E creds)', async () => {
    if (!HAS_E2E_CREDS) {
      return;
    }

    await expect(element(by.id('login-email-input'))).toBeVisible();
    await element(by.id('login-email-input')).replaceText(E2E_EMAIL);
    await element(by.id('login-password-input')).replaceText(E2E_PASSWORD);
    await element(by.id('login-continue-button')).tap();

    await waitFor(element(by.id('menu-screen'))).toBeVisible().withTimeout(15000);
    await element(by.id('destination-card')).atIndex(0).tap();
    await waitFor(element(by.id('detail-screen'))).toBeVisible().withTimeout(10000);
    await element(by.id('reserve-package-button')).atIndex(0).tap();
    await waitFor(element(by.id('reserva-screen'))).toBeVisible().withTimeout(10000);

    await element(by.id('traveler-name-input')).replaceText('Usuario Prueba');
    await element(by.id('traveler-email-input')).replaceText(E2E_EMAIL);
    await element(by.id('traveler-phone-input')).replaceText('5512345678');
    await element(by.id('travel-date-input')).replaceText('30/12/2026');
    await element(by.id('reserve-continue-button')).tap();
    await waitFor(element(by.id('pago-screen'))).toBeVisible().withTimeout(10000);

    await element(by.id('payment-method-tarjeta')).tap();
    await element(by.id('pay-submit-button')).tap();
    await expect(element(by.text('Pagar ahora'))).toBeVisible();
    await element(by.text('Pagar ahora')).tap();
    await expect(element(by.text('Ingresa el nombre del titular.'))).toBeVisible();
  });

  it('muestra banner offline y sincroniza al recuperar red (requires E2E creds)', async () => {
    if (!HAS_E2E_CREDS) return;

    // Login
    await expect(element(by.id('login-email-input'))).toBeVisible();
    await element(by.id('login-email-input')).replaceText(E2E_EMAIL);
    await element(by.id('login-password-input')).replaceText(E2E_PASSWORD);
    await element(by.id('login-continue-button')).tap();
    await waitFor(element(by.id('menu-screen'))).toBeVisible().withTimeout(15000);

    // Desactivar red
    await device.setStatusBar({ networkActivity: false });
    await device.disableSynchronization();

    // El banner offline debería aparecer
    await waitFor(element(by.id('offline-banner'))).toBeVisible().withTimeout(8000);

    // Agregar favorito estando offline (acción queda encolada)
    await element(by.id('destination-card')).atIndex(0).tap();
    await waitFor(element(by.id('detail-screen'))).toBeVisible().withTimeout(10000);
    await element(by.id('favorito-button')).tap();

    // Restaurar red
    await device.setStatusBar({ networkActivity: true });
    await device.enableSynchronization();

    // El banner offline desaparece
    await waitFor(element(by.id('offline-banner'))).not.toBeVisible().withTimeout(12000);

    // Navegar a favoritos y verificar que el destino fue sincronizado
    await device.pressBack();
    await element(by.id('tab-favoritos')).tap();
    await waitFor(element(by.id('favoritos-screen'))).toBeVisible().withTimeout(8000);
    await expect(element(by.id('favorito-item')).atIndex(0)).toBeVisible();
  });
});

