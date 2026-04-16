import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { InputFeedbackEvent, InputFeedbackMediaState } from '../input-feedback-core';
import { InputFeedbackCore } from '../input-feedback-core';

function seekEvent(value: number, region: 'left' | 'center' | 'right' = 'right'): InputFeedbackEvent {
  return { type: 'doubletap', action: 'seekStep', value, region };
}

function toggleEvent(action = 'togglePaused'): InputFeedbackEvent {
  return { type: 'tap', action };
}

function volumeEvent(value: number, label: string): InputFeedbackEvent {
  return { type: 'hotkey', action: 'volumeStep', value, label };
}

const DEFAULT_MEDIA: InputFeedbackMediaState = {
  paused: false,
  volume: 0.5,
  muted: false,
  fullscreen: false,
  subtitlesShowing: false,
  pip: false,
  currentTime: 30,
  duration: 120,
};

describe('InputFeedbackCore', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  describe('handleGesture', () => {
    it('sets active on first gesture', () => {
      const core = new InputFeedbackCore();
      core.handleGesture(seekEvent(10));

      expect(core.state.current.active).toBe(true);
      expect(core.state.current.action).toBe('seekStep');
      expect(core.state.current.region).toBe('right');
      expect(core.state.current.direction).toBe('forward');
      expect(core.state.current.count).toBe(1);
      expect(core.state.current.seekTotal).toBe(10);
    });

    it('sets backward direction for negative value', () => {
      const core = new InputFeedbackCore();
      core.handleGesture(seekEvent(-10, 'left'));

      expect(core.state.current.direction).toBe('backward');
      expect(core.state.current.seekTotal).toBe(10);
    });

    it('sets null direction when no value', () => {
      const core = new InputFeedbackCore();
      core.handleGesture(toggleEvent());

      expect(core.state.current.direction).toBeNull();
      expect(core.state.current.seekTotal).toBe(0);
    });

    it('accumulates count and seekTotal on rapid repeat of same action and region', () => {
      const core = new InputFeedbackCore();

      core.handleGesture(seekEvent(10, 'right'));
      core.handleGesture(seekEvent(10, 'right'));
      core.handleGesture(seekEvent(10, 'right'));

      expect(core.state.current.count).toBe(3);
      expect(core.state.current.seekTotal).toBe(30);
      expect(core.state.current.active).toBe(true);
    });

    it('increments generation on every gesture fire', () => {
      const core = new InputFeedbackCore();
      const initialGen = core.state.current.generation;

      core.handleGesture(seekEvent(10));
      expect(core.state.current.generation).toBe(initialGen + 1);

      core.handleGesture(seekEvent(10));
      expect(core.state.current.generation).toBe(initialGen + 2);
    });

    it('resets and starts fresh when action changes mid-display', () => {
      const core = new InputFeedbackCore();

      core.handleGesture(seekEvent(10, 'right'));
      core.handleGesture(toggleEvent('togglePaused'));

      expect(core.state.current.action).toBe('togglePaused');
      expect(core.state.current.count).toBe(1);
      expect(core.state.current.seekTotal).toBe(0);
    });

    it('resets and starts fresh when region changes mid-display', () => {
      const core = new InputFeedbackCore();

      core.handleGesture(seekEvent(10, 'right'));
      core.handleGesture(seekEvent(10, 'left'));

      // Region changed — treat as new gesture, not accumulation.
      expect(core.state.current.count).toBe(1);
      expect(core.state.current.region).toBe('left');
    });

    it('dismisses after timeout', () => {
      const core = new InputFeedbackCore();
      core.handleGesture(toggleEvent());

      expect(core.state.current.active).toBe(true);

      vi.advanceTimersByTime(800);

      expect(core.state.current.active).toBe(false);
      expect(core.state.current.action).toBeNull();
      expect(core.state.current.count).toBe(0);
    });

    it('resets dismiss timer on rapid repeats', () => {
      const core = new InputFeedbackCore();

      core.handleGesture(seekEvent(10));
      vi.advanceTimersByTime(600);

      // Fires again before dismiss — timer resets.
      core.handleGesture(seekEvent(10));
      vi.advanceTimersByTime(600);

      // Should still be active (800ms hasn't passed since last gesture).
      expect(core.state.current.active).toBe(true);

      vi.advanceTimersByTime(200);
      expect(core.state.current.active).toBe(false);
    });

    it('stores label from event', () => {
      const core = new InputFeedbackCore();
      core.handleGesture(volumeEvent(0.05, '55%'));

      expect(core.state.current.label).toBe('55%');
      expect(core.state.current.action).toBe('volumeStep');
    });

    it('updates label on rapid repeat', () => {
      const core = new InputFeedbackCore();
      core.handleGesture(volumeEvent(0.05, '55%'));
      core.handleGesture(volumeEvent(0.05, '60%'));

      expect(core.state.current.label).toBe('60%');
      expect(core.state.current.count).toBe(2);
    });

    it('clears label on dismiss', () => {
      const core = new InputFeedbackCore();
      core.handleGesture(volumeEvent(0.05, '55%'));
      vi.advanceTimersByTime(800);

      expect(core.state.current.label).toBeNull();
    });

    it('null label when event has no label', () => {
      const core = new InputFeedbackCore();
      core.handleGesture(toggleEvent());

      expect(core.state.current.label).toBeNull();
    });

    it('destroy clears pending timer', () => {
      const core = new InputFeedbackCore();
      core.handleGesture(toggleEvent());
      core.destroy();

      // Timer should be cleared — advancing time won't cause issues.
      vi.advanceTimersByTime(800);
    });
  });

  describe('processEvent', () => {
    it('computes expected paused state for togglePaused', () => {
      const core = new InputFeedbackCore();
      core.processEvent(toggleEvent('togglePaused'), { ...DEFAULT_MEDIA, paused: true });

      expect(core.state.current.paused).toBe(false);
      expect(core.state.current.active).toBe(true);
    });

    it('computes expected paused=true when currently playing', () => {
      const core = new InputFeedbackCore();
      core.processEvent(toggleEvent('togglePaused'), { ...DEFAULT_MEDIA, paused: false });

      expect(core.state.current.paused).toBe(true);
    });

    it('computes label and volumeLevel for toggleMuted', () => {
      const core = new InputFeedbackCore();
      core.processEvent({ action: 'toggleMuted' }, { ...DEFAULT_MEDIA, volume: 0.7, muted: false });

      expect(core.state.current.volumeLevel).toBe('off');
      expect(core.state.current.label).toBe('Muted');
      expect(core.state.current.volumeLabel).toBe('Muted');
    });

    it('computes label and volumeLevel for unmuting', () => {
      const core = new InputFeedbackCore();
      core.processEvent({ action: 'toggleMuted' }, { ...DEFAULT_MEDIA, volume: 0.7, muted: true });

      expect(core.state.current.volumeLevel).toBe('high');
      expect(core.state.current.label).toBe('70%');
      expect(core.state.current.volumeLabel).toBe('70%');
    });

    it('computes expected volumeLevel for volumeStep', () => {
      const core = new InputFeedbackCore();
      core.processEvent({ action: 'volumeStep', value: 0.1 }, { ...DEFAULT_MEDIA, volume: 0.4 });

      expect(core.state.current.volumeLevel).toBe('low');
      expect(core.state.current.label).toBe('50%');
      expect(core.state.current.volumeLabel).toBe('50%');
    });

    it('computes expected fullscreen state', () => {
      const core = new InputFeedbackCore();
      core.processEvent(toggleEvent('toggleFullscreen'), { ...DEFAULT_MEDIA, fullscreen: false });

      expect(core.state.current.fullscreen).toBe(true);
    });

    it('computes expected captions state and label', () => {
      const core = new InputFeedbackCore();
      core.processEvent(toggleEvent('toggleSubtitles'), { ...DEFAULT_MEDIA, subtitlesShowing: false });

      expect(core.state.current.captions).toBe(true);
      expect(core.state.current.label).toBe('Captions on');
      expect(core.state.current.captionsLabel).toBe('Captions on');
    });

    it('computes expected pip state', () => {
      const core = new InputFeedbackCore();
      core.processEvent(toggleEvent('togglePictureInPicture'), { ...DEFAULT_MEDIA, pip: false });

      expect(core.state.current.pip).toBe(true);
    });

    it('clears expected states on dismiss', () => {
      const core = new InputFeedbackCore();
      core.processEvent(toggleEvent('togglePaused'), DEFAULT_MEDIA);
      vi.advanceTimersByTime(800);

      expect(core.state.current.paused).toBeNull();
      expect(core.state.current.volumeLevel).toBeNull();
      expect(core.state.current.fullscreen).toBeNull();
      expect(core.state.current.captions).toBeNull();
      expect(core.state.current.pip).toBeNull();
    });

    it('persists volumeLabel through dismiss', () => {
      const core = new InputFeedbackCore();
      core.processEvent({ action: 'volumeStep', value: 0.1 }, { ...DEFAULT_MEDIA, volume: 0.4 });

      expect(core.state.current.volumeLabel).toBe('50%');

      vi.advanceTimersByTime(800);

      expect(core.state.current.label).toBeNull();
      expect(core.state.current.volumeLabel).toBe('50%');
    });

    it('persists captionsLabel through dismiss', () => {
      const core = new InputFeedbackCore();
      core.processEvent(toggleEvent('toggleSubtitles'), { ...DEFAULT_MEDIA, subtitlesShowing: false });

      expect(core.state.current.captionsLabel).toBe('Captions on');

      vi.advanceTimersByTime(800);

      expect(core.state.current.label).toBeNull();
      expect(core.state.current.captionsLabel).toBe('Captions on');
    });

    it('updates volumeLabel on subsequent volume actions', () => {
      const core = new InputFeedbackCore();
      core.processEvent({ action: 'toggleMuted' }, { ...DEFAULT_MEDIA, volume: 0.7, muted: false });

      expect(core.state.current.volumeLabel).toBe('Muted');

      vi.advanceTimersByTime(800);
      core.processEvent({ action: 'volumeStep', value: 0.1 }, { ...DEFAULT_MEDIA, volume: 0.5 });

      expect(core.state.current.volumeLabel).toBe('60%');
    });
  });

  describe('boundary detection', () => {
    it('sets boundary to max when volume step cannot increase', () => {
      const core = new InputFeedbackCore();
      // First event to make it active
      core.processEvent({ action: 'volumeStep', value: 0.05 }, { ...DEFAULT_MEDIA, volume: 0.95 });
      // Second event at max
      core.processEvent({ action: 'volumeStep', value: 0.05 }, { ...DEFAULT_MEDIA, volume: 1.0 });

      expect(core.state.current.boundary).toBe('max');
    });

    it('sets boundary to min when volume step cannot decrease', () => {
      const core = new InputFeedbackCore();
      core.processEvent({ action: 'volumeStep', value: -0.05 }, { ...DEFAULT_MEDIA, volume: 0.05 });
      core.processEvent({ action: 'volumeStep', value: -0.05 }, { ...DEFAULT_MEDIA, volume: 0 });

      expect(core.state.current.boundary).toBe('min');
    });

    it('does not set boundary on first event (not yet active)', () => {
      const core = new InputFeedbackCore();
      core.processEvent({ action: 'volumeStep', value: 0.05 }, { ...DEFAULT_MEDIA, volume: 1.0 });

      expect(core.state.current.boundary).toBeNull();
    });

    it('auto-clears boundary after delay', () => {
      const core = new InputFeedbackCore();
      core.processEvent({ action: 'volumeStep', value: 0.05 }, { ...DEFAULT_MEDIA, volume: 0.95 });
      core.processEvent({ action: 'volumeStep', value: 0.05 }, { ...DEFAULT_MEDIA, volume: 1.0 });

      expect(core.state.current.boundary).toBe('max');
      vi.advanceTimersByTime(300);
      expect(core.state.current.boundary).toBeNull();
    });

    it('restarts boundary when the same edge is hit repeatedly', () => {
      const core = new InputFeedbackCore();
      core.processEvent({ action: 'volumeStep', value: 0.05 }, { ...DEFAULT_MEDIA, volume: 0.95 });
      core.processEvent({ action: 'volumeStep', value: 0.05 }, { ...DEFAULT_MEDIA, volume: 1.0 });

      expect(core.state.current.boundary).toBe('max');

      core.processEvent({ action: 'volumeStep', value: 0.05 }, { ...DEFAULT_MEDIA, volume: 1.0 });
      expect(core.state.current.boundary).toBeNull();

      vi.advanceTimersByTime(0);
      expect(core.state.current.boundary).toBe('max');

      vi.advanceTimersByTime(299);
      expect(core.state.current.boundary).toBe('max');

      vi.advanceTimersByTime(1);
      expect(core.state.current.boundary).toBeNull();
    });

    it('clears boundary when action changes mid-display', () => {
      const core = new InputFeedbackCore();
      core.processEvent({ action: 'volumeStep', value: 0.05 }, { ...DEFAULT_MEDIA, volume: 0.95 });
      core.processEvent({ action: 'volumeStep', value: 0.05 }, { ...DEFAULT_MEDIA, volume: 1.0 });
      expect(core.state.current.boundary).toBe('max');

      // Switch to a different action within the 300ms boundary-clear window.
      vi.advanceTimersByTime(100);
      core.processEvent(toggleEvent('togglePaused'), { ...DEFAULT_MEDIA, paused: false });

      expect(core.state.current.boundary).toBeNull();
    });

    it('does not reinstate boundary via stale timer after action changes', () => {
      const core = new InputFeedbackCore();
      core.processEvent({ action: 'volumeStep', value: 0.05 }, { ...DEFAULT_MEDIA, volume: 0.95 });
      core.processEvent({ action: 'volumeStep', value: 0.05 }, { ...DEFAULT_MEDIA, volume: 1.0 });

      vi.advanceTimersByTime(100);
      core.processEvent(toggleEvent('togglePaused'), { ...DEFAULT_MEDIA, paused: false });
      expect(core.state.current.boundary).toBeNull();

      // Advance past what would have been the original boundary-clear timer.
      vi.advanceTimersByTime(300);
      expect(core.state.current.boundary).toBeNull();
      expect(core.state.current.action).toBe('togglePaused');
    });

    it('does not reinstate boundary via stale restart timer after action changes', () => {
      const core = new InputFeedbackCore();
      core.processEvent({ action: 'volumeStep', value: 0.05 }, { ...DEFAULT_MEDIA, volume: 0.95 });
      core.processEvent({ action: 'volumeStep', value: 0.05 }, { ...DEFAULT_MEDIA, volume: 1.0 });
      core.processEvent({ action: 'volumeStep', value: 0.05 }, { ...DEFAULT_MEDIA, volume: 1.0 });

      expect(core.state.current.boundary).toBeNull();

      core.processEvent(toggleEvent('togglePaused'), { ...DEFAULT_MEDIA, paused: false });

      vi.advanceTimersByTime(0);
      expect(core.state.current.boundary).toBeNull();
      expect(core.state.current.action).toBe('togglePaused');
    });
  });

  describe('seek clamping', () => {
    it('clamps accumulated seek value at media end', () => {
      const core = new InputFeedbackCore();
      const media = { ...DEFAULT_MEDIA, currentTime: 115, duration: 120 };

      core.processEvent(seekEvent(10, 'right'), media);
      expect(core.state.current.seekTotal).toBe(10);

      // Second seek: room from origin = 120 - 115 - 10 = -5 < 10 → clamp to 0
      core.processEvent(seekEvent(10, 'right'), media);
      expect(core.state.current.seekTotal).toBe(10); // unchanged because value was clamped to 0
    });

    it('clamps accumulated seek value at media start', () => {
      const core = new InputFeedbackCore();
      const media = { ...DEFAULT_MEDIA, currentTime: 5, duration: 120 };

      core.processEvent(seekEvent(-10, 'left'), media);
      expect(core.state.current.seekTotal).toBe(10);

      // Second seek: origin=5, seekTotal=10, room = 5 - 10 = -5 < 10 → clamp to 0
      core.processEvent(seekEvent(-10, 'left'), media);
      expect(core.state.current.seekTotal).toBe(10);
    });

    it('allows full seek when sufficient room', () => {
      const core = new InputFeedbackCore();
      const media = { ...DEFAULT_MEDIA, currentTime: 60, duration: 120 };

      core.processEvent(seekEvent(10, 'right'), media);
      core.processEvent(seekEvent(10, 'right'), media);
      core.processEvent(seekEvent(10, 'right'), media);

      expect(core.state.current.seekTotal).toBe(30);
    });
  });

  describe('custom labels', () => {
    it('uses custom muted label', () => {
      const core = new InputFeedbackCore();
      core.labels.muted = 'Silenciado';
      core.processEvent({ action: 'toggleMuted' }, { ...DEFAULT_MEDIA, volume: 0.5, muted: false });

      expect(core.state.current.label).toBe('Silenciado');
    });

    it('uses custom captions labels', () => {
      const core = new InputFeedbackCore();
      core.labels.captionsOn = 'Sous-titres activés';
      core.processEvent(toggleEvent('toggleSubtitles'), { ...DEFAULT_MEDIA, subtitlesShowing: false });

      expect(core.state.current.label).toBe('Sous-titres activés');
    });
  });
});
