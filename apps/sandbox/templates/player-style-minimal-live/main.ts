import { routePlayerStyleSandbox } from '@app/shared/player-style/route';
import { PLAYER_STYLE_THEMES } from '@app/shared/player-style/themes';

// The ported panel is a dynamic import so that the media-chrome frame never pulls `@videojs/html` into its document.
await routePlayerStyleSandbox(PLAYER_STYLE_THEMES['minimal-live'], () => import('./panel'));
