import { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';

type AdaptiveLogoProps = {
  src: string;
  alt: string;
  className?: string;
  imageClassName?: string;
};

const OUTPUT_SIZE = 192;

const AdaptiveLogo = ({ src, alt, className, imageClassName }: AdaptiveLogoProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [processed, setProcessed] = useState(false);

  useEffect(() => {
    setProcessed(false);
    const canvas = canvasRef.current;
    if (!canvas || !src) return;

    let cancelled = false;
    const image = new Image();
    image.crossOrigin = 'anonymous';

    image.onload = () => {
      if (cancelled) return;

      try {
        const sampleSize = 512;
        const scale = Math.min(1, sampleSize / Math.max(image.naturalWidth, image.naturalHeight));
        const width = Math.max(1, Math.round(image.naturalWidth * scale));
        const height = Math.max(1, Math.round(image.naturalHeight * scale));
        const source = document.createElement('canvas');
        source.width = width;
        source.height = height;
        const sourceContext = source.getContext('2d', { willReadFrequently: true });
        if (!sourceContext) return;
        sourceContext.drawImage(image, 0, 0, width, height);

        const pixels = sourceContext.getImageData(0, 0, width, height).data;
        const cornerIndexes = [
          0,
          (width - 1) * 4,
          (height - 1) * width * 4,
          ((height - 1) * width + width - 1) * 4,
        ];
        const background = cornerIndexes.reduce(
          (color, index) => ({
            r: color.r + pixels[index] / 4,
            g: color.g + pixels[index + 1] / 4,
            b: color.b + pixels[index + 2] / 4,
            a: color.a + pixels[index + 3] / 4,
          }),
          { r: 0, g: 0, b: 0, a: 0 },
        );

        let minX = width;
        let minY = height;
        let maxX = -1;
        let maxY = -1;

        for (let y = 0; y < height; y += 1) {
          for (let x = 0; x < width; x += 1) {
            const index = (y * width + x) * 4;
            const alpha = pixels[index + 3];
            const distance = Math.sqrt(
              (pixels[index] - background.r) ** 2 +
              (pixels[index + 1] - background.g) ** 2 +
              (pixels[index + 2] - background.b) ** 2,
            );
            const visible = background.a < 20 ? alpha > 20 : alpha > 20 && distance > 34;
            if (!visible) continue;
            minX = Math.min(minX, x);
            minY = Math.min(minY, y);
            maxX = Math.max(maxX, x);
            maxY = Math.max(maxY, y);
          }
        }

        if (maxX < minX || maxY < minY) return;

        const contentWidth = maxX - minX + 1;
        const contentHeight = maxY - minY + 1;
        const padding = Math.max(2, Math.round(Math.max(contentWidth, contentHeight) * 0.07));
        const cropX = Math.max(0, minX - padding);
        const cropY = Math.max(0, minY - padding);
        const cropWidth = Math.min(width - cropX, contentWidth + padding * 2);
        const cropHeight = Math.min(height - cropY, contentHeight + padding * 2);
        const fitScale = Math.min(OUTPUT_SIZE / cropWidth, OUTPUT_SIZE / cropHeight);
        const drawWidth = cropWidth * fitScale;
        const drawHeight = cropHeight * fitScale;

        canvas.width = OUTPUT_SIZE;
        canvas.height = OUTPUT_SIZE;
        const context = canvas.getContext('2d');
        if (!context) return;
        context.clearRect(0, 0, OUTPUT_SIZE, OUTPUT_SIZE);
        context.drawImage(
          source,
          cropX,
          cropY,
          cropWidth,
          cropHeight,
          (OUTPUT_SIZE - drawWidth) / 2,
          (OUTPUT_SIZE - drawHeight) / 2,
          drawWidth,
          drawHeight,
        );
        setProcessed(true);
      } catch {
        setProcessed(false);
      }
    };

    image.onerror = () => setProcessed(false);
    image.src = src;
    return () => {
      cancelled = true;
    };
  }, [src]);

  return (
    <span className={cn('relative block overflow-hidden bg-white', className)}>
      <img
        src={src}
        alt={alt}
        className={cn('h-full w-full object-contain p-1', processed && 'invisible', imageClassName)}
      />
      <canvas
        ref={canvasRef}
        role="img"
        aria-label={alt}
        className={cn('absolute inset-0 h-full w-full object-contain p-1', !processed && 'invisible')}
      />
    </span>
  );
};

export default AdaptiveLogo;
