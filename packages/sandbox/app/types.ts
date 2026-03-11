import type { PLATFORMS, PRESETS, SKINS, STYLINGS } from './constants';

export type Skin = (typeof SKINS)[number];
export type Platform = (typeof PLATFORMS)[number];
export type Styling = (typeof STYLINGS)[number];
export type Preset = (typeof PRESETS)[number];
