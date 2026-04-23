import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { AddressableObject } from '../../media/types';
import type { ResponseLike } from '../fetch';
import { fetchResolvable, fetchResolvableStream, getResponseText } from '../fetch';

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

describe('fetchResolvableStream', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  function makeBodyStream(...chunks: Uint8Array[]): ReadableStream<Uint8Array> {
    let i = 0;
    return new ReadableStream({
      pull(controller) {
        if (i < chunks.length) {
          controller.enqueue(chunks[i++]!);
        } else {
          controller.close();
        }
      },
    });
  }

  async function collect(gen: AsyncGenerator<Uint8Array>): Promise<Uint8Array[]> {
    const result: Uint8Array[] = [];
    for await (const chunk of gen) result.push(chunk);
    return result;
  }

  it('yields chunks from the response body', async () => {
    const data = new Uint8Array(256).fill(0xff);
    const body = makeBodyStream(data);
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(body));

    const chunks = await collect(fetchResolvableStream({ url: 'https://example.com/seg.m4s' }, { minChunkSize: 128 }));
    const total = chunks.reduce((sum, c) => sum + c.length, 0);
    expect(total).toBe(256);
  });

  it('passes the URL and byte-range header through to fetch', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(makeBodyStream()));

    await collect(
      fetchResolvableStream(
        { url: 'https://example.com/seg.m4s', byteRange: { start: 0, end: 99 } },
        { minChunkSize: 64 }
      )
    );

    const req: Request = fetchSpy.mock.calls[0]![0] as Request;
    expect(req.headers.get('Range')).toBe('bytes=0-99');
  });

  it('throws when the response has no body', async () => {
    const nullBodyResponse = new Response(null, { status: 204 });
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(nullBodyResponse);

    await expect(collect(fetchResolvableStream({ url: 'https://example.com/seg.m4s' }))).rejects.toThrow(
      'Response has no body'
    );
  });

  it('does not pass minChunkSize as a fetch RequestInit option', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(makeBodyStream()));

    await collect(fetchResolvableStream({ url: 'https://example.com/seg.m4s' }, { minChunkSize: 512 }));

    // fetch should have been called with a Request, not an object with minChunkSize
    const req: Request = fetchSpy.mock.calls[0]![0] as Request;
    expect(req).toBeInstanceOf(Request);
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
