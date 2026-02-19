import { mergeProps } from '@videojs/react';
import { useState } from 'react';

import './BasicUsage.css';

export default function BasicUsage() {
  const [baseCount, setBaseCount] = useState(0);
  const [externalCount, setExternalCount] = useState(0);

  const baseProps = {
    onClick: () => setBaseCount((c) => c + 1),
    className: 'react-merge-props-basic__base',
    style: { color: '#1e40af' },
  };

  const externalProps = {
    onClick: () => setExternalCount((c) => c + 1),
    className: 'react-merge-props-basic__external',
    style: { fontWeight: 'bold' as const },
  };

  const merged = mergeProps(baseProps, externalProps);

  return (
    <div className="react-merge-props-basic">
      <button {...merged} type="button">
        Click me
      </button>
      <dl className="react-merge-props-basic__counts">
        <div>
          <dt>Base handler</dt>
          <dd>{baseCount}</dd>
        </div>
        <div>
          <dt>External handler</dt>
          <dd>{externalCount}</dd>
        </div>
      </dl>
    </div>
  );
}
