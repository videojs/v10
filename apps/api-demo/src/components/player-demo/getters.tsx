import { num, quote, ranges } from './format';
import { useMediaLog } from './media-log';
import { Player, type TracksMedia } from './player';

// Every readable property on the media instance. Clicking one logs its current
// value to the message log.
const GETTERS: { expr: string; read: (media: TracksMedia) => string }[] = [
  { expr: 'media.paused', read: (m) => String(m.paused) },
  { expr: 'media.ended', read: (m) => String(m.ended) },
  { expr: 'media.seeking', read: (m) => String(m.seeking) },
  { expr: 'media.currentTime', read: (m) => num(m.currentTime) },
  { expr: 'media.duration', read: (m) => num(m.duration) },
  { expr: 'media.videoWidth', read: (m) => num(m.videoWidth) },
  { expr: 'media.videoHeight', read: (m) => num(m.videoHeight) },
  { expr: 'media.volume', read: (m) => num(m.volume) },
  { expr: 'media.muted', read: (m) => String(m.muted) },
  { expr: 'media.defaultMuted', read: (m) => String(m.defaultMuted) },
  { expr: 'media.playbackRate', read: (m) => num(m.playbackRate) },
  { expr: 'media.defaultPlaybackRate', read: (m) => num(m.defaultPlaybackRate) },
  { expr: 'media.readyState', read: (m) => String(m.readyState) },
  { expr: 'media.src', read: (m) => quote(m.src) },
  { expr: 'media.currentSrc', read: (m) => quote(m.currentSrc) },
  { expr: 'media.preload', read: (m) => quote(m.preload) },
  { expr: 'media.crossOrigin', read: (m) => (m.crossOrigin === null ? 'null' : quote(m.crossOrigin)) },
  { expr: 'media.streamType', read: (m) => quote(m.streamType) },
  { expr: 'media.poster', read: (m) => quote(m.poster) },
  { expr: 'media.playsInline', read: (m) => String(m.playsInline) },
  { expr: 'media.loop', read: (m) => String(m.loop) },
  { expr: 'media.autoplay', read: (m) => String(m.autoplay) },
  { expr: 'media.controls', read: (m) => String(m.controls) },
  { expr: 'media.isFullscreen', read: (m) => String(m.isFullscreen) },
  { expr: 'media.isPictureInPicture', read: (m) => String(m.isPictureInPicture) },
  { expr: 'media.disablePictureInPicture', read: (m) => String(m.disablePictureInPicture) },
  { expr: 'media.disableRemotePlayback', read: (m) => String(m.disableRemotePlayback) },
  { expr: 'media.liveEdgeStart', read: (m) => num(m.liveEdgeStart) },
  { expr: 'media.targetLiveWindow', read: (m) => num(m.targetLiveWindow) },
  { expr: 'media.buffered', read: (m) => ranges(m.buffered) },
  { expr: 'media.seekable', read: (m) => ranges(m.seekable) },
  { expr: 'media.played', read: (m) => ranges(m.played) },
  { expr: 'media.textTracks', read: (m) => `${m.textTracks.length} track(s)` },
  {
    expr: 'media.config.cuePoints.cuePoints',
    read: (m) => {
      const ns = m.config.cuePoints as { cuePoints?: unknown } | undefined;
      return JSON.stringify(ns?.cuePoints ?? []);
    },
  },

  {
    expr: 'media.videoRenditions',
    read: (m) => {
      const list = m.videoRenditions;
      if (!list) return 'undefined';
      const items: string[] = [];
      for (let i = 0; i < list.length; i++) items.push(list[i]!.height ? `${list[i]!.height}p` : `#${i}`);
      return `[${items.join(', ')}] selectedIndex=${list.selectedIndex}`;
    },
  },
  { expr: 'media.remote.state', read: (m) => quote(m.remote.state) },
  {
    expr: 'media.error',
    read: (m) => (m.error ? `{ code: ${m.error.code}, message: ${quote(m.error.message)} }` : 'null'),
  },
];

/**
 * Lists every readable media property. Clicking one reads it live from the
 * media instance and logs `expr → value` to the message log.
 */
export function Getters() {
  const media = Player.useMedia() as TracksMedia | null;
  const { log } = useMediaLog();

  return (
    <div className="flex flex-col gap-3">
      <p className="text-xs text-warm-gray">Click a getter to log its current value.</p>
      <div className="flex flex-wrap gap-2">
        {GETTERS.map((getter) => (
          <button
            key={getter.expr}
            type="button"
            disabled={!media}
            onClick={() => {
              if (media) log('getter', `${getter.expr} → ${getter.read(media)}`);
            }}
            className="rounded-xs border border-magenta/40 px-2 py-1 font-mono text-xs text-magenta transition-colors hover:bg-magenta hover:text-manila-light disabled:cursor-not-allowed disabled:opacity-50"
          >
            {getter.expr}
          </button>
        ))}
      </div>
    </div>
  );
}
