import { useApp } from '@/contexts/useApp';
import type { ScreenParams } from '@/types';
import { getErrMsg } from '@/lib/error';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LogIn, Mail, Lock, Eye, EyeOff, ArrowRight,
  Chrome, AlertCircle, WifiOff, ShieldCheck
} from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { loginSchema } from '@/lib/validation';
import type { LoginFormData } from '@/lib/validation';
import { isSafeAuthRedirectScreen, isSafeAuthRedirectTab } from '@/lib/authRedirect';
import { useState, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useStore } from '@/store/useStore';

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */
interface LoginScreenProps {
  redirectScreen?: string;
  redirectParams?: Record<string, unknown>;
}

export default function LoginScreen({ redirectScreen, redirectParams }: LoginScreenProps) {
  const { themeConfig, navigate, setActiveTab } = useApp();
  const { googleSignIn, login, error: authError } = useAuth();
  const isOnline = useStore(s => s.isOnline);

  const {
    register,
    handleSubmit: handleFormSubmit,
    formState: { errors: formErrors, touchedFields, isSubmitting },
    resetField,
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const [localError, setLocalError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const error = localError || authError || '';

  const completeRedirect = () => {
    const redirectTab = redirectParams?.redirectTab;
    const safeTab = isSafeAuthRedirectTab(redirectTab) ? redirectTab : undefined;
    if (redirectScreen && isSafeAuthRedirectScreen(redirectScreen) && redirectScreen !== 'home') {
      if (safeTab) setActiveTab(safeTab);
      navigate(redirectScreen, redirectParams as ScreenParams);
      return;
    }
    setActiveTab(safeTab || 'booking');
  };

  const clearError = useCallback(() => {
    setLocalError('');
  }, []);

  const onSubmit = async (data: LoginFormData) => {
    clearError();
    try {
      await login(data.email, data.password);
      completeRedirect();
    } catch (err) {
      const msg = getErrMsg(err);
      if (msg.includes('user-not-found') || msg.includes('لم يتم العثور')) {
        resetField('email', { defaultValue: data.email, keepTouched: true });
        // We'll show this via the formErrors mechanism by setting a custom error
        // But react-hook-form doesn't let us set errors directly without setError
        // So we'll use localError for server-side auth errors
        setLocalError('لا يوجد حساب بهذا البريد');
      } else if (msg.includes('wrong-password') || msg.includes('غير صحيحة')) {
        resetField('password', { defaultValue: data.password, keepTouched: true });
        setLocalError('كلمة المرور غير صحيحة');
      } else {
        setLocalError(msg);
      }
    }
  };

  const handleGoogle = async () => {
    clearError();
    try {
      sessionStorage.setItem('hallaqi-auth-redirect', JSON.stringify({
        screen: isSafeAuthRedirectScreen(redirectScreen) ? redirectScreen : undefined,
        params: redirectParams,
      }));
      await googleSignIn();
    } catch {
      setLocalError('فشل تسجيل الدخول بـ Google. حاول مرة أخرى.');
    }
  };

  const getFieldBorder = (fieldName: 'email' | 'password') => {
    const hasError = !!formErrors[fieldName];
    const isTouched = !!touchedFields[fieldName];
    if (hasError) return themeConfig.colors.error;
    if (isTouched) return themeConfig.colors.primary + '40';
    return themeConfig.colors.border;
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
      className="min-h-screen flex flex-col"
      style={{ backgroundColor: themeConfig.colors.background }}
    >
      {/* === HEADER === */}
      <div className="px-5 pt-6 pb-2">
        <motion.button
          whileTap={{ scale: 0.92 }}
          onClick={() => navigate('home', { redirectTab: 'booking' })}
          className="w-10 h-10 rounded-2xl flex items-center justify-center mb-5"
          style={{ backgroundColor: themeConfig.colors.surface, border: `1px solid ${themeConfig.colors.border}` }}
          aria-label="رجوع"
        >
          <ArrowRight size={20} style={{ color: themeConfig.colors.text }} />
        </motion.button>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.4 }}
          className="flex items-center gap-3 mb-3"
        >
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center"
            style={{ backgroundColor: themeConfig.colors.primary + '12' }}
          >
            <img src="/logo-icon.png" alt="Hallaqi" className="w-10 h-10 rounded-xl" />
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-tight" style={{ color: themeConfig.colors.text }}>
              Hallaqi
            </h1>
            <p className="text-[11px] font-medium tracking-wide" style={{ color: themeConfig.colors.textMuted }}>
              منصة حجز الحلاقين في الجزائر
            </p>
          </div>
        </motion.div>
      </div>

      {/* === OFFLINE BANNER === */}
      {!isOnline && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          className="mx-5 mb-3 p-3 rounded-2xl flex items-center gap-2.5"
          style={{ backgroundColor: themeConfig.colors.warning + '12', border: `1px solid ${themeConfig.colors.warning}20` }}
        >
          <WifiOff size={16} style={{ color: themeConfig.colors.warning }} />
          <p className="text-[11px] font-medium" style={{ color: themeConfig.colors.warning }}>
            لا يوجد اتصال بالإنترنت. بعض الميزات قد لا تعمل.
          </p>
        </motion.div>
      )}

      {/* === ERROR BANNER === */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ height: 0, opacity: 0, marginBottom: 0 }}
            animate={{ height: 'auto', opacity: 1, marginBottom: 12 }}
            exit={{ height: 0, opacity: 0, marginBottom: 0 }}
            className="mx-5 overflow-hidden"
          >
            <div
              className="p-3.5 rounded-2xl flex items-start gap-2.5"
              style={{ backgroundColor: themeConfig.colors.error + '10', border: `1px solid ${themeConfig.colors.error}18` }}
            >
              <AlertCircle size={16} style={{ color: themeConfig.colors.error, flexShrink: 0, marginTop: 1 }} />
              <p className="text-xs font-semibold leading-relaxed" style={{ color: themeConfig.colors.error }}>
                {error}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* === FORM === */}
      <motion.form
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, duration: 0.4 }}
        onSubmit={handleFormSubmit(onSubmit)}
        className="flex-1 px-5 space-y-4"
      >
        {/* Email */}
        <div>
          <label className="block text-xs font-bold mb-2 px-0.5" style={{ color: themeConfig.colors.text }}>
            البريد الإلكتروني
          </label>
          <div className="relative">
            <Mail
              size={16}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none transition-colors"
              style={{ color: formErrors.email ? themeConfig.colors.error : themeConfig.colors.textMuted }}
            />
            <input
              type="email"
              {...register('email')}
              placeholder="example@email.com"
              dir="ltr"
              autoComplete="email"
              disabled={isSubmitting}
              className="w-full h-[52px] pr-10 pl-4 text-sm rounded-2xl outline-none transition-all duration-200 disabled:opacity-50"
              style={{
                backgroundColor: themeConfig.colors.surface,
                color: themeConfig.colors.text,
                border: `2px solid ${getFieldBorder('email')}`,
              }}
            />
          </div>
          <AnimatePresence>
            {formErrors.email && (
              <motion.p
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="text-[11px] font-semibold mt-1.5 px-1"
                style={{ color: themeConfig.colors.error }}
              >
                {formErrors.email.message}
              </motion.p>
            )}
          </AnimatePresence>
        </div>

        {/* Password */}
        <div>
          <label className="block text-xs font-bold mb-2 px-0.5" style={{ color: themeConfig.colors.text }}>
            كلمة المرور
          </label>
          <div className="relative">
            <Lock
              size={16}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none transition-colors"
              style={{ color: formErrors.password ? themeConfig.colors.error : themeConfig.colors.textMuted }}
            />
            <input
              type={showPassword ? 'text' : 'password'}
              {...register('password')}
              placeholder="••••••••"
              dir="ltr"
              autoComplete="current-password"
              disabled={isSubmitting}
              className="w-full h-[52px] pr-10 pl-12 text-sm rounded-2xl outline-none transition-all duration-200 disabled:opacity-50"
              style={{
                backgroundColor: themeConfig.colors.surface,
                color: themeConfig.colors.text,
                border: `2px solid ${getFieldBorder('password')}`,
              }}
            />
            <motion.button
              type="button"
              whileTap={{ scale: 0.85 }}
              onClick={() => setShowPassword(!showPassword)}
              className="absolute left-3.5 top-1/2 -translate-y-1/2 p-1 rounded-lg transition-colors"
              tabIndex={-1}
            >
              {showPassword
                ? <EyeOff size={16} style={{ color: themeConfig.colors.textMuted }} />
                : <Eye size={16} style={{ color: themeConfig.colors.textMuted }} />
              }
            </motion.button>
          </div>
          <AnimatePresence>
            {formErrors.password && (
              <motion.p
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="text-[11px] font-semibold mt-1.5 px-1"
                style={{ color: themeConfig.colors.error }}
              >
                {formErrors.password.message}
              </motion.p>
            )}
          </AnimatePresence>
        </div>

        {/* Forgot Password */}
        <div className="flex justify-end">
          <motion.button
            type="button"
            whileTap={{ scale: 0.95 }}
            onClick={() => navigate('forgot-password')}
            className="text-[11px] font-bold transition-opacity hover:opacity-70"
            style={{ color: themeConfig.colors.primary }}
          >
            نسيت كلمة المرور؟
          </motion.button>
        </div>

        {/* Submit */}
        <motion.button
          type="submit"
          disabled={isSubmitting}
          whileTap={isSubmitting ? {} : { scale: 0.97 }}
          className="w-full h-[52px] rounded-2xl text-sm font-bold text-white transition-all duration-200 flex items-center justify-center gap-2.5 disabled:opacity-60 mt-2"
          style={{
            backgroundColor: themeConfig.colors.primary,
            boxShadow: `0 4px 16px ${themeConfig.colors.primary}30`,
          }}
        >
          {isSubmitting ? (
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ repeat: Infinity, duration: 0.8, ease: 'linear' }}
              className="w-5 h-5 border-[2.5px] border-white/30 border-t-white rounded-full"
            />
          ) : (
            <>
              <LogIn size={18} strokeWidth={2.5} />
              <span>تسجيل الدخول</span>
            </>
          )}
        </motion.button>

        {/* Divider */}
        <div className="flex items-center gap-3 py-1">
          <div className="flex-1 h-px" style={{ backgroundColor: themeConfig.colors.border }} />
          <span className="text-[10px] font-bold" style={{ color: themeConfig.colors.textMuted }}>أو</span>
          <div className="flex-1 h-px" style={{ backgroundColor: themeConfig.colors.border }} />
        </div>

        {/* Google */}
        <motion.button
          type="button"
          onClick={handleGoogle}
          disabled={isSubmitting || !isOnline}
          whileTap={isSubmitting ? {} : { scale: 0.97 }}
          className="w-full h-[52px] rounded-2xl text-sm font-bold border-2 transition-all duration-200 flex items-center justify-center gap-2.5 disabled:opacity-50"
          style={{
            backgroundColor: themeConfig.colors.surface,
            borderColor: themeConfig.colors.border,
            color: themeConfig.colors.text,
          }}
        >
          <Chrome size={18} style={{ color: '#EF4444' }} />
          <span>Google تسجيل الدخول بـ</span>
        </motion.button>

        {/* Security note */}
        <div className="flex items-center justify-center gap-1.5 pt-1 pb-4">
          <ShieldCheck size={12} style={{ color: themeConfig.colors.textMuted + '80' }} />
          <p className="text-[10px] font-medium" style={{ color: themeConfig.colors.textMuted + '80' }}>
            بياناتك مشفرة وآمنة
          </p>
        </div>
      </motion.form>

      {/* === FOOTER === */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
        className="px-5 py-5 text-center"
      >
        <p className="text-xs" style={{ color: themeConfig.colors.textMuted }}>
          ليس لديك حساب؟{' '}
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={() => navigate('register', redirectParams as Record<string, string>)}
            className="font-bold"
            style={{ color: themeConfig.colors.primary }}
          >
            أنشئ حساباً
          </motion.button>
        </p>
      </motion.div>
    </motion.div>
  );
}
