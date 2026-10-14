/**
 * @file canvasUtils.ts dosyası, kendi sorumluluğundaki TypeScript sürecini izole eder.
 * Author: Ferhat Cengiz
 */

/**
 * Dosya akışı: Bu dosya yardımcı fonksiyon katmanı olarak çalışır; üst katmandan aldığı veriyi kendi sorumluluğu içinde işler.
 * Buradaki yorumlar özellikle yeni admin ekranlarında aynı parçanın ne zaman ve neden kullanılacağını göstermek için yazıldı.
 */

// [youthside-next eklemesi] verbatimModuleSyntax: tip importu `import type` olmalı (upstream'e önerilecek).
import type { Area } from 'react-easy-crop';

/**
 * createImage, yardımcı fonksiyon katmanı içinde tek bir işi sahiplenen yeniden kullanılabilir parçadır.
 * Bu parçanın ayrı export edilmesi, admin sayfası ve mevcut ekranların aynı davranışı kopyalamadan kullanmasını sağlar.
 */
export const createImage = (url: string): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const image = new Image();
    image.addEventListener('load', () => resolve(image));
    image.addEventListener('error', (error) => reject(error));
    image.setAttribute('crossOrigin', 'anonymous'); // needed to avoid cross-origin issues on CodeSandbox
    image.src = url;
  });

/**
 * getRadianAngle, yardımcı fonksiyon katmanı içinde tek bir işi sahiplenen yeniden kullanılabilir parçadır.
 * Bu parçanın ayrı export edilmesi, admin sayfası ve mevcut ekranların aynı davranışı kopyalamadan kullanmasını sağlar.
 */
export function getRadianAngle(degreeValue: number) {
  return (degreeValue * Math.PI) / 180;
}

/**
 * Returns the new bounding area of a rotated rectangle.
 */
export function rotateSize(width: number, height: number, rotation: number) {
  const rotRad = getRadianAngle(rotation);

  return {
    width:
      Math.abs(Math.cos(rotRad) * width) + Math.abs(Math.sin(rotRad) * height),
    height:
      Math.abs(Math.sin(rotRad) * width) + Math.abs(Math.cos(rotRad) * height),
  };
}

/**
 * This function was adapted from the one in the Readme of https://github.com/DominicTobias/react-image-crop
 */
export async function getCroppedImg(
  imageSrc: string,
  pixelCrop: Area,
  rotation = 0,
  flip = { horizontal: false, vertical: false },
  targetSize?: { width: number; height: number }
): Promise<Blob | null> {
  const image = await createImage(imageSrc);
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');

  if (!ctx) {
    return null;
  }

  const rotRad = getRadianAngle(rotation);

  // calculate bounding box of the rotated image
  const { width: bBoxWidth, height: bBoxHeight } = rotateSize(
    image.width,
    image.height,
    rotation
  );

  // set canvas size to match the bounding box
  canvas.width = bBoxWidth;
  canvas.height = bBoxHeight;

  // translate canvas context to a central location to allow rotating and flipping around the center
  ctx.translate(bBoxWidth / 2, bBoxHeight / 2);
  ctx.rotate(rotRad);
  ctx.scale(flip.horizontal ? -1 : 1, flip.vertical ? -1 : 1);
  ctx.translate(-image.width / 2, -image.height / 2);

  // draw rotated image
  ctx.drawImage(image, 0, 0);

  // croppedAreaPixels values are bounding box relative
  // extract the cropped image using these values
  const data = ctx.getImageData(
    pixelCrop.x,
    pixelCrop.y,
    pixelCrop.width,
    pixelCrop.height
  );

  // set canvas width to final desired crop size - this will clear existing context
  if (targetSize) {
      canvas.width = targetSize.width;
      canvas.height = targetSize.height;

      // We need a temp canvas to hold the full cropped data before resizing
      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = pixelCrop.width;
      tempCanvas.height = pixelCrop.height;
      const tempCtx = tempCanvas.getContext('2d');
      if (tempCtx) {
          tempCtx.putImageData(data, 0, 0);
          // Draw temp canvas to main canvas with resizing
          ctx.drawImage(tempCanvas, 0, 0, pixelCrop.width, pixelCrop.height, 0, 0, targetSize.width, targetSize.height);
      }
  } else {
      canvas.width = pixelCrop.width;
      canvas.height = pixelCrop.height;
      
      // paste generated rotate image at the top left corner
      ctx.putImageData(data, 0, 0);
  }

  // As a blob
  return new Promise((resolve, reject) => {
    canvas.toBlob((file) => {
      resolve(file);
    }, 'image/jpeg');
  });
}

/**
 * Automatically crops an image to a centered square and resizes it to the target size.
 */
export async function getAutoCroppedImg(
    imageSrc: string,
    targetSize: number = 248
): Promise<Blob | null> {
    const image = await createImage(imageSrc);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    if (!ctx) {
        return null;
    }

    // Determine the smallest dimension to create a square crop
    const minDimension = Math.min(image.width, image.height);
    
    // Calculate center crop coordinates
    const sx = (image.width - minDimension) / 2;
    const sy = (image.height - minDimension) / 2;

    // Set canvas to target size
    canvas.width = targetSize;
    canvas.height = targetSize;

    // Draw the cropped and resized image
    ctx.drawImage(
        image,
        sx, sy, minDimension, minDimension, // Source crop
        0, 0, targetSize, targetSize        // Destination resize
    );

    return new Promise((resolve) => {
        canvas.toBlob((file) => {
            resolve(file);
        }, 'image/jpeg', 0.9); // 90% quality
    });
}
