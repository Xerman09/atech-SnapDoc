import * as jpeg from 'jpeg-js';

function uint8ArrayToBase64(bytes: Uint8Array): string {
  let binary = '';
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, i + chunkSize);
    binary += String.fromCharCode(...chunk);
  }
  return globalThis.btoa(binary);
}

/**
 * Generates a 480x640 JPEG data URI of a crisp tilted paper document on a dark desk
 * so users can test edge detection, perspective crop, filters, and PDF export
 * without needing a physical camera.
 */
export function createSampleDocumentDataUri(): string {
  const width = 480;
  const height = 640;
  const rgba = new Uint8Array(width * height * 4);

  // Dark wooden/slate desk background
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;
      rgba[idx] = 34;
      rgba[idx + 1] = 38;
      rgba[idx + 2] = 46;
      rgba[idx + 3] = 255;
    }
  }

  // Draw a slightly tilted white paper sheet inside the frame
  for (let y = 70; y < 570; y++) {
    const t = (y - 70) / 500;
    const leftX = Math.round(75 - t * 22);
    const rightX = Math.round(415 + t * 18);

    for (let x = leftX; x <= rightX; x++) {
      const idx = (y * width + x) * 4;
      // Subtle paper lighting gradient
      const shade = Math.round(248 - t * 18);
      rgba[idx] = shade;
      rgba[idx + 1] = shade;
      rgba[idx + 2] = Math.min(255, shade + 2);
      rgba[idx + 3] = 255;

      // Simulated header bar & text lines on the document
      const relX = (x - leftX) / Math.max(1, rightX - leftX);
      const isHeader = y > 105 && y < 130 && relX > 0.1 && relX < 0.65;
      const isLine =
        relX > 0.1 &&
        relX < 0.88 &&
        y > 165 &&
        y < 510 &&
        y % 34 >= 0 &&
        y % 34 < 8;

      if (isHeader || isLine) {
        rgba[idx] = 40;
        rgba[idx + 1] = 44;
        rgba[idx + 2] = 52;
      }
    }
  }

  const encoded = jpeg.encode({ data: rgba, width, height }, 88);
  return `data:image/jpeg;base64,${uint8ArrayToBase64(encoded.data)}`;
}
