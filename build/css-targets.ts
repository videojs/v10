import browserslist from 'browserslist';
import { browserslistToTargets } from 'lightningcss';

export const cssTargets = browserslistToTargets(browserslist(undefined, { path: import.meta.dirname }));
