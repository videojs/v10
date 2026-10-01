import { assertType, describe, it } from 'vite-plus/test';

import '../index';

describe('video.js', () => {
  // Resolves `@videojs/html` through its published declarations, where a define entry can lose its tag augmentation.
  it('types the elements it registers by tag name', () => {
    assertType<EventTarget | null | undefined>(document.querySelector('video-player')?.store.target);
    assertType<boolean | undefined>(document.querySelector('video-skin')?.hasUpdated);
  });
});
