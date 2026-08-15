import { AudioTrackRadioGroup, Menu, Text } from '@videojs/core/components';
import { audioText } from '@videojs/core/i18n/text/menu';
import { CheckIcon, SpeechIcon } from '@videojs/icons/components';
import { type ComponentNode, Template } from '@videojs/jsx';
import styles from '../../styles/components/menu.tailwind';
import { MenuChevron } from './menu-chevron';

declare const HintPrimitive: (props: { children?: unknown; className?: unknown }) => ComponentNode;

export function AudioTrackSettingsMenu() {
  return (
    <Menu.Root>
      <Menu.Trigger className={[styles.itemBase, styles.item]}>
        <SpeechIcon className={styles.icon} />
        <Text>{audioText}</Text>
        <HintPrimitive className={styles.hint}>
          <Template.Part name="selected-label">
            <Text className={styles.hintLabel} />
          </Template.Part>
          <MenuChevron />
        </HintPrimitive>
      </Menu.Trigger>
      <Menu.Content className={styles.submenuPanel}>
        <Menu.Item className={[styles.itemBase, styles.back]}>
          <MenuChevron flipped />
          <Text>{audioText}</Text>
        </Menu.Item>
        <Menu.Separator className={styles.separator} />
        <AudioTrackRadioGroup className={styles.group}>
          <Template name="audio-track-option">
            <Menu.RadioItem className={[styles.itemBase, styles.item]}>
              <Template.Part name="label">
                <Text />
              </Template.Part>
              <Menu.ItemIndicator forceMount className={styles.indicator}>
                <CheckIcon className={styles.icon} />
              </Menu.ItemIndicator>
            </Menu.RadioItem>
          </Template>
        </AudioTrackRadioGroup>
      </Menu.Content>
    </Menu.Root>
  );
}
