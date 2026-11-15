import { describe, expect, it } from 'vitest';
import {
  orderQuadCorners,
  warpPerspectiveRgba,
} from '../services/cv/geometry';
import { applyScanFilterToRgba } from '../services/filters/scanFilters';

describe('CV geometry and scan filter engine', () => {
  it('orders 4 unordered points into topLeft, topRight, bottomRight, bottomLeft', () => {
    const quad = orderQuadCorners([
      { x: 100, y: 200 },
      { x: 10, y: 20 },
      { x: 10, y: 200 },
      { x: 100, y: 20 },
    ]);
    expect(quad.topLeft).toEqual({ x: 10, y: 20 });
    expect(quad.topRight).toEqual({ x: 100, y: 20 });
    expect(quad.bottomRight).toEqual({ x: 100, y: 200 });
    expect(quad.bottomLeft).toEqual({ x: 10, y: 200 });
  });

  it('warps an RGBA buffer into target dimensions', () => {
    const src = new Uint8Array(4 * 4 * 4).fill(200);
    const dst = warpPerspectiveRgba(
      src,
      4,
      4,
      {
        topLeft: { x: 0, y: 0 },
        topRight: { x: 3, y: 0 },
        bottomRight: { x: 3, y: 3 },
        bottomLeft: { x: 0, y: 3 },
      },
      4,
      4
    );
    expect(dst.length).toBe(4 * 4 * 4);
    expect(dst[0]).toBe(200);
    expect(dst[3]).toBe(255);
  });

  it('applies grayscale and bw_scan filters cleanly', () => {
    const src = new Uint8Array([
      250, 250, 250, 255,
      20, 40, 60, 255,
      240, 240, 240, 255,
      10, 10, 10, 255,
    ]);

    const gray = applyScanFilterToRgba(src, 2, 2, 'grayscale', {
      brightness: 0,
      contrast: 0,
      sharpness: 0,
    });
    expect(gray[4]).toBe(gray[5]);
    expect(gray[5]).toBe(gray[6]);

    const bw = applyScanFilterToRgba(src, 2, 2, 'bw_scan', {
      brightness: 0,
      contrast: 0,
      sharpness: 0,
    });
    for (let i = 0; i < 4; i++) {
      const val = bw[i * 4];
      expect(val === 0 || val === 255).toBe(true);
    }
  });
});
