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

  const className = (state: TagState) =>
    state.active
      ? 'inline-flex items-center rounded-full bg-blue-500 px-3 py-1.5 text-white transition-all duration-200'
      : 'inline-flex items-center rounded-full bg-gray-200 px-3 py-1.5 text-gray-700 transition-all duration-200';

  const style = (state: TagState) => ({
    fontSize: state.active ? '1.125rem' : '0.875rem',
  });

  return (
    <div className="flex flex-col gap-4 p-4">
      <button
        type="button"
        className="cursor-pointer self-start rounded-md border border-gray-300 bg-neutral-100 px-4 py-1.5"
        onClick={() => setActive((prev) => !prev)}
      >
        {active ? 'Deactivate' : 'Activate'}
      </button>

      <div className="flex flex-wrap gap-3">
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
