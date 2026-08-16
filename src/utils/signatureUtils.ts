/**
 * Trims excess whitespace around drawn strokes from a canvas
 * and returns a crisp, tight DataURL with high contrast.
 */
export function trimAndOptimizeSignature(canvas: HTMLCanvasElement): string {
  const ctx = canvas.getContext('2d');
  if (!ctx) return canvas.toDataURL('image/png');

  const width = canvas.width;
  const height = canvas.height;
  const imgData = ctx.getImageData(0, 0, width, height);
  const data = imgData.data;

  let minX = width;
  let minY = height;
  let maxX = 0;
  let maxY = 0;
  let hasDrawnPixels = false;

  // Scan for non-white/non-transparent ink pixels
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;
      const r = data[idx];
      const g = data[idx + 1];
      const b = data[idx + 2];
      const a = data[idx + 3];

      // Pixel is considered ink if alpha is noticeable and it is not pure/near white
      const isInk = a > 25 && (r < 235 || g < 235 || b < 235);
      if (isInk) {
        hasDrawnPixels = true;
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }

  // If no strokes detected, fallback to standard export
  if (!hasDrawnPixels || minX > maxX || minY > maxY) {
    return canvas.toDataURL('image/png');
  }

  // Add a snug padding (8-14px in canvas coordinate space)
  const padding = Math.max(10, Math.round(width * 0.015));
  const cropX = Math.max(0, minX - padding);
  const cropY = Math.max(0, minY - padding);
  const cropW = Math.min(width - cropX, maxX - minX + 1 + padding * 2);
  const cropH = Math.min(height - cropY, maxY - minY + 1 + padding * 2);

  // Create temporary cropped canvas
  const croppedCanvas = document.createElement('canvas');
  croppedCanvas.width = cropW;
  croppedCanvas.height = cropH;
  const croppedCtx = croppedCanvas.getContext('2d');
  if (!croppedCtx) return canvas.toDataURL('image/png');

  // Draw only the cropped ink region
  croppedCtx.clearRect(0, 0, cropW, cropH);
  croppedCtx.drawImage(canvas, cropX, cropY, cropW, cropH, 0, 0, cropW, cropH);

  // Eliminate any remaining white/grey background and ensure ink is solid black
  const croppedImgData = croppedCtx.getImageData(0, 0, cropW, cropH);
  const pixels = croppedImgData.data;

  for (let i = 0; i < pixels.length; i += 4) {
    const r = pixels[i];
    const g = pixels[i + 1];
    const b = pixels[i + 2];
    const a = pixels[i + 3];

    // If pixel is near-white or light grey, make it 100% transparent (no background shadow)
    if (a < 15 || (r > 215 && g > 215 && b > 215)) {
      pixels[i + 3] = 0; // Alpha 0 = completely transparent
    } else {
      // Solid pitch black ink with smooth alpha edges
      pixels[i] = 0;
      pixels[i + 1] = 0;
      pixels[i + 2] = 0;
      pixels[i + 3] = Math.min(255, Math.round(a * 1.3));
    }
  }

  croppedCtx.putImageData(croppedImgData, 0, 0);

  return croppedCanvas.toDataURL('image/png');
}
