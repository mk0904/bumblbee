import { expect, test } from 'vitest';
import { supportsDesktop } from '../src/components/DesktopOnly.jsx';

test('desktop console requires a sufficiently large desktop viewport', () => {
  expect(supportsDesktop({ width: 1440, height: 900, userAgent: 'Macintosh' }).supported).toBe(
    true,
  );
  expect(supportsDesktop({ width: 1100, height: 650, userAgent: 'Windows NT' }).supported).toBe(
    true,
  );
  expect(supportsDesktop({ width: 1024, height: 900, userAgent: 'Macintosh' })).toEqual({
    mobile: false,
    supported: false,
  });
});
test('phones and tablets remain unsupported even in landscape or desktop-sized viewports', () => {
  for (const userAgent of ['iPhone', 'Android Tablet', 'iPad'])
    expect(supportsDesktop({ width: 1400, height: 900, userAgent }).supported).toBe(false);
  expect(
    supportsDesktop({
      width: 1400,
      height: 900,
      userAgent: 'Macintosh',
      touchPoints: 5,
      coarse: true,
    }).mobile,
  ).toBe(true);
});
