type ChaptersProps = {
  src?: string | undefined;
};

export function Chapters({ src }: ChaptersProps) {
  return src ? <track kind="chapters" label="English" srcLang="en" src={src} default /> : null;
}
