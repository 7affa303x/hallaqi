import { supabase, isSupabaseConfigured, STORAGE } from './client';

function guard(): void {
  if (!isSupabaseConfigured()) throw new Error('Supabase غير مُعد');
}

const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;
const ALLOWED_UPLOAD_TYPES = new Set([
  'image/jpeg', 'image/png', 'image/webp', 'video/mp4', 'application/pdf',
]);

async function optimizeImage(file: File): Promise<File> {
  if (!file.type.startsWith('image/') || typeof createImageBitmap !== 'function') return file;
  const bitmap = await createImageBitmap(file);
  const maxDimension = 1600;
  const scale = Math.min(1, maxDimension / Math.max(bitmap.width, bitmap.height));
  if (scale === 1 && file.size < 1_000_000) {
    bitmap.close();
    return file;
  }

  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(bitmap.width * scale));
  canvas.height = Math.max(1, Math.round(bitmap.height * scale));
  const context = canvas.getContext('2d');
  if (!context) {
    bitmap.close();
    return file;
  }
  context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  const blob = await new Promise<Blob | null>(resolve => {
    canvas.toBlob(resolve, 'image/webp', 0.82);
  });
  if (!blob || blob.size >= file.size) return file;
  return new File([blob], file.name.replace(/\.[^.]+$/, '.webp'), { type: 'image/webp' });
}

/**
 * Upload a file to a Supabase Storage bucket
 */
export async function uploadFile(
  bucket: string,
  path: string,
  file: File
): Promise<string | null> {
  guard();
  if (!ALLOWED_UPLOAD_TYPES.has(file.type)) {
    throw new Error('نوع الملف غير مدعوم');
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    throw new Error('حجم الملف يتجاوز 10 ميغابايت');
  }
  const preparedFile = await optimizeImage(file);
  const finalPath = preparedFile === file ? path : path.replace(/\.[^.]+$/, '.webp');
  const { data, error } = await supabase.storage.from(bucket).upload(finalPath, preparedFile, {
    cacheControl: '3600',
    upsert: true,
  });
  if (error) {
    console.error('Upload error:', error);
    return null;
  }
  return data?.path || null;
}

/**
 * Get a public URL for a file in a bucket
 */
export function getPublicUrl(bucket: string, path: string): string {
  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  return data.publicUrl;
}

export async function getSignedUrl(bucket: string, path: string, expiresIn = 900): Promise<string> {
  guard();
  const { data, error } = await supabase.storage.from(bucket).createSignedUrl(path, expiresIn);
  if (error) throw new Error(error.message);
  return data.signedUrl;
}

/**
 * Delete a file from a bucket
 */
export async function deleteFile(bucket: string, path: string): Promise<boolean> {
  guard();
  const { error } = await supabase.storage.from(bucket).remove([path]);
  if (error) {
    console.error('Delete error:', error);
    return false;
  }
  return true;
}

/**
 * Upload avatar image
 */
export async function uploadAvatar(userId: string, file: File): Promise<string | null> {
  const path = `${userId}/${Date.now()}.${file.name.split('.').pop()}`;
  const uploadedPath = await uploadFile(STORAGE.AVATARS, path, file);
  if (!uploadedPath) return null;
  return getPublicUrl(STORAGE.AVATARS, uploadedPath);
}

/**
 * Upload cover image
 */
export async function uploadCover(userId: string, file: File): Promise<string | null> {
  const path = `${userId}/${Date.now()}.${file.name.split('.').pop()}`;
  const uploadedPath = await uploadFile(STORAGE.COVERS, path, file);
  if (!uploadedPath) return null;
  return getPublicUrl(STORAGE.COVERS, uploadedPath);
}

/**
 * Upload portfolio item
 */
export async function uploadPortfolioItem(
  professionalId: string,
  file: File
): Promise<string | null> {
  const path = `${professionalId}/${Date.now()}.${file.name.split('.').pop()}`;
  const uploadedPath = await uploadFile(STORAGE.PORTFOLIO, path, file);
  if (!uploadedPath) return null;
  return getPublicUrl(STORAGE.PORTFOLIO, uploadedPath);
}

/**
 * Upload portfolio item with metadata (caption, type, sort_order)
 * Returns both the file path and public URL
 */
export async function uploadPortfolioItemWithMeta(
  professionalId: string,
  file: File
): Promise<{ path: string; url: string } | null> {
  const ext = file.name.split('.').pop();
  const path = `${professionalId}/${Date.now()}.${ext}`;
  const uploadedPath = await uploadFile(STORAGE.PORTFOLIO, path, file);
  if (!uploadedPath) return null;
  return {
    path: uploadedPath,
    url: getPublicUrl(STORAGE.PORTFOLIO, uploadedPath),
  };
}

/**
 * Delete portfolio file from storage
 */
export async function deletePortfolioFile(filePath: string): Promise<boolean> {
  return deleteFile(STORAGE.PORTFOLIO, filePath);
}

/**
 * Upload review image
 */
export async function uploadReviewImage(
  userId: string,
  file: File
): Promise<string | null> {
  const path = `${userId}/${Date.now()}.${file.name.split('.').pop()}`;
  const uploadedPath = await uploadFile(STORAGE.REVIEWS, path, file);
  if (!uploadedPath) return null;
  return getPublicUrl(STORAGE.REVIEWS, uploadedPath);
}

export async function uploadForumImage(userId: string, file: File): Promise<string | null> {
  const path = `${userId}/${Date.now()}.${file.name.split('.').pop()}`;
  const uploadedPath = await uploadFile(STORAGE.FORUM, path, file);
  if (!uploadedPath) return null;
  return getPublicUrl(STORAGE.FORUM, uploadedPath);
}

export async function uploadIdCard(userId: string, file: File): Promise<string | null> {
  const path = `${userId}/${Date.now()}.${file.name.split('.').pop()}`;
  return uploadFile(STORAGE.ID_CARDS, path, file);
}

/**
 * List files in a folder
 */
export async function listFiles(bucket: string, folder: string) {
  guard();
  const { data, error } = await supabase.storage.from(bucket).list(folder);
  if (error) {
    console.error('List error:', error);
    return [];
  }
  return data || [];
}
