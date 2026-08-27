import { describe, expect, it } from 'vite-plus/test';

import {
  DEFAULT_KEY_SYSTEMS,
  fairPlayKeySystem,
  initDataFromKeyUri,
  playReadyKeySystem,
  widevineKeySystem,
} from '../key-systems';

// "ping" in base64 — small stand-in for a PSSH payload.
const PSSH_BASE64 = 'cGluZw==';
const PSSH_BYTES = new Uint8Array([0x70, 0x69, 0x6e, 0x67]);

/** A minimal well-formed v0 PSSH box wrapping `payload`. */
function psshBox(payload: Uint8Array): Uint8Array<ArrayBuffer> {
  const box = new Uint8Array(32 + payload.length);
  const view = new DataView(box.buffer);

  view.setUint32(0, box.length);
  box.set([0x70, 0x73, 0x73, 0x68], 4); // 'pssh'
  view.setUint32(28, payload.length);
  box.set(payload, 32);
  return box;
}

function utf16(text: string): Uint8Array<ArrayBuffer> {
  const bytes = new Uint8Array(text.length * 2);

  for (let i = 0; i < text.length; i++) new DataView(bytes.buffer).setUint16(i * 2, text.charCodeAt(i), true);

  return bytes;
}

describe('initDataFromKeyUri', () => {
  it('decodes a base64 data: URI to bytes', () => {
    expect(initDataFromKeyUri(`data:text/plain;base64,${PSSH_BASE64}`)).toEqual(PSSH_BYTES);
  });

  it('decodes with media-type parameters before the base64 marker', () => {
    expect(initDataFromKeyUri(`data:text/plain;charset=UTF-16;base64,${PSSH_BASE64}`)).toEqual(PSSH_BYTES);
  });

  it('carries no init data for non-data: URIs (skd://, https://)', () => {
    expect(initDataFromKeyUri('skd://mux?keyId=abc')).toBeUndefined();
    expect(initDataFromKeyUri('https://example.com/key.bin')).toBeUndefined();
  });

  it('carries no init data for a non-base64 data: URI', () => {
    expect(initDataFromKeyUri('data:text/plain,hello')).toBeUndefined();
  });
});

describe('widevineKeySystem', () => {
  it('claims the DASH system-id URN KEYFORMAT', () => {
    expect(widevineKeySystem.keyFormats).toEqual(['urn:uuid:edef8ba9-79d6-4ace-a3c8-27dcd51d21ed']);
  });

  it('projects a data: URI to cenc init data untouched — Mux ships a complete PSSH', () => {
    const box = psshBox(new Uint8Array([1, 2, 3, 4]));
    const encoded = btoa(String.fromCharCode(...box));

    expect(widevineKeySystem.toInitData?.(`data:text/plain;base64,${encoded}`)).toEqual({
      initDataType: 'cenc',
      initData: box,
    });
  });

  it('projects nothing from a URI carrying no inline init data', () => {
    expect(widevineKeySystem.toInitData?.('skd://mux?keyId=abc')).toBeUndefined();
  });

  it('prefers the L1 hardware tier and shapes no license request of its own', () => {
    expect(widevineKeySystem.preferredVideoRobustness).toBe('HW_SECURE_ALL');
    expect(widevineKeySystem.shapeLicenseRequest).toBeUndefined();
  });
});

