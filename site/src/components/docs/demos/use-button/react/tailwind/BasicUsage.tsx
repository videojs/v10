import { useButton } from '@videojs/react';
import type { Ref } from 'react';
import { useState } from 'react';

export default function BasicUsage() {
  const [count, setCount] = useState(0);
  const [disabled, setDisabled] = useState(false);

  const { getButtonProps, buttonRef } = useButton({
    displayName: 'ActivateButton',
    onActivate: () => setCount((c) => c + 1),
    isDisabled: () => disabled,
  });

  return (
    <div className="flex flex-col gap-3 p-4">
      <button
        ref={buttonRef as Ref<HTMLButtonElement>}
        {...getButtonProps()}
        className="cursor-pointer self-start rounded-md border border-gray-300 bg-neutral-100 px-5 py-2 tabular-nums transition-opacity duration-200 disabled:cursor-not-allowed disabled:opacity-50"
        disabled={disabled}
      >
        Activated {count} times
      </button>
      <label className="flex items-center gap-1.5 text-sm text-gray-500">
        <input type="checkbox" checked={disabled} onChange={(e) => setDisabled(e.target.checked)} />
        Disabled
      </label>
    </div>
  );
}
