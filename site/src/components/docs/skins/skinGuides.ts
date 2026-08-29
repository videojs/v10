import type { SkinPreviewName } from './SkinPreview';

export interface SkinGuideDefinition {
  readonly name: SkinPreviewName;
  readonly title: string;
  readonly description: string;
  readonly when: string;
  readonly preset: 'audio' | 'background' | 'live-audio' | 'live-video' | 'video';
  readonly variant: 'default' | 'minimal';
  readonly reactSkin: string;
  readonly reactPlayer: string;
  readonly htmlSkin: string;
  readonly htmlRegistration: string;
  readonly media: 'audio' | 'video';
}

export const skinGuides = {
  video: {
    name: 'video',
    title: 'Default video skin',
    description: 'Responsive on-demand video controls with settings, feedback, gestures, and keyboard input.',
    when: 'Use it for a full-featured on-demand video player.',
    preset: 'video',
    variant: 'default',
    reactSkin: 'VideoSkin',
    reactPlayer: 'VideoPlayer',
    htmlSkin: 'video-skin',
    htmlRegistration: 'skin',
    media: 'video',
  },
  'minimal-video': {
    name: 'minimal-video',
    title: 'Minimal video skin',
    description: 'Compact on-demand video controls that wrap cleanly while retaining the complete video feature set.',
    when: 'Use it when the full video feature set should take less visual space.',
    preset: 'video',
    variant: 'minimal',
    reactSkin: 'MinimalVideoSkin',
    reactPlayer: 'VideoPlayer',
    htmlSkin: 'video-minimal-skin',
    htmlRegistration: 'minimal-skin',
    media: 'video',
  },
  audio: {
    name: 'audio',
    title: 'Default audio skin',
    description: 'On-demand audio controls for playback, seeking, volume, speed, errors, and keyboard feedback.',
    when: 'Use it for an audio player with a familiar full control set.',
    preset: 'audio',
    variant: 'default',
    reactSkin: 'AudioSkin',
    reactPlayer: 'AudioPlayer',
    htmlSkin: 'audio-skin',
    htmlRegistration: 'skin',
    media: 'audio',
  },
  'minimal-audio': {
    name: 'minimal-audio',
    title: 'Minimal audio skin',
    description: 'Compact on-demand audio controls with responsive time, volume, speed, and feedback.',
    when: 'Use it for audio playback in a narrow or secondary surface.',
    preset: 'audio',
    variant: 'minimal',
    reactSkin: 'MinimalAudioSkin',
    reactPlayer: 'AudioPlayer',
    htmlSkin: 'audio-minimal-skin',
    htmlRegistration: 'minimal-skin',
    media: 'audio',
  },
  'live-video': {
    name: 'live-video',
    title: 'Default live video skin',
    description: 'Live video controls with live-edge state, captions, remote playback, feedback, and input controls.',
    when: 'Use it for a live stream that needs the full video control set.',
    preset: 'live-video',
    variant: 'default',
    reactSkin: 'LiveVideoSkin',
    reactPlayer: 'LiveVideoPlayer',
    htmlSkin: 'live-video-skin',
    htmlRegistration: 'skin',
    media: 'video',
  },
  'minimal-live-video': {
    name: 'minimal-live-video',
    title: 'Minimal live video skin',
    description: 'Compact live video controls with live-edge, captions, feedback, gestures, and keyboard input.',
    when: 'Use it for a live stream with a smaller control footprint.',
    preset: 'live-video',
    variant: 'minimal',
    reactSkin: 'MinimalLiveVideoSkin',
    reactPlayer: 'LiveVideoPlayer',
    htmlSkin: 'live-video-minimal-skin',
    htmlRegistration: 'minimal-skin',
    media: 'video',
  },
  'live-audio': {
    name: 'live-audio',
    title: 'Default live audio skin',
    description: 'Live audio controls for playback, live-edge, volume, errors, and keyboard feedback.',
    when: 'Use it for a live audio stream with explicit live-edge state.',
    preset: 'live-audio',
    variant: 'default',
    reactSkin: 'LiveAudioSkin',
    reactPlayer: 'LiveAudioPlayer',
    htmlSkin: 'live-audio-skin',
    htmlRegistration: 'skin',
    media: 'audio',
  },
  'minimal-live-audio': {
    name: 'minimal-live-audio',
    title: 'Minimal live audio skin',
    description: 'Compact live audio controls for playback, live-edge, volume, errors, and keyboard feedback.',
    when: 'Use it for a compact live audio player.',
    preset: 'live-audio',
    variant: 'minimal',
    reactSkin: 'MinimalLiveAudioSkin',
    reactPlayer: 'LiveAudioPlayer',
    htmlSkin: 'live-audio-minimal-skin',
    htmlRegistration: 'minimal-skin',
    media: 'audio',
  },
  background: {
    name: 'background',
    title: 'Background video preset',
    description: 'A control-free video layout for decorative background playback.',
    when: 'Use it for muted, looping decoration behind page content.',
    preset: 'background',
    variant: 'default',
    reactSkin: 'BackgroundVideoSkin',
    reactPlayer: 'BackgroundVideoPlayer',
    htmlSkin: 'background-video-skin',
    htmlRegistration: 'skin',
    media: 'video',
  },
} as const satisfies Readonly<Record<SkinPreviewName, SkinGuideDefinition>>;
