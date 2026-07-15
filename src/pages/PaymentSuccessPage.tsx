/**
 * Payment Success Page
 * 
 * Displayed after successful Stripe Checkout.
 * Verifies payment and shows confirmation to the user.
 */

import { useState, useEffect } from 'react';
import { useApp } from '@/contexts/useApp';
import { usePayment } from '@/hooks/usePayment';
import { motion } from 'framer-motion';
import { CheckCircle, XCircle, Loader2, ArrowLeft } from 'lucide-react';

export default function PaymentSuccessPage() {
  const { navigate, themeConfig } = useApp();
  const { verifyPayment } = usePayment();
  const [status, setStatus] = useState<'verifying' | 'success' | 'failed'>('verifying');
  const [errorMessage, setErrorMessage] = useState<string>('');

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const sessionId = params.get('session_id');
    const bookingId = params.get('booking_id');

    if (!sessionId) {
      setStatus('failed');
      setErrorMessage('معرف الجلسة غير موجود');
      return;
    }

    async function verify() {
      try {
        const result = await verifyPayment('stripe', sessionId!);
        if (result?.verified) {
          setStatus('success');
        } else {
          setStatus('failed');
          setErrorMessage('لم يتم التحقق من الدفع. يرجى التواصل مع الدعم.');
        }
      } catch {
        setStatus('failed');
        setErrorMessage('حدث خطأ أثناء التحقق من الدفع');
      }
    }

    verify();
    // Clean up URL params
    if (bookingId) {
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="min-h-screen flex flex-col items-center justify-center p-6"
      style={{ backgroundColor: themeConfig.colors.background }}
    >
      {status === 'verifying' && (
        <div className="flex flex-col items-center gap-4">
          <Loader2 size={48} className="animate-spin" style={{ color: themeConfig.colors.primary }} />
          <p className="text-lg font-bold" style={{ color: themeConfig.colors.text }}>
            جاري التحقق من الدفع...
          </p>
          <p className="text-sm" style={{ color: themeConfig.colors.textMuted }}>
            يرجى الانتظار
          </p>
        </div>
      )}

      {status === 'success' && (
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="w-20 h-20 rounded-full flex items-center justify-center" style={{ backgroundColor: themeConfig.colors.success + '20' }}>
            <CheckCircle size={48} style={{ color: themeConfig.colors.success }} />
          </div>
          <h1 className="text-xl font-bold" style={{ color: themeConfig.colors.text }}>
            تم الدفع بنجاح!
          </h1>
          <p className="text-sm" style={{ color: themeConfig.colors.textMuted }}>
            تم تأكيد حجزك. ستتلقى إشعاراً بالتفاصيل.
          </p>
          <button
            onClick={() => navigate('home')}
            className="mt-6 px-6 py-3 rounded-xl text-sm font-bold text-white flex items-center gap-2"
            style={{ backgroundColor: themeConfig.colors.primary }}
          >
            <ArrowLeft size={16} />
            العودة للرئيسية
          </button>
        </div>
      )}

      {status === 'failed' && (
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="w-20 h-20 rounded-full flex items-center justify-center" style={{ backgroundColor: themeConfig.colors.error + '20' }}>
            <XCircle size={48} style={{ color: themeConfig.colors.error }} />
          </div>
          <h1 className="text-xl font-bold" style={{ color: themeConfig.colors.text }}>
            فشل التحقق من الدفع
          </h1>
          <p className="text-sm" style={{ color: themeConfig.colors.textMuted }}>
            {errorMessage}
          </p>
          <button
            onClick={() => navigate('home')}
            className="mt-6 px-6 py-3 rounded-xl text-sm font-bold text-white flex items-center gap-2"
            style={{ backgroundColor: themeConfig.colors.primary }}
          >
            <ArrowLeft size={16} />
            العودة للرئيسية
          </button>
        </div>
      )}
    </motion.div>
  );
}
