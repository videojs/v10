import { atom } from 'nanostores';

export type Framework = 'html' | 'react';
export type Skin = 'default' | 'minimal';

export const framework = atom<Framework>('react');
export const skin = atom<Skin>('default');
