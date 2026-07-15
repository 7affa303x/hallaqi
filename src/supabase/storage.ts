import { supabase, isSupabaseConfigured } from './client';

function guard(): void {
  if (!isSupabaseConfigured()) throw new Error('Supabase غير مُعد');
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
  const { data, error } = await supabase.storage.from(bucket).upload(path, file, {
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
  const uploadedPath = await uploadFile('avatars', path, file);
  if (!uploadedPath) return null;
  return getPublicUrl('avatars', uploadedPath);
}

/**
 * Upload cover image
 */
export async function uploadCover(userId: string, file: File): Promise<string | null> {
  const path = `${userId}/${Date.now()}.${file.name.split('.').pop()}`;
  const uploadedPath = await uploadFile('covers', path, file);
  if (!uploadedPath) return null;
  return getPublicUrl('covers', uploadedPath);
}

/**
 * Upload portfolio item
 */
export async function uploadPortfolioItem(
  professionalId: string,
  file: File
): Promise<string | null> {
  const path = `${professionalId}/${Date.now()}.${file.name.split('.').pop()}`;
  const uploadedPath = await uploadFile('portfolio', path, file);
  if (!uploadedPath) return null;
  return getPublicUrl('portfolio', uploadedPath);
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
  const uploadedPath = await uploadFile('portfolio', path, file);
  if (!uploadedPath) return null;
  return {
    path: uploadedPath,
    url: getPublicUrl('portfolio', uploadedPath),
  };
}

/**
 * Delete portfolio file from storage
 */
export async function deletePortfolioFile(filePath: string): Promise<boolean> {
  return deleteFile('portfolio', filePath);
}

/**
 * Upload review image
 */
export async function uploadReviewImage(
  reviewId: string,
  file: File
): Promise<string | null> {
  const path = `${reviewId}/${Date.now()}.${file.name.split('.').pop()}`;
  const uploadedPath = await uploadFile('reviews', path, file);
  if (!uploadedPath) return null;
  return getPublicUrl('reviews', uploadedPath);
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
