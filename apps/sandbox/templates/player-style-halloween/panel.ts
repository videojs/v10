import '@app/styles.css';
import '@app/shared/player-style/elements';
import './theme.css';
import { mountPortedPanel } from '@app/shared/player-style/panel-videojs';
import { PLAYER_STYLE_THEMES } from '@app/shared/player-style/themes';

import markup from './theme.html?raw';

mountPortedPanel(PLAYER_STYLE_THEMES.halloween, markup);
