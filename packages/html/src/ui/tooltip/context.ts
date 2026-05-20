import type { TooltipGroupCore } from '@videojs/core';
import { createContext } from '@videojs/element/context';

const TOOLTIP_GROUP_CONTEXT_KEY = Symbol('@videojs/tooltip-group');

/** Context that `<media-tooltip-group>` exposes so child tooltips coordinate hover delays. */
export const tooltipGroupContext = createContext<TooltipGroupCore>(TOOLTIP_GROUP_CONTEXT_KEY);
