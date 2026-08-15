import { CaptionsRadioGroup, Menu, Text } from '@videojs/core/components';
import { captionsText } from '@videojs/core/i18n/text/menu';
import { CaptionsOffIcon, CheckIcon } from '@videojs/icons/components';
import { type ComponentNode, Template } from '@videojs/jsx';
import styles from '../../styles/components/menu.tailwind';
import { MenuChevron } from './menu-chevron';

declare const HintPrimitive: (props: { children?: unknown; className?: unknown }) => ComponentNode;

export function CaptionsSettingsMenu() {
  return (
    <Menu.Root>
      <Menu.Trigger className={[styles.itemBase, styles.item]}>
        <CaptionsOffIcon className={styles.icon} />
        <Text>{captionsText}</Text>
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
          <Text>{captionsText}</Text>
        </Menu.Item>
        <Menu.Separator className={styles.separator} />
        <CaptionsRadioGroup className={styles.group}>
          <Template name="captions-option">
            <Menu.RadioItem className={[styles.itemBase, styles.item]}>
              <Template.Part name="label">
                <Text />
              </Template.Part>
              <Menu.ItemIndicator forceMount className={styles.indicator}>
                <CheckIcon className={styles.icon} />
              </Menu.ItemIndicator>
            </Menu.RadioItem>
          </Template>
        </CaptionsRadioGroup>
      </Menu.Content>
    </Menu.Root>
  );
}
