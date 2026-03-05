import { useButton } from '@videojs/react';
import { useState } from 'react';

import './BasicUsage.css';

export default function BasicUsage() {
  const [count, setCount] = useState(0);
  const [disabled, setDisabled] = useState(false);

  const { getButtonProps, buttonRef } = useButton({
    displayName: 'ActivateButton',
    onActivate: () => setCount((c) => c + 1),
    isDisabled: () => disabled,
  });

  return (
    <div className="react-use-button-basic">
      <button ref={buttonRef} {...getButtonProps()} className="react-use-button-basic__button" disabled={disabled}>
        Activated {count} times
      </button>
      <label className="react-use-button-basic__label">
        <input type="checkbox" checked={disabled} onChange={(e) => setDisabled(e.target.checked)} />
        Disabled
      </label>
    </div>
  );
}
