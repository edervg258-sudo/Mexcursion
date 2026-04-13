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
});

