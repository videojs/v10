export type MenuItemSettingType = 'playback-rate' | 'quality' | 'audio-track' | 'captions';

export function isMenuItemSettingType(value: string | null): value is MenuItemSettingType {
  return value === 'playback-rate' || value === 'quality' || value === 'audio-track' || value === 'captions';
}
