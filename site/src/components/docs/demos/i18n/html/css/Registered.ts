import { registerI18n } from '@videojs/html/i18n';
import '@videojs/html/video/player';
import '@videojs/html/video/skin';

registerI18n('en-x-demo', {
  buttons: {
    play: 'Registered custom translation',
  },
});
