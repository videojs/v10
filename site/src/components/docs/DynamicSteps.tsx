import type { HTMLAttributes, ReactNode } from 'react';

import { twMerge } from '@/utils/twMerge';

export const STEPS_CLASS = 'mx-auto my-8 max-w-3xl';
export const STEP_CLASS =
  'relative grid gap-x-4 pb-10 last:pb-0 before:absolute before:top-8 before:bottom-0 before:left-[0.9375rem] before:w-px before:bg-line last:before:hidden';
export const STEP_NUMBER_CLASS =
  'z-10 flex size-8 items-center justify-center rounded-lg corner-squircle bg-surface-raised text-p3 font-semibold ring-1 ring-line';
export const STEP_TITLE_CLASS = 'm-0 font-sans text-p2 font-semibold normal-case';

interface DynamicStepsProps extends HTMLAttributes<HTMLOListElement> {
  children: ReactNode;
}

interface DynamicStepProps extends HTMLAttributes<HTMLLIElement> {
  children: ReactNode;
  number: number;
  title: string;
}

export function DynamicSteps({ children, className, ...props }: DynamicStepsProps) {
  return (
    <ol {...props} className={twMerge(STEPS_CLASS, className)}>
      {children}
    </ol>
  );
}

export function DynamicStep({ children, className, number, title, ...props }: DynamicStepProps) {
  return (
    <li {...props} className={twMerge(STEP_CLASS, className)} style={{ gridTemplateColumns: '2rem minmax(0, 1fr)' }}>
      <span aria-hidden="true" data-llms-ignore className={STEP_NUMBER_CLASS}>
        {number}
      </span>
      <div className="min-w-0 pt-1">
        <h3 className={STEP_TITLE_CLASS} data-step-title>
          {title}
        </h3>
        <div className="[&>*:last-child]:mb-0!">{children}</div>
      </div>
    </li>
  );
}
