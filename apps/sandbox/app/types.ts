import type { PLATFORMS, SKIN_SOURCES, SKINS, STYLINGS } from './constants';

export type Skin = (typeof SKINS)[number];
export type Platform = (typeof PLATFORMS)[number];
export type Styling = (typeof STYLINGS)[number];
export type SkinSource = (typeof SKIN_SOURCES)[number];
