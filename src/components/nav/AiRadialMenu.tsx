import { motion, AnimatePresence } from 'framer-motion';
import {
  Sparkles, QrCode, Camera, Images, X, MessageSquareHeart,
} from 'lucide-react';
import { useApp } from '@/contexts/useApp';

type RadialAction = 'ai' | 'qr' | 'camera' | 'gallery';

interface Props {
  open: boolean;
  onClose: () => void;
  onSelect: (action: RadialAction) => void;
}

const actions: { id: RadialAction; label: string; icon: typeof Sparkles; angle: number }[] = [
  { id: 'ai', label: 'المساعد', icon: Sparkles, angle: -90 },
  { id: 'qr', label: 'QR', icon: QrCode, angle: -20 },
  { id: 'camera', label: 'كاميرا', icon: Camera, angle: 50 },
  { id: 'gallery', label: 'معرض', icon: Images, angle: 120 },
];

export default function AiRadialMenu({ open, onClose, onSelect }: Props) {
  const { themeConfig } = useApp();
  const radius = 88;

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
          <div className="absolute inset-0 bg-black/45 backdrop-blur-[2px]" />
          <div className="relative w-56 h-56" onClick={e => e.stopPropagation()}>
            {actions.map((action, index) => {
              const rad = (action.angle * Math.PI) / 180;
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
                  transition={{ delay: index * 0.04, type: 'spring', stiffness: 380, damping: 22 }}
                  className="absolute left-1/2 top-1/2 -ml-7 -mt-7 w-14 h-14 rounded-2xl flex flex-col items-center justify-center gap-0.5 shadow-lg"
                  style={{ backgroundColor: themeConfig.colors.surface, color: themeConfig.colors.primary }}
                  onClick={() => { onSelect(action.id); onClose(); }}
                  aria-label={action.label}
                >
                  <Icon size={18} />
                  <span className="text-[9px] font-bold">{action.label}</span>
                </motion.button>
              );
            })}
            <button
              type="button"
              className="absolute left-1/2 top-1/2 -ml-6 -mt-6 w-12 h-12 rounded-full flex items-center justify-center text-white shadow-xl"
              style={{ backgroundColor: themeConfig.colors.primary }}
              onClick={onClose}
              aria-label="إغلاق"
            >
              <X size={18} />
            </button>
          </div>
          <p className="absolute bottom-16 text-xs text-white/90 font-semibold flex items-center gap-1">
            <MessageSquareHeart size={14} /> اختر ميزة المساعد
          </p>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