describe('playReadyKeySystem', () => {
  it('offers the plain id ahead of the hardware one', () => {
    // `.recommendation` is the hardware security level, and a hardware CDM
    // refuses a license issued against a software one. hls.js and Mux Player
    // never request it.
    expect(playReadyKeySystem.requestVariants).toEqual([
      'com.microsoft.playready',
      'com.microsoft.playready.recommendation',
    ]);
  });

  it('wraps a raw PlayReady Object into a v0 PSSH box', () => {
    const projected = playReadyKeySystem.toInitData?.(`data:text/plain;base64,${PSSH_BASE64}`);
    const initData = projected!.initData;

    expect(projected!.initDataType).toBe('cenc');
    expect(initData.length).toBe(32 + PSSH_BYTES.length);
    expect(new DataView(initData.buffer).getUint32(0)).toBe(initData.length);
    expect([...initData.slice(4, 8)]).toEqual([0x70, 0x73, 0x73, 0x68]); // 'pssh'
    expect(new DataView(initData.buffer).getUint32(8)).toBe(0); // v0, no flags
    // The PlayReady system id, 9a04f079-9840-4286-ab92-e65be0885f95.
    expect([...initData.slice(12, 16)]).toEqual([0x9a, 0x04, 0xf0, 0x79]);
    expect(new DataView(initData.buffer).getUint32(28)).toBe(PSSH_BYTES.length);
    expect([...initData.slice(32)]).toEqual([...PSSH_BYTES]);
  });

  it('leaves an already-PSSH declaration alone', () => {
    const box = psshBox(new Uint8Array([1, 2, 3, 4]));
    const encoded = btoa(String.fromCharCode(...box));

    expect(playReadyKeySystem.toInitData?.(`data:text/plain;base64,${encoded}`)?.initData).toEqual(box);
  });

  it('unwraps a PlayReadyKeyMessage envelope into headers and the decoded challenge', () => {
    // btoa('challenge!') carried inside the classic UTF-16 XML envelope.
    const envelope = utf16(
      '<PlayReadyKeyMessage><LicenseAcquisition Version="1">' +
        '<Challenge encoding="base64encoded">Y2hhbGxlbmdlIQ==</Challenge>' +
        '<HttpHeaders><HttpHeader><name>Content-Type</name><value>text/xml; charset=utf-8</value></HttpHeader>' +
        '<HttpHeader><name>SOAPAction</name><value>AcquireLicense</value></HttpHeader></HttpHeaders>' +
        '</LicenseAcquisition></PlayReadyKeyMessage>'
    );
    const shaped = playReadyKeySystem.shapeLicenseRequest!(envelope.buffer);

    expect(new TextDecoder().decode(shaped.body as ArrayBuffer | Uint8Array)).toBe('challenge!');
    expect(shaped.headers).toEqual({ 'Content-Type': 'text/xml; charset=utf-8', SOAPAction: 'AcquireLicense' });
  });

  it('sends an unwrapped challenge as XML — modern CDMs skip the envelope', () => {
    const raw = utf16('<soap:Envelope>raw challenge</soap:Envelope>');
    const shaped = playReadyKeySystem.shapeLicenseRequest!(raw.buffer);

    expect(shaped.body).toBe(raw.buffer);
    expect(shaped.headers).toEqual({ 'Content-Type': 'text/xml; charset=utf-8' });
  });
});

describe('fairPlayKeySystem', () => {
  it('asks for its own init-data types — Safari rejects cenc-only', () => {
    expect(fairPlayKeySystem.initDataTypes).toEqual(['sinf', 'cenc']);
  });

  it('projects no manifest init data, which routes it to the encrypted-event path', () => {
    expect(fairPlayKeySystem.toInitData).toBeUndefined();
  });
});

describe('DEFAULT_KEY_SYSTEMS', () => {
  it("lists all three in hls.js's order — the platform-native system first", () => {
    expect(DEFAULT_KEY_SYSTEMS.map((module_) => module_.keySystem)).toEqual([
      'com.apple.fps',
      'com.widevine.alpha',
      'com.microsoft.playready',
    ]);
  });

  it('claims every HLS DRM KEYFORMAT identity exactly once', () => {
    const keyFormats = DEFAULT_KEY_SYSTEMS.flatMap((module_) => module_.keyFormats);

    expect(keyFormats).toEqual([
      'com.apple.streamingkeydelivery',
      'urn:uuid:edef8ba9-79d6-4ace-a3c8-27dcd51d21ed',
      'com.microsoft.playready',
    ]);
    expect(new Set(keyFormats).size).toBe(keyFormats.length);
  });
});
