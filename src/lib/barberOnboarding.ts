/**
 * Barber profile completion progress — derived from live data,
 * with optional "continue later" dismissal in localStorage.
 */
const LATER_KEY = 'hallaqi-barber-onboarding-later-v1';
const CELEBRATED_KEY = 'hallaqi-barber-onboarding-celebrated-v1';

export type OnboardingStepId =
  | 'info'
  | 'services'
  | 'cover'
  | 'portfolio'
  | 'verification';

export interface OnboardingStepDef {
  id: OnboardingStepId;
  label: string;
  hint: string;
  /** Approximate milestone when this step completes (display only). */
  milestone: number;
}

export const ONBOARDING_STEPS: OnboardingStepDef[] = [
  { id: 'info', label: 'معلومات العمل', hint: 'الاسم والنبذة', milestone: 20 },
  { id: 'services', label: 'الخدمات والأسعار', hint: 'أضف خدمة واحدة على الأقل', milestone: 40 },
  { id: 'cover', label: 'صورة الغلاف', hint: 'صورة تعكس محلك', milestone: 60 },
  { id: 'portfolio', label: 'معرض الأعمال', hint: 'أضف صوراً من أعمالك', milestone: 80 },
  { id: 'verification', label: 'توثيق الهوية', hint: 'يزيد ثقة العملاء', milestone: 100 },
];

export interface OnboardingProgressInput {
  hasNameAndBio: boolean;
  hasServices: boolean;
  hasCover: boolean;
  hasPortfolio: boolean;
  isVerified: boolean;
}

export function computeOnboardingProgress(input: OnboardingProgressInput) {
  const complete: Record<OnboardingStepId, boolean> = {
    info: input.hasNameAndBio,
    services: input.hasServices,
    cover: input.hasCover,
    portfolio: input.hasPortfolio,
    verification: input.isVerified,
  };
  const doneCount = ONBOARDING_STEPS.filter(s => complete[s.id]).length;
  const percent = Math.round((doneCount / ONBOARDING_STEPS.length) * 100);
  const next = ONBOARDING_STEPS.find(s => !complete[s.id]) || null;
  return { complete, doneCount, percent, next, total: ONBOARDING_STEPS.length };
}

export function markOnboardingLater(userId: string): void {
  try {
    localStorage.setItem(`${LATER_KEY}:${userId}`, String(Date.now()));
  } catch { /* ignore */ }
}

export function clearOnboardingLater(userId: string): void {
  try {
    localStorage.removeItem(`${LATER_KEY}:${userId}`);
  } catch { /* ignore */ }
}

/** True if user tapped "continue later" within the last 7 days and progress < 100. */
export function isOnboardingDeferred(userId: string): boolean {
  try {
    const raw = localStorage.getItem(`${LATER_KEY}:${userId}`);
    if (!raw) return false;
    const ts = Number(raw);
    if (!Number.isFinite(ts)) return false;
    return Date.now() - ts < 7 * 24 * 60 * 60 * 1000;
  } catch {
    return false;
  }
}

export function hasCelebratedOnboarding(userId: string): boolean {
  try {
    return localStorage.getItem(`${CELEBRATED_KEY}:${userId}`) === '1';
  } catch {
    return false;
  }
}

export function markOnboardingCelebrated(userId: string): void {
  try {
    localStorage.setItem(`${CELEBRATED_KEY}:${userId}`, '1');
  } catch { /* ignore */ }
}
