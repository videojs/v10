/**
 * Tags a reader can filter releases by: stability first, then whether the
 * release carries breaking changes.
 */
export function releaseTags({ prerelease, breaking }: { prerelease: boolean; breaking: boolean }): string[] {
  return ['Release', prerelease ? 'Prerelease' : 'Stable', ...(breaking ? ['Breaking changes'] : [])];
}
