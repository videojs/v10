import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { AddressableObject } from '../../../core/types';
import type { ResponseLike } from '../fetch';
import { fetchResolvable, getResponseText } from '../fetch';

describe('fetchResolvable', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('fetches from AddressableObject URL', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('content'));

    const addressable: AddressableObject = {
      url: 'https://example.com/playlist.m3u8',
    };

    const response = await fetchResolvable(addressable);

    expect(fetchSpy).toHaveBeenCalledWith(expect.any(Request));
    expect(response).toBeInstanceOf(Response);
  });

  it('returns Response from fetch', async () => {
    const mockResponse = new Response('test content');
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(mockResponse);

    const response = await fetchResolvable({ url: 'https://example.com/test.m3u8' });

    expect(response).toBe(mockResponse);
  });

  it('accepts AddressableObject with just url', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(''));

    const addressable: AddressableObject = {
      url: 'https://example.com/playlist.m3u8',
    };

    await expect(fetchResolvable(addressable)).resolves.toBeDefined();
  });

  it('accepts AddressableObject with byteRange', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(''));

    const addressable: AddressableObject = {
      url: 'https://example.com/segment.m4s',
      byteRange: { start: 1000, end: 1999 },
    };

    await expect(fetchResolvable(addressable)).resolves.toBeDefined();
  });

  it('handles zero-offset byte range', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(''));

    const addressable: AddressableObject = {
      url: 'https://example.com/init.mp4',
      byteRange: { start: 0, end: 999 },
    };

    await expect(fetchResolvable(addressable)).resolves.toBeDefined();
  });
});

describe('getResponseText', () => {
  it('extracts text from ResponseLike', async () => {
    const response: ResponseLike = {
      text: async () => '#EXTM3U\n#EXT-X-VERSION:7',
    };

    const text = await getResponseText(response);
    expect(text).toBe('#EXTM3U\n#EXT-X-VERSION:7');
  });

  it('returns promise from response.text()', async () => {
    const mockText = vi.fn().mockResolvedValue('playlist content');
    const response: ResponseLike = {
      text: mockText,
    };

    const text = await getResponseText(response);

    expect(mockText).toHaveBeenCalled();
    expect(text).toBe('playlist content');
  });

  it('works with actual Response object', async () => {
    const response = new Response('#EXTM3U');
    const text = await getResponseText(response);
    expect(text).toBe('#EXTM3U');
  });

  it('accepts minimal ResponseLike interface', () => {
    const response: ResponseLike = {
      text: async () => 'content',
    };

    expect(response.text).toBeDefined();
  });
});
