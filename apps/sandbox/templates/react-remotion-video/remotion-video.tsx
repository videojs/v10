// SPIKE: React wrapper that mounts Remotion's `<Player>` with its chrome switched off and binds its `PlayerRef` to a
// `RemotionAdapter` registered as the player's Media. Follows `@videojs/react/media/youtube-video`, except that the
// attach target is the ref rather than an element, and a few values flow back out to `<Player>` as props.

import { Player, type PlayerRef } from '@remotion/player';
import { useMediaInstance } from '@videojs/react';
import {
  type CSSProperties,
  forwardRef,
  type ReactNode,
  useCallback,
  useLayoutEffect,
  useRef,
  useSyncExternalStore,
} from 'react';

import { RemotionAdapter, type RemotionAdapterProps } from './remotion-adapter';

export interface RemotionVideoProps extends Partial<RemotionAdapterProps> {
  className?: string;
  style?: CSSProperties;
  children?: ReactNode;
}

const FILL: CSSProperties = { width: '100%', height: '100%' };

export const RemotionVideo = forwardRef<HTMLDivElement, RemotionVideoProps>(function RemotionVideo(
  { className, style, children, ...props },
  ref
) {
  const media = useMediaInstance(RemotionAdapter);

  // SPIKE debug handle for poking the adapter from devtools; not for a real package.
  (globalThis as Record<string, unknown>).__remotionMedia = media;
  const playerProps = useSyncExternalStore(media.subscribePlayerProps, media.getPlayerProps, media.getPlayerProps);

  // Push author props onto the adapter after commit, mirroring the package's `useSyncProps`: only keys the author
  // passes are written, and a key resets to its default only when the author stops passing it. Anything else would
  // stomp runtime state the store just set (a rate change re-renders this component through `useSyncExternalStore`).
  const syncedKeysRef = useRef<Set<keyof RemotionAdapterProps>>(new Set());

  useLayoutEffect(() => {
    const defaults = RemotionAdapter.defaultProps;
    const target = media as unknown as Record<string, unknown>;
    const synced = new Set<keyof RemotionAdapterProps>();

    for (const key of syncedKeysRef.current) {
      if (props[key] === undefined && target[key] !== defaults[key]) target[key] = defaults[key];
    }

    for (const key of Object.keys(defaults) as (keyof RemotionAdapterProps)[]) {
      const value = props[key];
      if (value === undefined) continue;

      synced.add(key);

      if (target[key] !== value) target[key] = value;
    }

    syncedKeysRef.current = synced;
  });

  const attachRef = useCallback(
    (player: PlayerRef | null) => {
      if (player) media.attach(player);
      else media.detach();
    },
    [media]
  );

  const { source } = playerProps;

  return (
    <div ref={ref} className={className} style={style}>
      {source ? (
        <Player
          // Remount on a new composition so `initialFrame`/`initiallyMuted`/`initialVolume` apply per source.
          key={source.id}
          ref={attachRef}
          component={source.component}
          inputProps={source.inputProps ?? {}}
          durationInFrames={source.durationInFrames}
          fps={source.fps}
          compositionWidth={source.compositionWidth}
          compositionHeight={source.compositionHeight}
          style={FILL}
          // Video.js owns every control surface: no chrome, no click/keyboard shortcuts, no media-session claims.
          controls={false}
          clickToPlay={false}
          doubleClickToFullscreen={false}
          spaceKeyToPlayOrPause={false}
          allowFullscreen={false}
          browserMediaControlsBehavior={{ mode: 'do-nothing' }}
          renderLoading={() => null}
          // A media element stays on its last frame when it ends; Remotion would rewind to frame 0 by default. Its
          // `play()` already restarts from 0 when called on the last frame, so replay still works.
          moveToBeginningWhenEnded={false}
          loop={playerProps.loop}
          playbackRate={playerProps.playbackRate}
          initiallyMuted={playerProps.initiallyMuted}
          initialVolume={playerProps.initialVolume}
          autoPlay={media.autoplay}
          // Keep Remotion's own volume persistence out of the picture; the store owns volume state.
          volumePersistenceKey="__videojs-remotion-spike-unused"
          acknowledgeRemotionLicense
        />
      ) : null}
      {children}
    </div>
  );
});
