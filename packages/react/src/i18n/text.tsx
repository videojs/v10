'use client';

import { isNumber, isString } from '@videojs/utils/predicate';
import type { ComponentProps, ReactNode } from 'react';

import { useTranslator } from './context';

export interface TextProps extends Omit<ComponentProps<'span'>, 'children'> {
  children?: ReactNode;
  token?: string | undefined;
}

/** Renders translated compiler text through a native React span. */
export function Text({ children, token, ...props }: TextProps) {
  const t = useTranslator();
  const fallback = isString(children) || isNumber(children) ? String(children) : undefined;

  return <span {...props}>{token ? t({ key: token, text: fallback ?? token }) : children}</span>;
}
