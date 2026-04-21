import { describe, expect, it } from 'vitest';
import { MuxVideoMedia } from '../../mux';

describe('GoogleCastMixin', () => {
  describe('castReceiver', () => {
    it('stores a non-empty string value', () => {
      const media = new MuxVideoMedia();
      media.castReceiver = 'ABC123';
      expect(media.castReceiver).toBe('ABC123');
    });

    it('coerces empty string to undefined', () => {
      const media = new MuxVideoMedia();
      media.castReceiver = 'ABC123';
      media.castReceiver = '';
      expect(media.castReceiver).toBeUndefined();
    });

    it('stores undefined when set to undefined', () => {
      const media = new MuxVideoMedia();
      media.castReceiver = 'ABC123';
      media.castReceiver = undefined;
      expect(media.castReceiver).toBeUndefined();
    });

    it('updates the castOptions receiverApplicationId when set', () => {
      const media = new MuxVideoMedia();
      media.castReceiver = 'ABC123';
      expect(media.castOptions.receiverApplicationId).toBe('ABC123');
    });

    it('keeps the previous receiverApplicationId when cleared', () => {
      const media = new MuxVideoMedia();
      media.castReceiver = 'ABC123';
      media.castReceiver = '';
      expect(media.castOptions.receiverApplicationId).toBe('ABC123');
    });
  });

  describe('castContentType', () => {
    it('stores a non-empty string value', () => {
      const media = new MuxVideoMedia();
      media.castContentType = 'application/x-mpegURL';
      expect(media.castContentType).toBe('application/x-mpegURL');
    });

    it('coerces empty string to undefined', () => {
      const media = new MuxVideoMedia();
      media.castContentType = 'application/x-mpegURL';
      media.castContentType = '';
      expect(media.castContentType).toBeUndefined();
    });

    it('stores undefined when set to undefined', () => {
      const media = new MuxVideoMedia();
      media.castContentType = 'application/x-mpegURL';
      media.castContentType = undefined;
      expect(media.castContentType).toBeUndefined();
    });
  });

  describe('castSrc', () => {
    it('coerces empty string to undefined so getter fallback applies', () => {
      const media = new MuxVideoMedia();
      media.castSrc = 'https://example.com/cast.m3u8';
      media.castSrc = '';
      media.src = 'https://example.com/video.m3u8';
      expect(media.castSrc).toBe('https://example.com/video.m3u8');
    });
  });
});
