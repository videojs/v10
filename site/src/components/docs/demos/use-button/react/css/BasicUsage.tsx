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
    <div className="demo">
      <button ref={buttonRef as Ref<HTMLButtonElement>} {...getButtonProps()} className="button" disabled={disabled}>
        Activated {count} times
      </button>
      <label className="label">
        <input type="checkbox" checked={disabled} onChange={(e) => setDisabled(e.target.checked)} />
        Disabled
      </label>
    </div>
  );
}
