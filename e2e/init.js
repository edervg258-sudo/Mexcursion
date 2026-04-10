const detox = require('detox');
const { detox: config } = require('../package.json');

beforeAll(async () => {
  await detox.init(config);
});

afterAll(async () => {
  await detox.cleanup();
});