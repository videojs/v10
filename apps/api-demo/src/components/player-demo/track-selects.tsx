import type { AudioTrackListLike, TextTrackListLike } from '@videojs/core';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useMediaLog } from './media-log';
import { readParams, setParam } from './params';
import { Player, type TracksMedia } from './player';
import { SELECT_CLASS } from './styles';

function trackLabel(track: { label: string; language: string }, index: number): string {
  return track.label || track.language || `Track ${index + 1}`;
}

function applyTextTrack(list: TextTrackListLike, selected: number): void {
  for (let i = 0; i < list.length; i++) {
    const track = list[i]!;
    if (track.kind === 'subtitles' || track.kind === 'captions') {
      track.mode = i === selected ? 'showing' : 'disabled';
    }
  }
}

function applyAudioTrack(list: AudioTrackListLike, selected: number): void {
  for (let i = 0; i < list.length; i++) list[i]!.enabled = i === selected;
}

/** Dropdown for selecting the video rendition (quality), or Auto for ABR. */
export function QualitySelect() {
  const media = Player.useMedia() as TracksMedia | null;
  const { log } = useMediaLog();
  const [, setVersion] = useState(0);
  const bump = useCallback(() => setVersion((v) => v + 1), []);
  const restored = useRef(false);
  const list = media?.videoRenditions ?? null;

  useEffect(() => {
    if (!media) return;
    const controller = new AbortController();
    for (const type of ['loadstart', 'loadedmetadata', 'loadeddata', 'canplay'] as const) {
      media.addEventListener(type, bump, { signal: controller.signal });
    }
    return () => controller.abort();
  }, [media, bump]);

  useEffect(() => {
    if (!list) return;
    const controller = new AbortController();
    const tryRestore = () => {
      if (restored.current || list.length === 0) return;
      restored.current = true;
      const param = readParams().get('quality');
      if (param !== null) list.selectedIndex = param === 'auto' ? -1 : Number(param);
    };
    const onEvent = () => {
      bump();
      tryRestore();
    };
    list.addEventListener('change', onEvent, { signal: controller.signal });
    list.addEventListener('addrendition', onEvent, { signal: controller.signal });
    list.addEventListener('removerendition', onEvent, { signal: controller.signal });
    list.addEventListener('activechange', onEvent, { signal: controller.signal });
    tryRestore();
    return () => controller.abort();
  }, [list, bump]);

  const options: { value: string; label: string }[] = [];
  if (list) {
    for (let i = 0; i < list.length; i++) {
      const rendition = list[i]!;
      const label = rendition.height
        ? `${rendition.height}p`
        : rendition.width
          ? `${rendition.width}w`
          : `Rendition ${i + 1}`;
      options.push({ value: String(i), label });
    }
  }
  const value = list && list.selectedIndex >= 0 ? String(list.selectedIndex) : 'auto';

  const onChange = (next: string) => {
    if (!list) return;
    const index = next === 'auto' ? -1 : Number(next);
    list.selectedIndex = index;
    log('action', `media.videoRenditions.selectedIndex = ${index}`);
    setParam('quality', next);
  };

  return (
    <select
      value={value}
      disabled={!list || list.length === 0}
      aria-label="Quality"
      onChange={(event) => onChange(event.target.value)}
      className={SELECT_CLASS}
    >
      <option value="auto">Auto</option>
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );
}

