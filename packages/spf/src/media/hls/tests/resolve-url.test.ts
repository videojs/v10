import { describe, expect, it } from 'vitest';

import { resolveUrl } from '../resolve-url';

describe('resolveUrl', () => {
  it('resolves relative URLs against base URL', () => {
    const result = resolveUrl('segment.m4s', 'https://example.com/video/playlist.m3u8');
    expect(result).toBe('https://example.com/video/segment.m4s');
  });

  it('resolves parent directory references (..)', () => {
    const result = resolveUrl('../audio/segment.m4s', 'https://example.com/video/playlist.m3u8');
    expect(result).toBe('https://example.com/audio/segment.m4s');
  });

  it('resolves multiple parent directory references', () => {
    const result = resolveUrl('../../other/segment.m4s', 'https://example.com/content/video/playlist.m3u8');
    expect(result).toBe('https://example.com/other/segment.m4s');
  });

  it('resolves subdirectory references', () => {
    const result = resolveUrl('chunks/segment.m4s', 'https://example.com/video/playlist.m3u8');
    expect(result).toBe('https://example.com/video/chunks/segment.m4s');
  });

  it('preserves absolute URLs without modification', () => {
    const result = resolveUrl('https://cdn.example.com/segment.m4s', 'https://example.com/video/playlist.m3u8');
    expect(result).toBe('https://cdn.example.com/segment.m4s');
  });

  it('handles base URL at root level', () => {
    const result = resolveUrl('segment.m4s', 'https://example.com/playlist.m3u8');
    expect(result).toBe('https://example.com/segment.m4s');
  });

  it('handles base URL with query parameters', () => {
    const result = resolveUrl('segment.m4s', 'https://example.com/video/playlist.m3u8?token=abc');
    expect(result).toBe('https://example.com/video/segment.m4s');
  });

  it('handles different protocols (http vs https)', () => {
    const result = resolveUrl('segment.m4s', 'http://example.com/video/playlist.m3u8');
    expect(result).toBe('http://example.com/video/segment.m4s');
  });

  it('handles different ports', () => {
    const result = resolveUrl('segment.m4s', 'https://example.com:8080/video/playlist.m3u8');
    expect(result).toBe('https://example.com:8080/video/segment.m4s');
  });

  it('resolves path with trailing slash', () => {
    const result = resolveUrl('segment.m4s', 'https://example.com/video/');
    expect(result).toBe('https://example.com/video/segment.m4s');
  });

  it('handles URLs with special characters', () => {
    const result = resolveUrl('segment%20name.m4s', 'https://example.com/my%20video/playlist.m3u8');
    expect(result).toBe('https://example.com/my%20video/segment%20name.m4s');
  });

  describe('HLS spec compliance', () => {
    it('follows RFC 3986 URL resolution (via native URL API)', () => {
      // Standard relative path resolution
      expect(resolveUrl('./segment.m4s', 'https://example.com/video/playlist.m3u8')).toBe(
        'https://example.com/video/segment.m4s'
      );

      // Parent directory
      expect(resolveUrl('../segment.m4s', 'https://example.com/video/playlist.m3u8')).toBe(
        'https://example.com/segment.m4s'
      );

      // Absolute path (replaces path)
      expect(resolveUrl('/other/segment.m4s', 'https://example.com/video/playlist.m3u8')).toBe(
        'https://example.com/other/segment.m4s'
      );

      // Protocol-relative URL
      expect(resolveUrl('//cdn.example.com/segment.m4s', 'https://example.com/playlist.m3u8')).toBe(
        'https://cdn.example.com/segment.m4s'
      );
    });
  });
});
