import { renderElement } from '@videojs/react';
import { type ReactNode, useState } from 'react';

interface TagState {
  active: boolean;
}

function Tag({
  className,
  style,
  render,
  active,
  children,
}: renderElement.ComponentProps<TagState> & { active: boolean; children?: ReactNode }) {
  const state: TagState = { active };

  return renderElement(
    'span',
    { className, style, render },
    {
      state,
      props: { children },
      stateAttrMap: { active: 'data-active' },
    }
  );
}

export default function BasicUsage() {
  const [active, setActive] = useState(false);

  const className = (state: TagState) => `tag${state.active ? ' tag-active' : ''}`;

  const style = (state: TagState) => ({
    fontSize: state.active ? '1.125rem' : '0.875rem',
  });

  return (
    <div className="render-element">
      <button type="button" className="toggle" onClick={() => setActive((prev) => !prev)}>
        {active ? 'Deactivate' : 'Activate'}
      </button>

      <div className="tags">
        <Tag active={active} className={className} style={style}>
          Default &lt;span&gt;
        </Tag>

        <Tag active={active} className={className} style={style} render={<strong />}>
          Element &lt;strong&gt;
        </Tag>

        <Tag
          active={active}
          className={className}
          style={style}
          render={(props, state) => <em {...props}>{state.active ? 'Active!' : 'Inactive'}</em>}
        />
      </div>
    </div>
  );
}