/** Dropdown for selecting the showing subtitles/captions text track. */
export function TextTrackSelect() {
  const media = Player.useMedia() as TracksMedia | null;
  const { log } = useMediaLog();
  const [, setVersion] = useState(0);
  const bump = useCallback(() => setVersion((v) => v + 1), []);
  const restored = useRef(false);
  const list = media?.textTracks ?? null;

  // Tracks can appear after load, so re-read on media load events.
  useEffect(() => {
    if (!media) return;
    const controller = new AbortController();
    for (const type of ['loadstart', 'loadedmetadata', 'loadeddata', 'canplay'] as const) {
      media.addEventListener(type, bump, { signal: controller.signal });
    }
    return () => controller.abort();
  }, [media, bump]);

  useEffect(() => {
    if (!list) return;
    const controller = new AbortController();
    const tryRestore = () => {
      if (restored.current || list.length === 0) return;
      restored.current = true;
      const param = readParams().get('texttrack');
      if (param !== null) applyTextTrack(list, param === 'off' ? -1 : Number(param));
    };
    const onEvent = () => {
      bump();
      tryRestore();
    };
    list.addEventListener('change', onEvent, { signal: controller.signal });
    list.addEventListener('addtrack', onEvent, { signal: controller.signal });
    list.addEventListener('removetrack', onEvent, { signal: controller.signal });
    tryRestore();
    return () => controller.abort();
  }, [list, bump]);

  const options: { value: string; label: string }[] = [];
  let showing = 'off';
  if (list) {
    for (let i = 0; i < list.length; i++) {
      const track = list[i]!;
      if (track.kind === 'subtitles' || track.kind === 'captions') {
        options.push({ value: String(i), label: trackLabel(track, i) });
        if (track.mode === 'showing') showing = String(i);
      }
    }
  }

  const onChange = (value: string) => {
    if (!list) return;
    const selected = value === 'off' ? -1 : Number(value);
    applyTextTrack(list, selected);
    log('action', selected < 0 ? 'text track → "off"' : `media.textTracks[${selected}].mode = "showing"`);
    setParam('texttrack', value);
  };

  return (
    <select
      value={showing}
      disabled={!media || options.length === 0}
      aria-label="Text track"
      onChange={(event) => onChange(event.target.value)}
      className={SELECT_CLASS}
    >
      <option value="off">Off</option>
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );
}

/** Dropdown for selecting the enabled audio track (hls.js engine only). */
export function AudioTrackSelect() {
  const media = Player.useMedia() as TracksMedia | null;
  const { log } = useMediaLog();
  const [, setVersion] = useState(0);
  const bump = useCallback(() => setVersion((v) => v + 1), []);
  const restored = useRef(false);
  const list = media?.audioTracks ?? null;

  useEffect(() => {
    if (!media) return;
    const controller = new AbortController();
    for (const type of ['loadstart', 'loadedmetadata', 'loadeddata', 'canplay'] as const) {
      media.addEventListener(type, bump, { signal: controller.signal });
    }
    return () => controller.abort();
  }, [media, bump]);

  useEffect(() => {
    if (!list) return;
    const controller = new AbortController();
    const tryRestore = () => {
      if (restored.current || list.length === 0) return;
      restored.current = true;
      const param = readParams().get('audiotrack');
      if (param !== null) applyAudioTrack(list, Number(param));
    };
    const onEvent = () => {
      bump();
      tryRestore();
    };
    list.addEventListener('change', onEvent, { signal: controller.signal });
    list.addEventListener('addtrack', onEvent, { signal: controller.signal });
    list.addEventListener('removetrack', onEvent, { signal: controller.signal });
    tryRestore();
    return () => controller.abort();
  }, [list, bump]);

  const options: { value: string; label: string }[] = [];
  let enabled = -1;
  if (list) {
    for (let i = 0; i < list.length; i++) {
      const track = list[i]!;
      options.push({ value: String(i), label: trackLabel(track, i) });
      if (track.enabled) enabled = i;
    }
  }
  const value = options.length === 0 ? '' : String(enabled >= 0 ? enabled : 0);

  const onChange = (next: string) => {
    if (!list) return;
    const selected = Number(next);
    applyAudioTrack(list, selected);
    log('action', `media.audioTracks[${selected}].enabled = true`);
    setParam('audiotrack', next);
  };

  return (
    <select
      value={value}
      disabled={!list || list.length <= 1}
      aria-label="Audio track"
      onChange={(event) => onChange(event.target.value)}
      className={SELECT_CLASS}
    >
      {options.length === 0 ? <option value="">Default</option> : null}
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );
}
