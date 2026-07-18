/**
 * Compress / resize an image File before upload (client-side).
 * Returns original file if compression fails or is unnecessary.
 */
export async function compressImageFile(
  file: File,
  options: { maxWidth?: number; maxHeight?: number; quality?: number; maxBytes?: number } = {}
): Promise<File> {
  const maxWidth = options.maxWidth ?? 1600;
  const maxHeight = options.maxHeight ?? 1600;
  const quality = options.quality ?? 0.82;
  const maxBytes = options.maxBytes ?? 1_200_000;

  if (!file.type.startsWith('image/') || file.size <= maxBytes / 2) {
    return file;
  }

  try {
    const bitmap = await createImageBitmap(file);
    const ratio = Math.min(1, maxWidth / bitmap.width, maxHeight / bitmap.height);
    const width = Math.max(1, Math.round(bitmap.width * ratio));
    const height = Math.max(1, Math.round(bitmap.height * ratio));
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return file;
    ctx.drawImage(bitmap, 0, 0, width, height);
    bitmap.close();

    const blob = await new Promise<Blob | null>(resolve => {
      canvas.toBlob(resolve, 'image/jpeg', quality);
    });
    if (!blob) return file;
    if (blob.size > maxBytes && quality > 0.5) {
      return compressImageFile(
        new File([blob], file.name.replace(/\.\w+$/, '.jpg'), { type: 'image/jpeg' }),
        { ...options, quality: quality - 0.12 }
      );
    }
    return new File([blob], file.name.replace(/\.\w+$/, '.jpg'), {
      type: 'image/jpeg',
      lastModified: Date.now(),
    });
  } catch {
    return file;
  }
}

export const UPLOAD_LIMITS = {
  productImageMaxBytes: 2_500_000,
  forumImageMaxBytes: 2_000_000,
  idCardMaxBytes: 3_000_000,
  receiptMaxBytes: 3_000_000,
} as const;

export function assertFileWithinLimit(file: File, maxBytes: number): string | null {
  if (file.size <= maxBytes) return null;
  const mb = (maxBytes / (1024 * 1024)).toFixed(1);
  return `حجم الملف كبير جداً. الحد الأقصى ${mb} ميجابايت.`;
}
