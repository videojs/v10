import '@app/styles.css';
import '@app/shared/player-style/elements';
// The live skin shares its sibling's look; only the live additions are its own.
import '../player-style-microvideo/theme.css';
import './theme.css';
import { mountPortedPanel } from '@app/shared/player-style/panel-videojs';
import { PLAYER_STYLE_THEMES } from '@app/shared/player-style/themes';

import markup from './theme.html?raw';

mountPortedPanel(PLAYER_STYLE_THEMES['microvideo-live'], markup);
