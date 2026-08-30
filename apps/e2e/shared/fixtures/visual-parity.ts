import { expect, type Page, type TestInfo } from '@playwright/test';

export interface VisualCapture {
  readonly name: string;
  readonly image: Buffer;
}

interface PixelComparison {
  readonly actualHeight: number;
  readonly actualWidth: number;
  readonly diff: string | null;
  readonly expectedHeight: number;
  readonly expectedWidth: number;
  readonly maximumChannelDelta: number;
  readonly mismatchedPixels: number;
  readonly totalPixels: number;
}

const MAXIMUM_CHANNEL_DELTA = 8;
const MAXIMUM_MISMATCH_RATIO = 0.001;

/** Compare two captures pixel-for-pixel and attach useful artifacts when they differ. */
export async function expectVisualParity(
  page: Page,
  testInfo: TestInfo,
  expected: VisualCapture,
  actual: VisualCapture
): Promise<void> {
  expect(actual.name).toBe(expected.name);

  const comparison = await comparePixels(page, expected.image, actual.image);
  const ratio = comparison.totalPixels === 0 ? 1 : comparison.mismatchedPixels / comparison.totalPixels;

  if (
    comparison.actualHeight === comparison.expectedHeight &&
    comparison.actualWidth === comparison.expectedWidth &&
    ratio <= MAXIMUM_MISMATCH_RATIO
  ) {
    return;
  }

  await Promise.all([
    testInfo.attach(`${expected.name}-reference`, { body: expected.image, contentType: 'image/png' }),
    testInfo.attach(`${actual.name}-actual`, { body: actual.image, contentType: 'image/png' }),
    comparison.diff
      ? testInfo.attach(`${actual.name}-diff`, {
          body: Buffer.from(comparison.diff, 'base64'),
          contentType: 'image/png',
        })
      : Promise.resolve(),
  ]);

  expect
    .soft(
      comparison,
      [
        `Expected ${actual.name} to match the reference rendering.`,
        `Expected: ${comparison.expectedWidth}×${comparison.expectedHeight}`,
        `Actual: ${comparison.actualWidth}×${comparison.actualHeight}`,
        `Maximum channel delta: ${comparison.maximumChannelDelta}/255`,
        `Different pixels: ${comparison.mismatchedPixels}/${comparison.totalPixels} (${(ratio * 100).toFixed(3)}%)`,
      ].join('\n')
    )
    .toMatchObject({
      actualHeight: comparison.expectedHeight,
      actualWidth: comparison.expectedWidth,
    });
  expect.soft(ratio, `${actual.name} mismatch ratio`).toBeLessThanOrEqual(MAXIMUM_MISMATCH_RATIO);
}

async function comparePixels(page: Page, expected: Buffer, actual: Buffer): Promise<PixelComparison> {
  return page.evaluate(
    async ({ actualSource, allowedChannelDelta, expectedSource }) => {
      const loadImage = (source: string) =>
        new Promise<HTMLImageElement>((resolve, reject) => {
          const image = new Image();

          image.addEventListener('load', () => resolve(image), { once: true });
          image.addEventListener('error', () => reject(new Error('Unable to decode parity screenshot.')), {
            once: true,
          });
          image.src = `data:image/png;base64,${source}`;
        });
      const [expectedImage, actualImage] = await Promise.all([loadImage(expectedSource), loadImage(actualSource)]);
      const width = Math.max(expectedImage.width, actualImage.width);
      const height = Math.max(expectedImage.height, actualImage.height);
      const canvas = document.createElement('canvas');

      canvas.width = width;
      canvas.height = height;

      const context = canvas.getContext('2d', { willReadFrequently: true });
      if (!context) throw new Error('Expected a 2D canvas context.');

      const pixels = (image: HTMLImageElement) => {
        context.clearRect(0, 0, width, height);
        context.drawImage(image, 0, 0);
        return context.getImageData(0, 0, width, height).data;
      };
      const expectedPixels = pixels(expectedImage);
      const actualPixels = pixels(actualImage);
      const diff = context.createImageData(width, height);
      let maximumChannelDelta = 0;
      let mismatchedPixels = 0;

      for (let offset = 0; offset < diff.data.length; offset += 4) {
        const channelDelta = Math.max(
          Math.abs(expectedPixels[offset]! - actualPixels[offset]!),
          Math.abs(expectedPixels[offset + 1]! - actualPixels[offset + 1]!),
          Math.abs(expectedPixels[offset + 2]! - actualPixels[offset + 2]!),
          Math.abs(expectedPixels[offset + 3]! - actualPixels[offset + 3]!)
        );
        const differs = channelDelta > allowedChannelDelta;

        maximumChannelDelta = Math.max(maximumChannelDelta, channelDelta);

        if (differs) {
          mismatchedPixels += 1;
          diff.data.set([255, 0, 255, 255], offset);
        } else {
          const luminance = Math.round(
            (expectedPixels[offset]! + expectedPixels[offset + 1]! + expectedPixels[offset + 2]!) / 3
          );

          diff.data.set([luminance, luminance, luminance, 64], offset);
        }
      }

      context.putImageData(diff, 0, 0);

      return {
        actualHeight: actualImage.height,
        actualWidth: actualImage.width,
        diff: mismatchedPixels === 0 ? null : canvas.toDataURL('image/png').split(',')[1]!,
        expectedHeight: expectedImage.height,
        expectedWidth: expectedImage.width,
        maximumChannelDelta,
        mismatchedPixels,
        totalPixels: width * height,
      };
    },
    {
      actualSource: actual.toString('base64'),
      allowedChannelDelta: MAXIMUM_CHANNEL_DELTA,
      expectedSource: expected.toString('base64'),
    }
  );
}
