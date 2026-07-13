/**
 * Client-side center-crop + downscale, so what the user previews at upload
 * time is pixel-identical to what gets displayed later — no surprise crop
 * happens after the fact.
 */
export function processCoverImage(
  file: File,
  aspect = 16 / 9,
  maxWidth = 1600,
  quality = 0.85,
): Promise<{ file: File; previewUrl: string }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(objectUrl);

      let cropW = img.width;
      let cropH = img.width / aspect;
      if (cropH > img.height) {
        cropH = img.height;
        cropW = img.height * aspect;
      }
      const cropX = (img.width - cropW) / 2;
      const cropY = (img.height - cropH) / 2;

      const outW = Math.min(maxWidth, cropW);
      const outH = outW / aspect;

      const canvas = document.createElement('canvas');
      canvas.width = outW;
      canvas.height = outH;
      const ctx = canvas.getContext('2d');
      if (!ctx) { reject(new Error('Canvas not supported')); return; }
      ctx.drawImage(img, cropX, cropY, cropW, cropH, 0, 0, outW, outH);

      canvas.toBlob((blob) => {
        if (!blob) { reject(new Error('Failed to encode image')); return; }
        const name = file.name.replace(/\.[^.]+$/, '') + '.jpg';
        resolve({
          file: new File([blob], name, { type: 'image/jpeg' }),
          previewUrl: canvas.toDataURL('image/jpeg', quality),
        });
      }, 'image/jpeg', quality);
    };

    img.onerror = () => { URL.revokeObjectURL(objectUrl); reject(new Error('Failed to load image')); };
    img.src = objectUrl;
  });
}
