import { audioText, captionsText, qualityText, settingsText, speedText } from '@videojs/core/i18n/text/menu';
import * as $ from '@videojs/core/vjsc';
import { CaptionsOffIcon, ChevronIcon, GearIcon, SpeechIcon, SpeedIcon, SwitchesIcon } from '@videojs/icons/vjsc';
import { Template, Text } from 'vjsc/components';

import { Button } from './button';
import { ButtonTooltip, RadioItem } from './components';
import styles from './skin.styles';

function MenuChevron({ back = false }: { back?: boolean } = {}) {
  return <ChevronIcon className={back ? styles.menuBackChevron : styles.menuForwardChevron} />;
}

function QualityMenu() {
  return (
    <$.Menu.Root>
      <$.QualityRadioGroup.Root>
        <$.Menu.Trigger className={styles.menuItem}>
          <SwitchesIcon className={styles.menuTriggerIcon} />
          <Text token={qualityText.key}>{qualityText.text}</Text>
          <Text className={styles.menuHint}>
            <$.QualityRadioGroup.Value className={styles.menuHintLabel} />
            <MenuChevron />
          </Text>
        </$.Menu.Trigger>
        <$.Menu.Content className={styles.menuContent}>
          <$.Menu.Item className={styles.menuBackItem}>
            <MenuChevron back />
            <Text token={qualityText.key}>{qualityText.text}</Text>
          </$.Menu.Item>
          <$.Menu.Separator className={styles.menuSeparator} />
          <$.QualityRadioGroup.Options className={styles.menuRadioGroup}>
            <Template name="quality-option">
              <RadioItem>
                <Text>
                  <Template.Part name="label" />
                  <Template.Part name="tier" className={styles.menuTier} />
                </Text>
                <Template.Part name="badge" className={styles.menuBadge} />
              </RadioItem>
            </Template>
          </$.QualityRadioGroup.Options>
        </$.Menu.Content>
      </$.QualityRadioGroup.Root>
    </$.Menu.Root>
  );
}

function AudioTrackMenu() {
  return (
    <$.Menu.Root>
      <$.AudioTrackRadioGroup.Root>
        <$.Menu.Trigger className={styles.menuItem}>
          <SpeechIcon className={styles.menuTriggerIcon} />
          <Text token={audioText.key}>{audioText.text}</Text>
          <Text className={styles.menuHint}>
            <$.AudioTrackRadioGroup.Value className={styles.menuHintLabel} />
            <MenuChevron />
          </Text>
        </$.Menu.Trigger>
        <$.Menu.Content className={styles.menuContent}>
          <$.Menu.Item className={styles.menuBackItem}>
            <MenuChevron back />
            <Text token={audioText.key}>{audioText.text}</Text>
          </$.Menu.Item>
          <$.Menu.Separator className={styles.menuSeparator} />
          <$.AudioTrackRadioGroup.Options className={styles.menuRadioGroup}>
            <Template name="audio-track-option">
              <RadioItem>
                <Template.Part name="label" />
              </RadioItem>
            </Template>
          </$.AudioTrackRadioGroup.Options>
        </$.Menu.Content>
      </$.AudioTrackRadioGroup.Root>
    </$.Menu.Root>
  );
}

function PlaybackRateMenu() {
  return (
    <$.Menu.Root>
      <$.PlaybackRateRadioGroup.Root>
        <$.Menu.Trigger className={styles.menuItem}>
          <SpeedIcon className={styles.menuTriggerIcon} />
          <Text token={speedText.key}>{speedText.text}</Text>
          <Text className={styles.menuHint}>
            <$.PlaybackRateRadioGroup.Value className={styles.menuHintLabel} />
            <MenuChevron />
          </Text>
        </$.Menu.Trigger>
        <$.Menu.Content className={styles.menuContent}>
          <$.Menu.Item className={styles.menuBackItem}>
            <MenuChevron back />
            <Text token={speedText.key}>{speedText.text}</Text>
          </$.Menu.Item>
          <$.Menu.Separator className={styles.menuSeparator} />
          <$.PlaybackRateRadioGroup.Options className={styles.menuRadioGroup}>
            <Template name="playback-rate-option">
              <RadioItem>
                <Template.Part name="label" />
              </RadioItem>
            </Template>
          </$.PlaybackRateRadioGroup.Options>
        </$.Menu.Content>
      </$.PlaybackRateRadioGroup.Root>
    </$.Menu.Root>
  );
}

function CaptionsMenu() {
  return (
    <$.Menu.Root>
      <$.CaptionsRadioGroup.Root>
        <$.Menu.Trigger className={styles.menuItem}>
          <CaptionsOffIcon className={styles.menuTriggerIcon} />
          <Text token={captionsText.key}>{captionsText.text}</Text>
          <Text className={styles.menuHint}>
            <$.CaptionsRadioGroup.Value className={styles.menuHintLabel} />
            <MenuChevron />
          </Text>
        </$.Menu.Trigger>
        <$.Menu.Content className={styles.menuContent}>
          <$.Menu.Item className={styles.menuBackItem}>
            <MenuChevron back />
            <Text token={captionsText.key}>{captionsText.text}</Text>
          </$.Menu.Item>
          <$.Menu.Separator className={styles.menuSeparator} />
          <$.CaptionsRadioGroup.Options className={styles.menuRadioGroup}>
            <Template name="captions-option">
              <RadioItem>
                <Template.Part name="label" />
              </RadioItem>
            </Template>
          </$.CaptionsRadioGroup.Options>
        </$.Menu.Content>
      </$.CaptionsRadioGroup.Root>
    </$.Menu.Root>
  );
}

export function SettingsMenu() {
  return (
    <$.Menu.Root side="top" align="center">
      <ButtonTooltip label={<Text token={settingsText.key}>{settingsText.text}</Text>}>
        <$.Menu.Trigger $render={Button} className={styles.settingsTrigger}>
          <GearIcon className={[styles.icon, styles.settingsTriggerIcon]} />
          <Text className={styles.settingsTriggerLabel} token={settingsText.key}>
            {settingsText.text}
          </Text>
        </$.Menu.Trigger>
      </ButtonTooltip>
      <$.Menu.Popup
        keepMounted
        className={[styles.popup, styles.popupSafeArea, styles.menuPopup, styles.menuResizablePopup]}
      >
        <$.Menu.Content className={styles.menuContent}>
          <QualityMenu />
          <AudioTrackMenu />
          <PlaybackRateMenu />
          <CaptionsMenu />
        </$.Menu.Content>
      </$.Menu.Popup>
    </$.Menu.Root>
  );
}
