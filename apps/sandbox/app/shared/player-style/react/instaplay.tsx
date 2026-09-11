import { Container, Controls, Gesture, Hotkey, MuteButton, PlayButton, Poster, TimeSlider } from '@videojs/react';
import { PlayIcon, VolumeHighIcon, VolumeOffIcon } from '@videojs/react/icons';
import type { ReactNode } from 'react';

/**
 * Instaplay, written directly against `@videojs/react`.
 *
 * A third implementation of the same theme, beside the hand-written HTML port in `templates/player-style-instaplay/`
 * and the published media-chrome original. All three aim at the original; this one exists to exercise the React
 * component API against a real-world theme rather than the house skins.
 *
 * Every control is sized in `em` against its own font size, which is how the original scales: the theme sets `16px` and
 * steps each control to `17px` once the container reaches 384px, and every padding and icon follows from there. The
 * step sits on the controls rather than the container because a container query matches ancestors only — the element
 * that declares the container cannot answer its own query, which is why the original bumps `[role='button']`.
 */
export function InstaplayReactSkin({ children }: { children?: ReactNode }) {
  return (
    <Container
      /*
       * `@container` and `@[384px]` rather than the skins package's `media-sm`: those variants come from the skins'
       * Tailwind entry, which a sandbox page authored against the app's own stylesheet does not load. The width is
       * the same one — `--container-media-sm` is 24rem.
       *
       * The media is authored by the page, not the skin, so the skin sizes it the way the packaged container sizes its
       * slotted media. Left alone a `<video>` lays out at its intrinsic size and leaves the box unfilled.
       */
      className="@container relative block aspect-video w-full overflow-clip bg-black text-base font-bold text-white [&>video]:block [&>video]:size-full [&>video]:object-contain"
    >
      {children}
      {/* `Poster.Root` only reports visibility through `data-visible`; hiding on playback is the skin's to write. */}
      <Poster.Root className="pointer-events-none absolute inset-0 hidden size-full data-visible:block">
        <Poster.Image className="size-full object-contain" />
      </Poster.Root>

      <Gesture type="tap" action="togglePaused" pointer="mouse" />
      <Hotkey keys="Space" action="togglePaused" />
      <Hotkey keys="k" action="togglePaused" />
      <Hotkey keys="m" action="toggleMuted" />

      {/* Centred play, shown only while paused — the theme's whole affordance. */}
      <PlayButton className="absolute inset-0 z-20 m-auto hidden size-fit place-content-center rounded-full bg-neutral-800/75 p-[0.7em] leading-none data-paused:grid @[384px]:text-[17px]">
        {/* The original nudges the triangle so it reads centred inside the circle. */}
        <PlayIcon className="size-[1.2em] translate-x-[0.05em]" />
      </PlayButton>

      <Controls.Root>
        <Controls.Content className="pointer-events-none absolute inset-0 z-30 flex flex-col justify-end">
          <Controls.Group className="pointer-events-auto mx-[0.8em] my-[0.4em] flex items-center justify-end">
            <MuteButton className="group grid size-fit place-content-center rounded-full bg-neutral-800/75 p-[0.3em] @[384px]:text-[17px]">
              <VolumeHighIcon className="size-[1.2em] group-data-[volume-level=off]:hidden" />
              <VolumeOffIcon className="hidden size-[1.2em] group-data-[volume-level=off]:block" />
            </MuteButton>
          </Controls.Group>

          {/*
           * The slider is offset past the bottom edge so its track sits flush with it, leaving the rest of the hit
           * area above. Offset rather than a negative margin: the row above keeps its place, and the container clips
           * the overflow, both as the original's does.
           */}
          <TimeSlider.Root className="pointer-events-auto relative -bottom-[3px] block h-2 w-full cursor-pointer @[384px]:-bottom-[2px]">
            <TimeSlider.Track className="absolute inset-x-0 top-[2px] h-1 overflow-hidden bg-neutral-800/25">
              <TimeSlider.Buffer className="absolute inset-y-0 left-0 bg-neutral-800/30" />
              <TimeSlider.Fill className="absolute inset-y-0 left-0 bg-white/75" />
            </TimeSlider.Track>
            <TimeSlider.Preview
              className="bottom-full mb-5 grid justify-items-center opacity-0 transition-opacity data-pointing:opacity-100 @[384px]:mb-[0.5em]"
              overflow="clamp"
            >
              <TimeSlider.Value className="text-center leading-[2] tabular-nums drop-shadow" type="pointer" />
            </TimeSlider.Preview>
          </TimeSlider.Root>
        </Controls.Content>
      </Controls.Root>
    </Container>
  );
}
