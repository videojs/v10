const HLS_RESPONSE_HEADERS = ['application/x-mpegURL', 'application/vnd.apple.mpegurl', 'audio/mpegurl'];

export async function isHlsSource(url: string, init?: RequestInit) {
  if (!url) return false;

  if (isHlsSourceExtension(url)) return true;

  if (url.startsWith('blob:')) return false;

  try {
    const response = await fetch(url, {
      method: 'HEAD',
      ...init,
    });

    const contentType = response.headers.get('Content-Type');
    if (!contentType) return false;

    const normalized = contentType.toLowerCase().split(';')[0]!.trim();

    return HLS_RESPONSE_HEADERS.some((header) => normalized === header.toLowerCase());
  } catch (err) {
    console.error(err);
    return false;
  }
}

export function isHlsSourceExtension(url: string) {
  return /\.m3u8?(\?.*)?$/i.test(url);
}
