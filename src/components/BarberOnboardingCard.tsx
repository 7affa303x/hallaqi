import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, ChevronLeft, PartyPopper, Sparkles } from 'lucide-react';
import {
  ONBOARDING_STEPS,
  computeOnboardingProgress,
  markOnboardingLater,
  clearOnboardingLater,
  isOnboardingDeferred,
  hasCelebratedOnboarding,
  markOnboardingCelebrated,
  type OnboardingProgressInput,
  type OnboardingStepId,
} from '@/lib/barberOnboarding';

type ThemeColors = {
  primary: string;
  surface: string;
  border: string;
  text: string;
  textMuted: string;
  success: string;
  background: string;
  accent: string;
};

interface Props {
  userId: string;
  progressInput: OnboardingProgressInput;
  colors: ThemeColors;
  onContinue: (stepId: OnboardingStepId) => void;
  onDismissLater?: () => void;
}

export default function BarberOnboardingCard({
  userId,
  progressInput,
  colors,
  onContinue,
  onDismissLater,
}: Props) {
  const progress = computeOnboardingProgress(progressInput);
  const [deferred, setDeferred] = useState(() => isOnboardingDeferred(userId));
  const [celebrate, setCelebrate] = useState(false);

  useEffect(() => {
    if (progress.percent < 100) return;
    if (hasCelebratedOnboarding(userId)) return;
    setCelebrate(true);
    markOnboardingCelebrated(userId);
    clearOnboardingLater(userId);
    const t = window.setTimeout(() => setCelebrate(false), 4200);
    return () => window.clearTimeout(t);
  }, [progress.percent, userId]);

  if (progress.percent >= 100 && !celebrate) return null;

  if (deferred && progress.percent < 100 && !celebrate) {
    return (
      <div className="px-4 mt-4">
        <button
          type="button"
          onClick={() => {
            clearOnboardingLater(userId);
            setDeferred(false);
          }}
          className="w-full p-3 rounded-2xl border text-right flex items-center gap-3"
          style={{ backgroundColor: colors.surface, borderColor: colors.border }}
        >
          <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: `${colors.primary}15` }}>
            <Sparkles size={18} style={{ color: colors.primary }} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold" style={{ color: colors.text }}>أكمل ملفك المهني · {progress.percent}%</p>
            <p className="text-[10px]" style={{ color: colors.textMuted }}>اضغط للمتابعة من حيث توقفت</p>
          </div>
          <ChevronLeft size={16} style={{ color: colors.textMuted }} />
        </button>
      </div>
    );
  }

  return (
    <div className="px-4 mt-4">
      <AnimatePresence>
        {celebrate && (
          <motion.div
            initial={{ opacity: 0, scale: 0.92, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="p-5 rounded-2xl border text-center mb-3 overflow-hidden relative"
            style={{ backgroundColor: colors.surface, borderColor: `${colors.success}55` }}
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: [0, 1.2, 1] }}
              transition={{ duration: 0.55 }}
              className="w-14 h-14 mx-auto rounded-full flex items-center justify-center"
              style={{ backgroundColor: `${colors.success}18` }}
            >
              <PartyPopper size={28} style={{ color: colors.success }} />
            </motion.div>
            <motion.p
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="text-sm font-black mt-3"
              style={{ color: colors.text }}
            >
              أحسنت! ملفك مكتمل 100%
            </motion.p>
            <p className="text-[11px] mt-1" style={{ color: colors.textMuted }}>
              عملاؤك سيرون بروفايلاً أقوى — بالتوفيق!
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {progress.percent < 100 && (
        <div className="p-4 rounded-2xl border overflow-hidden" style={{ backgroundColor: colors.surface, borderColor: `${colors.primary}40` }}>
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-sm font-bold" style={{ color: colors.text }}>أكمل ملفك المهني</p>
              <p className="text-[10px] mt-0.5" style={{ color: colors.textMuted }}>
                خطوة {progress.doneCount + 1} من {progress.total}
                {progress.next ? ` · التالي: ${progress.next.label}` : ''}
              </p>
            </div>
            <motion.span
              key={progress.percent}
              initial={{ scale: 0.85, opacity: 0.5 }}
              animate={{ scale: 1, opacity: 1 }}
              className="text-sm font-black flex-shrink-0 tabular-nums"
              style={{ color: colors.primary }}
            >
              {progress.percent}%
            </motion.span>
          </div>

          <div className="h-2.5 rounded-full overflow-hidden mt-3" style={{ backgroundColor: colors.border }}>
            <motion.div
              className="h-full rounded-full"
              style={{ backgroundColor: colors.primary }}
              initial={false}
              animate={{ width: `${progress.percent}%` }}
              transition={{ type: 'spring', stiffness: 120, damping: 18 }}
            />
          </div>

          <div className="flex gap-1.5 mt-3 overflow-x-auto no-scrollbar pb-0.5">
            {ONBOARDING_STEPS.map(step => {
              const done = progress.complete[step.id];
              const isNext = progress.next?.id === step.id;
              return (
                <span
                  key={step.id}
                  className="text-[9px] px-2 py-1 rounded-full whitespace-nowrap flex items-center gap-1 flex-shrink-0"
                  style={{
                    backgroundColor: done ? `${colors.success}15` : isNext ? `${colors.primary}12` : colors.background,
                    color: done ? colors.success : isNext ? colors.primary : colors.textMuted,
                    border: isNext ? `1px solid ${colors.primary}40` : '1px solid transparent',
                  }}
                >
                  {done ? <Check size={10} /> : null}
                  {step.label}
                  <span className="opacity-60">{step.milestone}%</span>
                </span>
              );
            })}
          </div>

          {progress.next && (
            <div className="flex gap-2 mt-3">
              <button
                type="button"
                onClick={() => onContinue(progress.next!.id)}
                className="flex-1 h-10 rounded-xl text-xs font-bold text-white"
                style={{ backgroundColor: colors.primary }}
              >
                متابعة: {progress.next.label}
              </button>
              <button
                type="button"
                onClick={() => {
                  markOnboardingLater(userId);
                  setDeferred(true);
                  onDismissLater?.();
                }}
                className="h-10 px-3 rounded-xl text-[11px] font-bold border flex-shrink-0"
                style={{ borderColor: colors.border, color: colors.textMuted }}
              >
                لاحقاً
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
