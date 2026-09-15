/** Default time adjustment in seconds for seek controls. */
export const DEFAULT_SEEK_STEP = 10;

/** Default volume adjustment in percentage points for volume controls. */
export const DEFAULT_VOLUME_STEP = 5;

/**
 * Page that explains what a Video.js player is and how to build one. Every packaged skin links to it with a
 * `rel="help"` link: the HTML skins append it to their shadow root and the React skins render it, so server-rendered
 * pages carry the link in their HTML. Browsers never fetch it and it stays out of the accessibility tree.
 */
export const SKIN_HELP_URL = 'https://videojs.org/about-this-player';
