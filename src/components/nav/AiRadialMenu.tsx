import { motion, AnimatePresence } from 'framer-motion';
import {
  Sparkles, QrCode, Camera, Images, X, Target, Gift, Trophy, Star,
} from 'lucide-react';
import { useApp } from '@/contexts/useApp';

export type RadialAction =
  | 'ai'
  | 'camera'
  | 'qr'
  | 'gallery'
  | 'missions'
  | 'referrals'
  | 'achievements'
  | 'rewards';

interface Props {
  open: boolean;
  onClose: () => void;
  onSelect: (action: RadialAction) => void;
}

/** 8 evenly spaced hub actions around the center FAB (UI shell). */
const actions: {
  id: RadialAction;
  label: string;
  icon: typeof Sparkles;
  soon?: boolean;
}[] = [
  { id: 'ai', label: 'AI', icon: Sparkles },
  { id: 'camera', label: 'كاميرا', icon: Camera },
  { id: 'qr', label: 'QR', icon: QrCode },
  { id: 'gallery', label: 'معرض', icon: Images },
  { id: 'missions', label: 'مهمات', icon: Target },
  { id: 'referrals', label: 'دعوات', icon: Gift },
  { id: 'achievements', label: 'إنجازات', icon: Trophy },
  { id: 'rewards', label: 'مكافآت', icon: Star, soon: true },
];

export default function AiRadialMenu({ open, onClose, onSelect }: Props) {
  const { themeConfig } = useApp();
  const radius = 118;

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[80] flex items-end justify-center pb-24"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <div className="absolute inset-0 bg-black/50 backdrop-blur-[2px]" />
          <div className="relative w-80 h-80" onClick={e => e.stopPropagation()}>
            {actions.map((action, index) => {
              // Start at top (-90°) and space evenly by 45°.
              const angle = -90 + index * 45;
              const rad = (angle * Math.PI) / 180;
              const x = Math.cos(rad) * radius;
              const y = Math.sin(rad) * radius;
              const Icon = action.icon;
              return (
                <motion.button
                  key={action.id}
                  type="button"
                  initial={{ opacity: 0, scale: 0.4, x: 0, y: 0 }}
                  animate={{ opacity: 1, scale: 1, x, y }}
                  exit={{ opacity: 0, scale: 0.4, x: 0, y: 0 }}
                  transition={{ delay: index * 0.03, type: 'spring', stiffness: 380, damping: 22 }}
                  className="absolute left-1/2 top-1/2 -ml-8 -mt-8 w-16 h-16 rounded-2xl flex flex-col items-center justify-center gap-0.5 shadow-lg border"
                  style={{
                    backgroundColor: themeConfig.colors.surface,
                    color: themeConfig.colors.primary,
                    borderColor: themeConfig.colors.border,
                  }}
                  onClick={() => { onSelect(action.id); onClose(); }}
                  aria-label={action.soon ? `${action.label} — قريباً` : action.label}
                >
                  <Icon size={18} />
                  <span className="text-[9px] font-bold leading-none">{action.label}</span>
                  {action.soon && (
                    <span
                      className="absolute -top-1 -right-1 text-[8px] font-black px-1 py-0.5 rounded-full text-white"
                      style={{ backgroundColor: themeConfig.colors.accent }}
                    >
                      قريباً
                    </span>
                  )}
                </motion.button>
              );
            })}
            <button
              type="button"
              className="absolute left-1/2 top-1/2 -ml-7 -mt-7 w-14 h-14 rounded-full flex items-center justify-center text-white shadow-xl"
              style={{ backgroundColor: themeConfig.colors.primary }}
              onClick={onClose}
              aria-label="إغلاق"
            >
              <X size={18} />
            </button>
          </div>
          <p className="absolute bottom-14 text-xs text-white/90 font-semibold px-4 text-center">
            مركز حلاقي — اضغط مطولاً لفتح المساعد مباشرة
          </p>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
