/**
 * Persist gallery → AI handoff across screen unmounts.
 * Uses sessionStorage + data URL so the preview survives navigation.
 */
const KEY = 'hallaqi-gallery-handoff-v1';

export interface GalleryHandoff {
  dataUrl: string;
  name: string;
  savedAt: number;
}

export function saveGalleryHandoff(file: File): Promise<GalleryHandoff> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = String(reader.result || '');
      if (!dataUrl) {
        reject(new Error('تعذر قراءة الصورة'));
        return;
      }
      const payload: GalleryHandoff = {
        dataUrl,
        name: file.name,
        savedAt: Date.now(),
      };
      try {
        sessionStorage.setItem(KEY, JSON.stringify(payload));
      } catch {
        // quota — still return for in-memory use
      }
      resolve(payload);
    };
    reader.onerror = () => reject(new Error('تعذر قراءة الصورة'));
    reader.readAsDataURL(file);
  });
}

export function readGalleryHandoff(): GalleryHandoff | null {
  try {
    const raw = sessionStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as GalleryHandoff;
    if (!parsed?.dataUrl) return null;
    // Expire after 1 hour
    if (Date.now() - (parsed.savedAt || 0) > 60 * 60 * 1000) {
      clearGalleryHandoff();
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function clearGalleryHandoff(): void {
  try {
    sessionStorage.removeItem(KEY);
  } catch {
    // ignore
  }
}
