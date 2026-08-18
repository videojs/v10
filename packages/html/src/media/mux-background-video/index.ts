/**
 * The Mux-flavored name for `HlsBackgroundVideo` — the same class, not a subclass
 * or a variant. Kept because `<mux-background-video>` is what the standalone
 * package this element replaces was called.
 *
 * There is no Mux identity to add, because there is no Mux input to take: `src`
 * is an HLS URL, and capping which rendition is fetched is a param on it rather
 * than an attribute. `../hls-background-video` carries the whole surface.
 *
 * The two tags register from separate `define/media` entries, each subclassing
 * this base with its own `tagName`, so importing both is fine — they are two names
 * for one element, not two elements competing for one name.
 */
export { HlsBackgroundVideo as MuxBackgroundVideo } from '../hls-background-video';
