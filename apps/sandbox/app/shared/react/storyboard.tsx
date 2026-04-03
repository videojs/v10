type StoryboardProps = {
  src?: string | undefined;
};

export function Storyboard({ src }: StoryboardProps) {
  if (!src) return null;
  return <track kind="metadata" label="thumbnails" src={src} />;
}
