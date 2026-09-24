import browserslist from 'browserslist';
import { browserslistToTargets } from 'lightningcss';

/** The workspace `browserslist`, found by searching up from this package, as Lightning CSS targets. */
export const cssTargets = browserslistToTargets(browserslist(undefined, { path: import.meta.dirname }));
