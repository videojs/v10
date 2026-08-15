import { Menu, QualityRadioGroup, Text } from '@videojs/core/components';
import { qualityText } from '@videojs/core/i18n/text/menu';
import { CheckIcon, SwitchesIcon } from '@videojs/icons/components';
import { type ComponentNode, Template } from '@videojs/jsx';
import styles from '../../styles/components/menu.tailwind';
import { MenuChevron } from './menu-chevron';

declare const HintPrimitive: (props: { children?: unknown; className?: unknown }) => ComponentNode;
declare const OptionLabelPrimitive: (props: { children?: unknown }) => ComponentNode;

export function QualitySettingsMenu() {
  return (
    <Menu.Root>
      <Menu.Trigger className={[styles.itemBase, styles.item]}>
        <SwitchesIcon className={styles.icon} />
        <Text>{qualityText}</Text>
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
          <Text>{qualityText}</Text>
        </Menu.Item>
        <Menu.Separator className={styles.separator} />
        <QualityRadioGroup className={styles.group}>
          <Template name="quality-option">
            <Menu.RadioItem className={[styles.itemBase, styles.item]}>
              <OptionLabelPrimitive>
                <Template.Part name="label">
                  <Text />
                </Template.Part>
                <Template.Part name="tier">
                  <Text className={styles.tier} />
                </Template.Part>
              </OptionLabelPrimitive>
              <Template.Part name="badge">
                <Text className={styles.badge} />
              </Template.Part>
              <Menu.ItemIndicator forceMount className={styles.indicator}>
                <CheckIcon className={styles.icon} />
              </Menu.ItemIndicator>
            </Menu.RadioItem>
          </Template>
        </QualityRadioGroup>
      </Menu.Content>
    </Menu.Root>
  );
}
