/**
 * Every Video.js 10 UI element a ported theme might use, registered in one import.
 *
 * Themes are ported by hand and reach for different controls; importing the whole set keeps each theme's entry to its
 * markup and its stylesheet. Which elements a theme actually uses is legible from its `theme.html`, which is where that
 * mapping belongs.
 */
import '@videojs/html/i18n';
import '@videojs/html/icons/element/default';
// The presets register `<video-player>` and `<audio-player>`, which provide the store every UI element below
// reads from. Without one the controls render but never receive state.
import '@videojs/html/audio/player';
import '@videojs/html/video/player';
// A live port plays HLS, so the media element has to be one that can.
import '@videojs/html/media/hls-video';
import '@videojs/html/ui/airplay-button';
import '@videojs/html/ui/audio-track-radio-group';
import '@videojs/html/ui/buffering-indicator';
import '@videojs/html/ui/captions-button';
import '@videojs/html/ui/captions-radio-group';
import '@videojs/html/ui/cast-button';
import '@videojs/html/ui/container';
import '@videojs/html/ui/controls';
import '@videojs/html/ui/controls-backdrop';
import '@videojs/html/ui/controls-content';
import '@videojs/html/ui/controls-group';
import '@videojs/html/ui/dialog-backdrop';
import '@videojs/html/ui/dialog-close';
import '@videojs/html/ui/dialog-description';
import '@videojs/html/ui/dialog-popup';
import '@videojs/html/ui/dialog-title';
import '@videojs/html/ui/error-dialog';
import '@videojs/html/ui/fullscreen-button';
import '@videojs/html/ui/gesture';
import '@videojs/html/ui/hotkey';
import '@videojs/html/ui/live-button';
import '@videojs/html/ui/menu';
import '@videojs/html/ui/menu-content';
import '@videojs/html/ui/menu-item';
import '@videojs/html/ui/menu-item-indicator';
import '@videojs/html/ui/menu-radio-item';
import '@videojs/html/ui/menu-separator';
import '@videojs/html/ui/mute-button';
import '@videojs/html/ui/pip-button';
import '@videojs/html/ui/play-button';
import '@videojs/html/ui/playback-rate-button';
import '@videojs/html/ui/playback-rate-radio-group';
import '@videojs/html/ui/poster';
import '@videojs/html/ui/quality-radio-group';
import '@videojs/html/ui/seek-button';
import '@videojs/html/ui/slider-buffer';
import '@videojs/html/ui/slider-fill';
import '@videojs/html/ui/slider-preview';
import '@videojs/html/ui/slider-thumb';
import '@videojs/html/ui/slider-thumbnail';
import '@videojs/html/ui/slider-track';
import '@videojs/html/ui/slider-value';
import '@videojs/html/ui/thumbnail';
import '@videojs/html/ui/time';
import '@videojs/html/ui/time-group';
import '@videojs/html/ui/time-separator';
import '@videojs/html/ui/time-slider';
import '@videojs/html/ui/time-slider-chapter-title';
import '@videojs/html/ui/time-slider-chapters';
import '@videojs/html/ui/title';
import '@videojs/html/ui/tooltip';
import '@videojs/html/ui/tooltip-group';
import '@videojs/html/ui/tooltip-label';
import '@videojs/html/ui/volume-popover';
import '@videojs/html/ui/volume-slider';
