import {
  Container,
  Controls,
  Gesture,
  Hotkey,
  MuteButton,
  PlayButton,
  Poster,
  Slider,
  TimeSlider,
} from '@videojs/react';
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
       * `@container/media-root` and `@[384px]/media-root` rather than the skins package's `media-sm`: those variants
       * come from the skins' Tailwind entry, which a sandbox page authored against the app's own stylesheet does not
       * load. The container's name and the width are the packaged container's — `--container-media-sm` is 24rem.
       *
       * The media is authored by the page, not the skin, so the skin lays it out with the same rule the packaged
       * container applies to its slotted media, down to reading the public `--media-object-fit` and resetting the
       * margin and max-width a page may have set. Left alone a `<video>` sits at its intrinsic size and leaves the
       * box unfilled.
       */
      className="@container/media-root relative isolate block aspect-video w-full overflow-clip bg-black text-base font-bold text-white [&>video]:m-0 [&>video]:block [&>video]:size-full [&>video]:max-w-full [&>video]:rounded-[inherit] [&>video]:[object-fit:var(--media-object-fit,contain)]"
    >
      {children}
      {/* `Poster.Root` only reports visibility through `data-visible`; hiding on playback is the skin's to write. */}
      <Poster.Root className="pointer-events-none absolute inset-0 hidden size-full rounded-[inherit] data-visible:block">
        <Poster.Image className="size-full rounded-[inherit] [object-fit:var(--media-object-fit,contain)]" />
      </Poster.Root>

      <Gesture type="tap" action="togglePaused" pointer="mouse" />
      <Hotkey keys="Space" action="togglePaused" />
      <Hotkey keys="k" action="togglePaused" />
      <Hotkey keys="m" action="toggleMuted" />

      {/* Centred play, shown only while paused — the theme's whole affordance. */}
      <PlayButton className="absolute inset-0 z-20 m-auto hidden size-fit place-content-center rounded-full bg-neutral-800/75 p-[0.7em] leading-none data-paused:grid @[384px]/media-root:text-[17px]">
        {/* The original nudges the triangle so it reads centred inside the circle. */}
        <PlayIcon className="size-[1.2em] translate-x-[0.05em]" />
      </PlayButton>

      <Controls.Root>
        {/*
         * Anchored to the bottom edge and no taller than the two rows it holds, the way the packaged skins position
         * their control groups. Stretched over the whole surface instead it would sit above the centred play button
         * and the gesture layer and swallow the clicks meant for them, which no amount of `pointer-events` on the
         * children undoes for the gestures.
         */}
        <Controls.Content className="absolute inset-x-0 bottom-0 z-30 flex flex-col">
          <Controls.Group className="mx-[0.8em] my-[0.4em] flex items-center justify-end @[384px]/media-root:text-[17px]">
            <MuteButton className="group grid size-fit place-content-center rounded-full bg-neutral-800/75 p-[0.3em]">
              <VolumeHighIcon className="size-[1.2em] group-data-[volume-level=off]:hidden" />
              <VolumeOffIcon className="hidden size-[1.2em] group-data-[volume-level=off]:block" />
            </MuteButton>
          </Controls.Group>

          {/*
           * The slider is offset past the bottom edge so its track sits flush with it, leaving the rest of the hit
           * area above. Offset rather than a negative margin: the row above keeps its place, and the container clips
           * the overflow, both as the original's does.
           */}
          <TimeSlider.Root className="group/slider relative -bottom-[3px] block h-2 w-full cursor-pointer @[384px]/media-root:-bottom-[2px]">
            {/*
             * `Slider.Fill` and `Slider.Buffer` render a bare element and report progress only through
             * `--media-slider-fill` and `--media-slider-buffer`, so a layer that does not read one has no extent at
             * all. The packaged skins express this with their `clip-media-x-*` utility; written out it is that
             * utility's `clip-path`, without the chapter insets no skin here has. Clipping rather than sizing keeps
             * each layer's own paint stable while only its visible extent moves.
             *
             * Written out literally, not built from a helper: Tailwind generates a class only when it finds the class
             * in the source, and one assembled at runtime is never there to find.
             */}
            <TimeSlider.Track className="absolute inset-x-0 top-[2px] h-1 bg-neutral-800/25">
              <TimeSlider.Buffer className="absolute inset-0 bg-neutral-800/30 [clip-path:inset(0_calc(100%_-_var(--media-slider-buffer))_0_0)]" />
              {/* Under the pointer the fill follows it, rather than the time the media has committed to. */}
              <TimeSlider.Fill className="absolute inset-0 bg-white/75 [clip-path:inset(0_calc(100%_-_var(--media-slider-fill))_0_0)] group-data-dragging/slider:[clip-path:inset(0_calc(100%_-_var(--media-slider-pointer))_0_0)]" />
            </TimeSlider.Track>
            {/*
             * Thumbnail and time share one grid cell, the thumbnail filling it and the time sitting at its bottom
             * edge. `invisible` as well as `opacity-0`: a preview left merely transparent still answers hit tests and
             * still reads to assistive technology.
             *
             * The preview declares its own size cap and the thumbnail reads it, which is how the packaged skins
             * express this. `Thumbnail.Root` scales the tile to whatever `min`/`max` its own computed style carries,
             * so a thumbnail given no cap renders at the storyboard tile's full size — here half again as wide as the
             * original's. 180px is the width the original caps at.
             */}
            <TimeSlider.Preview
              className="invisible bottom-full mb-5 grid opacity-0 transition-opacity duration-150 ease-out [--media-slider-preview-max-height:var(--media-slider-preview-max-width)] [--media-slider-preview-max-width:180px] data-pointing:visible data-pointing:opacity-100 @[384px]/media-root:mb-[0.5em]"
              overflow="clamp"
            >
              <Slider.Thumbnail.Root className="col-start-1 row-start-1 block max-h-(--media-slider-preview-max-height) max-w-(--media-slider-preview-max-width) overflow-hidden rounded-[4px]">
                <Slider.Thumbnail.Image className="block" />
              </Slider.Thumbnail.Root>
              <TimeSlider.Value
                className="relative col-start-1 row-start-1 [place-self:end_center] px-[0.4em] leading-[2] tabular-nums [text-shadow:0_1px_2px_rgb(0_0_0/0.6)]"
                type="pointer"
              />
            </TimeSlider.Preview>
          </TimeSlider.Root>
        </Controls.Content>
      </Controls.Root>
    </Container>
  );
}
