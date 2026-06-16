import { Container } from '@videojs/core/components';
import { cn } from '@videojs/utils/style';

const root = cn(
  'relative w-full h-full object-cover',
  '[&>video]:absolute [&>video]:inset-0 [&>video]:w-full [&>video]:h-full [&>video]:object-[inherit]',
  '[&>.media]:absolute [&>.media]:inset-0 [&>.media]:w-full [&>.media]:h-full [&>.media]:object-[inherit]',
  '[&>:where(img,picture)]:w-full [&>:where(img,picture)]:h-full [&>:where(img,picture)]:object-[inherit]'
);

// Children are typed as `any` because the compiled artifact targets multiple
// frameworks and each has its own children type (React's `ReactNode`, etc.).
// `unknown` would round-trip safely under the constrained dialect but is not
// assignable to those framework-specific slots.
// biome-ignore lint/suspicious/noExplicitAny: see comment above.
type SkinChildren = any;

export interface BackgroundSkinProps {
  className?: string;
  children?: SkinChildren;
}

export function BackgroundSkin({ className, children }: BackgroundSkinProps) {
  return (
    <Container data-skin="default-background" className={cn(root, className)}>
      {children}
    </Container>
  );
}
