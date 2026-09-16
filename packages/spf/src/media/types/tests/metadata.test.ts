import { describe, expect, it } from 'vite-plus/test';

import type { Presentation, SessionDataEntry } from '../index';
import { getMultivariantPlaylistMetadata, getSessionData, MULTIVARIANT_PLAYLIST_METADATA_KEY } from '../index';

const chapters: SessionDataEntry = {
  dataId: 'com.apple.hls.chapters',
  uri: 'https://example.com/chapters.json',
  format: 'JSON',
};
const titleEn: SessionDataEntry = { dataId: 'com.example.title', value: 'Title', language: 'en' };
const titleEs: SessionDataEntry = { dataId: 'com.example.title', value: 'Título', language: 'es' };

const bare: Presentation = { id: 'pres-1', url: 'https://example.com/master.m3u8', selectionSets: [] };
const withSessionData: Presentation = {
  ...bare,
  metadata: { [MULTIVARIANT_PLAYLIST_METADATA_KEY]: { sessionData: [chapters, titleEn, titleEs] } },
};

describe('getMultivariantPlaylistMetadata', () => {
  it('returns undefined for a presentation without metadata', () => {
    expect(getMultivariantPlaylistMetadata(bare)).toBeUndefined();
  });

  it('returns the stashed multivariant metadata', () => {
    expect(getMultivariantPlaylistMetadata(withSessionData)).toEqual({ sessionData: [chapters, titleEn, titleEs] });
  });
});

describe('getSessionData', () => {
  it('returns an empty list for a presentation without metadata', () => {
    expect(getSessionData(bare)).toEqual([]);
  });

  it('returns every entry when no DATA-ID is given', () => {
    expect(getSessionData(withSessionData)).toEqual([chapters, titleEn, titleEs]);
  });

  it('filters entries by DATA-ID, preserving order', () => {
    expect(getSessionData(withSessionData, 'com.example.title')).toEqual([titleEn, titleEs]);
  });

  it('returns an empty list for an unknown DATA-ID', () => {
    expect(getSessionData(withSessionData, 'com.example.missing')).toEqual([]);
  });
});
