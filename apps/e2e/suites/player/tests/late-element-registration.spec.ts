import { expect, test } from '@playwright/test';

test('preserves reactive properties across late custom element registration', async ({ page }) => {
  await page.goto('/late-element-registration.html');

  const initial = await page.evaluate(async () => {
    const element = await window.lateRegistrationComplete;

    return {
      connectedLabel: element.connectedLabel,
      label: element.label,
      ownsLabel: Object.hasOwn(element, 'label'),
      renderedLabel: element.renderedLabel,
      updateCount: element.updateCount,
    };
  });

  expect(initial).toEqual({
    connectedLabel: 'pre-upgrade',
    label: 'newer',
    ownsLabel: false,
    renderedLabel: 'newer',
    updateCount: 1,
  });

  const afterUpdate = await page.evaluate(async () => {
    const element = await window.lateRegistrationComplete;

    element.label = 'later';
    await element.updateComplete;

    return {
      label: element.label,
      renderedLabel: element.renderedLabel,
      updateCount: element.updateCount,
    };
  });

  expect(afterUpdate).toEqual({
    label: 'later',
    renderedLabel: 'later',
    updateCount: 2,
  });
});
