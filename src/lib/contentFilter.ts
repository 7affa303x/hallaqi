/**
 * Lightweight client-side content filter for forum UGC.
 * Blocks obvious swearing / sexual content in Arabic + Latin.
 * Not a substitute for reports — just first-line auto reject.
 */

const BLOCKED_PATTERNS: RegExp[] = [
  /نيك|كس\s|كسك|شرموط|قحب|زب\b|طيز|ديوث|لعنة|يلعن/i,
  /fuck|shit|bitch|asshole|porn|xxx|sex\b|nude|naked/i,
  /سكس|اباحي|عريان|نيكني|قحبة|شرموطة/i,
  /https?:\/\/\S+\.(ru|xyz)\b/i, // common spam TLDs
];

export function findBlockedContent(text: string): string | null {
  const normalized = text.replace(/\s+/g, ' ').trim();
  if (!normalized) return null;
  for (const pattern of BLOCKED_PATTERNS) {
    if (pattern.test(normalized)) {
      return 'المحتوى يحتوي على ألفاظ غير لائقة أو ممنوعة. عدّل النص ثم أعد المحاولة.';
    }
  }
  return null;
}

export function assertCleanContent(text: string): void {
  const blocked = findBlockedContent(text);
  if (blocked) throw new Error(blocked);
}
