import { afterEach } from 'vitest';
import { fakeBrowser } from 'wxt/testing/fake-browser';

afterEach(() => {
  fakeBrowser.reset();
});
