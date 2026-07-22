import { motion, AnimatePresence } from 'framer-motion';
import {
  Sparkles, QrCode, Camera, Images, X, Target, Gift, Trophy, Star, Search,
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
  | 'rewards'
  | 'search';

interface Props {
  open: boolean;
  onClose: () => void;
  onSelect: (action: RadialAction) => void;
}

/** Hub actions around the center FAB — Search opens a command finder (better than 20 radial icons). */
const actions: {
  id: RadialAction;
  label: string;
  icon: typeof Sparkles;
  soon?: boolean;
}[] = [
  { id: 'ai', label: 'AI', icon: Sparkles },
  { id: 'search', label: 'بحث', icon: Search },
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
  const radius = 120;
  const step = 360 / actions.length;

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
          <div className="relative w-[22rem] h-[22rem]" onClick={e => e.stopPropagation()}>
            {actions.map((action, index) => {
              const angle = -90 + index * step;
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
                  transition={{ delay: index * 0.025, type: 'spring', stiffness: 380, damping: 22 }}
                  className="absolute left-1/2 top-1/2 -ml-7 -mt-7 w-14 h-14 rounded-2xl flex flex-col items-center justify-center gap-0.5 shadow-lg border"
                  style={{
                    backgroundColor: themeConfig.colors.surface,
                    color: themeConfig.colors.primary,
                    borderColor: themeConfig.colors.border,
                  }}
                  onClick={() => { onSelect(action.id); onClose(); }}
                  aria-label={action.soon ? `${action.label} — قريباً` : action.label}
                >
                  <Icon size={17} />
                  <span className="text-[8px] font-bold leading-none">{action.label}</span>
                  {action.soon && (
                    <span
                      className="absolute -top-1 -right-1 text-[7px] font-black px-1 py-0.5 rounded-full text-white"
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
            اختر إجراءاً — اضغط في المنتصف للإغلاق
          </p>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
