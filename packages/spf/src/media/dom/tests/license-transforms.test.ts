import { describe, expect, it } from 'vite-plus/test';

import type { DrmRequest } from '../../drm';
import { detectFairPlayCkc, formEncodeLicenseRequest, unwrapJsonLicense } from '../license-transforms';

const utf8 = (text: string) => new TextEncoder().encode(text);
const decode = (bytes: Uint8Array) => new TextDecoder().decode(bytes);
const b64 = (text: string) => btoa(text);

describe('detectFairPlayCkc', () => {
  it('passes a raw binary CKC through untouched', () => {
    // 0xff 0xfe is not valid UTF-8, so it can only be the already-binary CKC.
    const raw = new Uint8Array([0xff, 0xfe, 0x01, 0x02]);

    expect(detectFairPlayCkc(raw)).toBe(raw);
  });

  it('passes a bare (unwrapped) payload through untouched', () => {
    const bare = utf8('not-wrapped');

    expect(detectFairPlayCkc(bare)).toBe(bare);
  });

  it('unwraps and base64-decodes a <ckc> envelope, trimming surrounding whitespace', () => {
    const result = detectFairPlayCkc(utf8(`\n<ckc>${b64('the-ckc')}</ckc>\n`));

    expect(decode(result)).toBe('the-ckc');
  });

  it('unwraps a JSON envelope keyed by ckc, CkcMessage, or License', () => {
    expect(decode(detectFairPlayCkc(utf8(JSON.stringify({ ckc: b64('a') }))))).toBe('a');
    expect(decode(detectFairPlayCkc(utf8(JSON.stringify({ CkcMessage: b64('b') }))))).toBe('b');
    expect(decode(detectFairPlayCkc(utf8(JSON.stringify({ License: b64('c') }))))).toBe('c');
  });

  it('passes a JSON object without a known key through untouched', () => {
    const other = utf8(JSON.stringify({ error: 'nope' }));

    expect(detectFairPlayCkc(other)).toBe(other);
  });
});

describe('formEncodeLicenseRequest', () => {
  // 0xfb 0xff → base64 '+/8=', whose +, /, and = all require URL encoding — proves each mode.
  const request: DrmRequest = {
    url: 'https://license.example.com',
    method: 'POST',
    headers: { 'Content-Type': 'application/octet-stream', 'X-Auth': 'tok' },
    body: new Uint8Array([0xfb, 0xff]),
  };

  it('form-encodes the message as a URL-encoded base64 spc field, preserving the rest of the request', () => {
    const result = formEncodeLicenseRequest()(request);

    expect(decode(result.body as Uint8Array)).toBe('spc=%2B%2F8%3D');
    expect(result.headers).toEqual({ 'Content-Type': 'application/x-www-form-urlencoded', 'X-Auth': 'tok' });
    expect(result.url).toBe(request.url);
    expect(result.method).toBe(request.method);
  });

  it('leaves the base64 bare when urlEncode is false — the KeyOS contract', () => {
    const result = formEncodeLicenseRequest({ urlEncode: false })(request);

    expect(decode(result.body as Uint8Array)).toBe('spc=+/8=');
  });

  it('appends extra fields after spc, URL-encoding their values', () => {
    const result = formEncodeLicenseRequest({ fields: { assetId: 'abc123', extra: 'a b' } })(request);

    expect(decode(result.body as Uint8Array)).toBe('spc=%2B%2F8%3D&assetId=abc123&extra=a%20b');
  });

  it('reads an ArrayBuffer body and passes a bodyless request through untouched', () => {
    const buffer: DrmRequest = { ...request, body: new Uint8Array([0xfb, 0xff]).buffer };
    const bodyless: DrmRequest = { ...request, body: null };

    expect(decode(formEncodeLicenseRequest()(buffer).body as Uint8Array)).toBe('spc=%2B%2F8%3D');
    expect(formEncodeLicenseRequest()(bodyless)).toBe(bodyless);
  });
});

describe('unwrapJsonLicense', () => {
  it('base64-decodes the license field', () => {
    const result = unwrapJsonLicense(utf8(JSON.stringify({ license: b64('raw-license') })));

    expect(decode(result)).toBe('raw-license');
  });

  it('passes a non-JSON response through untouched', () => {
    const raw = new Uint8Array([0x00, 0xff, 0x10]);

    expect(unwrapJsonLicense(raw)).toBe(raw);
  });

  it('passes JSON without a string license through untouched', () => {
    const noLicense = utf8(JSON.stringify({ status: 'ok' }));
    const numeric = utf8(JSON.stringify({ license: 5 }));

    expect(unwrapJsonLicense(noLicense)).toBe(noLicense);
    expect(unwrapJsonLicense(numeric)).toBe(numeric);
  });
});
