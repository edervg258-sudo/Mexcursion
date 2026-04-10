const { device, expect, element, by } = require('detox');

describe('Mercursión App', () => {
  beforeEach(async () => {
    await device.reloadReactNative();
  });

  it('should show login screen when not authenticated', async () => {
    await expect(element(by.id('login-screen'))).toBeVisible();
  });

  it('should navigate through main tabs', async () => {
    // Mock authentication or skip to main screen
    await expect(element(by.id('menu-tab'))).toBeVisible();

    // Navigate to favorites
    await element(by.id('favoritos-tab')).tap();
    await expect(element(by.id('favoritos-screen'))).toBeVisible();

    // Navigate to routes
    await element(by.id('rutas-tab')).tap();
    await expect(element(by.id('rutas-screen'))).toBeVisible();

    // Navigate back to menu
    await element(by.id('menu-tab')).tap();
    await expect(element(by.id('menu-screen'))).toBeVisible();
  });

  it('should allow destination search', async () => {
    await expect(element(by.id('search-input'))).toBeVisible();

    await element(by.id('search-input')).typeText('México');
    await element(by.id('search-input')).tapReturnKey();

    // Check if results appear
    await expect(element(by.text('México'))).toBeVisible();
  });

  it('should navigate to destination detail', async () => {
    // Tap on first destination card
    await element(by.id('destination-card')).atIndex(0).tap();

    // Check if detail screen appears
    await expect(element(by.id('detail-screen'))).toBeVisible();
    await expect(element(by.text('Elige tu paquete ideal'))).toBeVisible();
  });
});