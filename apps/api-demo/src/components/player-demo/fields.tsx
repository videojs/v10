import { type ReactNode, useState } from 'react';
import { NUMBER_INPUT_CLASS, SET_BUTTON_CLASS } from './styles';

/** A labeled section in the controls panel. */
export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-2">
      <span className="font-display text-xs uppercase tracking-wide text-faded-black dark:text-manila-light">
        {label}
      </span>
      {children}
    </div>
  );
}

/**
 * A number text field with a "Set" button. Holds its own draft value so the
 * live media value doesn't fight what the user is typing.
 */
export function ApplyNumberField({
  placeholder,
  step,
  min,
  ariaLabel,
  disabled,
  onApply,
}: {
  placeholder: string;
  step?: string;
  min?: string;
  ariaLabel: string;
  disabled?: boolean;
  onApply: (value: number) => void;
}) {
  const [draft, setDraft] = useState('');

  return (
    <form
      className="flex gap-2"
      onSubmit={(event) => {
        event.preventDefault();
        const value = Number(draft);
        if (draft.trim() !== '' && Number.isFinite(value)) onApply(value);
        setDraft('');
      }}
    >
      <input
        type="number"
        inputMode="decimal"
        step={step}
        min={min}
        value={draft}
        placeholder={placeholder}
        aria-label={ariaLabel}
        disabled={disabled}
        onChange={(event) => setDraft(event.target.value)}
        className={NUMBER_INPUT_CLASS}
      />
      <button type="submit" disabled={disabled} className={SET_BUTTON_CLASS}>
        Set
      </button>
    </form>
  );
}

/** Source URL input with a Load button for testing arbitrary assets. */
export function SourceField({ src, onLoad }: { src: string; onLoad: (next: string) => void }) {
  const [draft, setDraft] = useState(src);

  return (
    <form
      className="flex gap-2"
      onSubmit={(event) => {
        event.preventDefault();
        const next = draft.trim();
        if (next) onLoad(next);
      }}
    >
      <input
        type="url"
        value={draft}
        placeholder="https://…/playlist.m3u8"
        aria-label="Source URL"
        onChange={(event) => setDraft(event.target.value)}
        className={NUMBER_INPUT_CLASS}
      />
      <button type="submit" className={SET_BUTTON_CLASS}>
        Load
      </button>
    </form>
  );
}
