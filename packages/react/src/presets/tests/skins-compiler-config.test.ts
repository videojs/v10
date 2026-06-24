import { compileProject } from '@videojs/compiler';
import { describe, expect, it } from 'vitest';
import config from '../../../skins.compiler.config';

const compact = (value: string): string => value.replace(/\s+/g, '');

describe('skins compiler config', () => {
  it('lowers the default video source skin to a React Tailwind slice', async () => {
    const result = await compileProject(config);
    const output = result.files.find(
      (file) => file.type === 'chunk' && file.fileName.endsWith('default-video.generated.tailwind.tsx')
    );

    expect(result.diagnostics).toEqual([]);
    expect(output).toBeDefined();
    const code = output!.source;

    expect(code).not.toContain('@videojs/core/components');
    expect(code).not.toContain('@videojs/icons/components');
    expect(code).not.toContain('./tailwind/video.tailwind');
    expect(code).toContain('from "@videojs/skins/default/tailwind/video.tailwind"');
    expect(code).toContain('from "@videojs/utils/style"');
    expect(code).toContain('from "@/player/context"');
    expect(code).toContain('from "@/ui/airplay-button"');
    expect(code).toContain('from "@/ui/buffering-indicator"');
    expect(code).toContain('from "@/ui/error-dialog"');
    expect(code).toContain('from "@/ui/overlay"');
    expect(code).toContain('from "@/ui/pip-button"');
    expect(code).toContain('from "@/ui/play-button"');
    expect(code).toContain('from "@/ui/poster"');
    expect(code).not.toContain('from "@/ui/text"');
    expect(code).not.toContain('from "@/ui/slider"');
    expect(code).toContain('from "@/utils/use-render"');
    expect(code).toContain('from "@videojs/utils/predicate"');
    expect(code).toContain('from "@/icons"');
    expect(code).not.toContain('from "../skin-renderers"');
    expect(code).toContain('from "../types"');
    expect(code).toContain('import type { ReactNode } from "react"');

    const compactCode = compact(code);
    expect(compactCode).toContain(compact('export interface DefaultVideoSkinProps extends BaseVideoSkinProps'));
    expect(compactCode).toContain(compact('const iconButton = [button.base, button.subtle, button.icon];'));
    expect(compactCode).toContain(compact('children?: ReactNode | undefined;'));
    expect(compactCode).toContain(
      compact('DefaultVideoSkin({ className, children, poster, ...rest }: DefaultVideoSkinProps)')
    );
    expect(compactCode).toContain(compact('<Container className={cn(container, className)} {...rest}>'));
    expect(compactCode).toContain(
      compact(
        '{poster && <Poster src={isString(poster) ? poster : undefined} render={isRenderProp(poster) ? poster : undefined} />}'
      )
    );
    expect(compactCode).toContain(compact('<BufferingIndicator className={bufferingIndicator.root}>'));
    expect(compactCode).toContain(compact('<SpinnerIcon className={icon} />'));
    expect(compactCode).not.toContain('BufferingIndicatorRoot');
    expect(compactCode).not.toContain('bufferingIndicator.container');
    expect(compactCode).toContain(compact('<ErrorDialog.Popup className={error.popup}>'));
    expect(compactCode).toContain(
      compact('<ErrorDialog.Title className={error.title}>Something went wrong.</ErrorDialog.Title>')
    );
    expect(compactCode).toContain(compact('<ErrorDialog.Description className={error.description} />'));
    expect(compactCode).toContain(
      compact('<ErrorDialog.Close className={cn(button.base, button.primary, error.close)}>OK</ErrorDialog.Close>')
    );
    expect(compactCode).not.toContain('ErrorDialog.Panel');
    expect(compactCode).not.toContain('ErrorDialog.Content');
    expect(compactCode).not.toContain('ErrorDialog.Actions');
    expect(compactCode).toContain(compact('<Controls.Root className={controls} data-controls="">'));
    expect(compactCode).toContain(compact('<Overlay className={overlay} />'));
    expect(compactCode).not.toContain(compact('<div className={overlay} />'));
    expect(compactCode).toContain(compact('<Tooltip.Trigger render={<PlayButton'));
    expect(compactCode).toContain(compact('<PlayButton className={cn(iconButton, playIcon.button)} type="button">'));
    expect(compactCode).toContain(
      compact('<SeekButton seconds={-SEEK_TIME} className={cn(iconButton, seek.button)} type="button">')
    );
    expect(compactCode).toContain(compact('<SeekIcon className={cn(icon, iconFlipped)} />'));
    expect(compactCode).toContain(compact('<span className={cn(seek.label, seek.labelBackward)}>{SEEK_TIME}</span>'));
    expect(compactCode).toContain(
      compact('<SeekButton seconds={SEEK_TIME} className={cn(iconButton, seek.button)} type="button">')
    );
    expect(compactCode).toContain(compact('<span className={cn(seek.label, seek.labelForward)}>{SEEK_TIME}</span>'));
    expect(compactCode).not.toContain('iconContainer');
    expect(compactCode).not.toContain('<Text');
    expect(compactCode).not.toContain(compact('render={<Button />}'));
    expect(compactCode).toContain(compact('<TimeSlider.Root className={slider.root}>'));
    expect(compactCode).toContain(compact('<TimeSlider.Track className={slider.track}>'));
    expect(compactCode).toContain(compact('<TimeSlider.Fill className={cn(slider.fill.base, slider.fill.fill)} />'));
    expect(compactCode).toContain(
      compact('<TimeSlider.Buffer className={cn(slider.fill.base, slider.fill.buffer)} />')
    );
    expect(compactCode).toContain(
      compact('<TimeSlider.Thumb className={cn(slider.thumb.base, slider.thumb.interactive)} />')
    );
    expect(compactCode).toContain(compact('<TimeSlider.Preview className={slider.preview}>'));
    expect(compactCode).toContain(compact('<TimeSlider.Value type="pointer" className={slider.value} />'));
    expect(compactCode).not.toContain('SliderTrack');
    expect(compactCode).not.toContain('className={[');
  });
});
