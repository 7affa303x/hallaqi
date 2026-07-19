import { useState, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useApp } from '@/contexts/useApp';
import { useStore } from '@/store/useStore';
import { getErrMsg } from '@/lib/error';
import { motion, AnimatePresence } from 'framer-motion';
import {
  UserPlus, Mail, Lock, Eye, EyeOff, ArrowRight, User,
  Chrome, AlertCircle, WifiOff, ShieldCheck, Check, Scissors,
  Store, Building2, Stethoscope,
} from 'lucide-react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { registerSchema } from '@/lib/validation';
import type { RegisterFormData } from '@/lib/validation';

function getPasswordStrength(pw: string): { score: number; label: string; color: string } {
  if (!pw) return { score: 0, label: '', color: '' };
  let s = 0;
  if (pw.length >= 8) s++;
  if (pw.length >= 10) s++;
  if (/[A-Z]/.test(pw)) s++;
  if (/[0-9]/.test(pw)) s++;
  if (/[^A-Za-z0-9]/.test(pw)) s++;

  if (s <= 1) return { score: s, label: 'ضعيفة', color: '#EF4444' };
  if (s <= 3) return { score: s, label: 'متوسطة', color: '#F59E0B' };
  if (s <= 4) return { score: s, label: 'قوية', color: '#3B82F6' };
  return { score: s, label: 'قوية جداً', color: '#22C55E' };
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */
export default function RegisterScreen() {
  const { themeConfig, navigate } = useApp();
  const { googleSignIn, register, error: authError } = useAuth();
  const isOnline = useStore(s => s.isOnline);

  const {
    register: registerField,
    handleSubmit: handleFormSubmit,
    formState: { errors: formErrors, touchedFields, isSubmitting },
    control,
    watch,
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      name: '',
      email: '',
      password: '',
      confirm: '',
      accountType: 'client',
      acceptedTerms: false,
    },
  });

  const [localError, setLocalError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [verificationEmail, setVerificationEmail] = useState('');

  const error = localError || authError || '';
  const password = watch('password', '');
  const strength = getPasswordStrength(password);

  const clearErrors = useCallback(() => {
    setLocalError('');
  }, []);

  const onSubmit = async (data: RegisterFormData) => {
    clearErrors();
    try {
      const result = await register(
        data.email,
        data.password,
        data.name.trim(),
        data.accountType
      );
      if (result.session) {
        const sellerRoles = ['store', 'company', 'doctor'];
        if (sellerRoles.includes(data.accountType)) {
          navigate('seller-dashboard', { role: data.accountType, pendingApproval: '1' });
        } else if (data.accountType === 'barber') {
          navigate('home', { redirectTab: 'profile' });
        } else {
          navigate('home', { redirectTab: 'booking' });
        }
      } else {
        setVerificationEmail(data.email);
      }
    } catch (err) {
      const msg = getErrMsg(err);
      if (msg.includes('email-already') || msg.includes('مستخدم')) {
        setLocalError('هذا البريد مسجل بالفعل');
      } else if (msg.includes('weak-password')) {
        setLocalError('كلمة المرور ضعيفة');
      } else if (msg.includes('invalid-email')) {
        setLocalError('البريد غير صالح');
      } else {
        setLocalError(msg || 'فشل إنشاء الحساب. حاول مرة أخرى.');
      }
    }
  };

  const handleGoogle = async () => {
    clearErrors();
    try {
      await googleSignIn();
      navigate('home', { redirectTab: 'booking' });
    } catch {
      setLocalError('فشل التسجيل بـ Google. حاول مرة أخرى.');
    }
  };

  const renderFieldError = (fieldName: keyof RegisterFormData) => {
    const msg = formErrors[fieldName]?.message;
    if (!msg) return null;
    return (
      <motion.p
        initial={{ opacity: 0, y: -4 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0 }}
        className="text-[11px] font-semibold mt-1.5 px-1"
        style={{ color: themeConfig.colors.error }}
      >
        {msg}
      </motion.p>
    );
  };

  const getFieldBorder = (fieldName: keyof RegisterFormData) => {
    const hasError = !!formErrors[fieldName];
    const isTouched = touchedFields[fieldName] === true;
    if (hasError) return themeConfig.colors.error;
    if (isTouched) return themeConfig.colors.primary + '40';
    return themeConfig.colors.border;
  };

  if (verificationEmail) {
    return (
      <div
        className="min-h-screen flex items-center justify-center p-6"
        style={{ backgroundColor: themeConfig.colors.background }}
      >
        <div
          className="w-full max-w-sm rounded-3xl p-6 text-center border"
          style={{ backgroundColor: themeConfig.colors.surface, borderColor: themeConfig.colors.border }}
        >
          <div
            className="w-16 h-16 rounded-2xl mx-auto flex items-center justify-center"
            style={{ backgroundColor: themeConfig.colors.primary + '15' }}
          >
            <Mail size={30} style={{ color: themeConfig.colors.primary }} />
          </div>
          <h1 className="text-xl font-black mt-4" style={{ color: themeConfig.colors.text }}>
            تحقق من بريدك
          </h1>
          <p className="text-sm leading-relaxed mt-2" style={{ color: themeConfig.colors.textMuted }}>
            أرسلنا رابط تأكيد إلى {verificationEmail}. أكد البريد ثم سجل الدخول لإكمال حسابك.
          </p>
          <button
            type="button"
            onClick={() => navigate('login')}
            className="w-full h-12 rounded-2xl text-sm font-bold text-white mt-5"
            style={{ backgroundColor: themeConfig.colors.primary }}
          >
            الانتقال إلى تسجيل الدخول
          </button>
        </div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
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
          transition={{ delay: 0.1 }}
          className="flex items-center gap-3 mb-3"
        >
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center"
            style={{ backgroundColor: themeConfig.colors.primary + '12' }}
          >
            <img src="/logo-icon.png" alt="Hallaqi" className="w-10 h-10 rounded-xl" />
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-tight" style={{ color: themeConfig.colors.text }}>Hallaqi</h1>
            <p className="text-[11px] font-medium" style={{ color: themeConfig.colors.textMuted }}>أنشئ حساباً جديداً</p>
          </div>
        </motion.div>
      </div>

      {/* Offline */}
      {!isOnline && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          className="mx-5 mb-3 p-3 rounded-2xl flex items-center gap-2.5"
          style={{ backgroundColor: themeConfig.colors.warning + '12', border: `1px solid ${themeConfig.colors.warning}20` }}
        >
          <WifiOff size={16} style={{ color: themeConfig.colors.warning }} />
          <p className="text-[11px] font-medium" style={{ color: themeConfig.colors.warning }}>
            لا يوجد اتصال. تحقق من الشبكة.
          </p>
        </motion.div>
      )}

      {/* Error */}
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
              <p className="text-xs font-semibold" style={{ color: themeConfig.colors.error }}>{error}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* === FORM === */}
      <motion.form
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        onSubmit={handleFormSubmit(onSubmit)}
        className="flex-1 px-5 space-y-3.5 overflow-y-auto"
      >
        {/* Name */}
        <div>
          <label className="block text-xs font-bold mb-2 px-0.5" style={{ color: themeConfig.colors.text }}>
            الاسم الكامل
          </label>
          <div className="relative">
            <User size={16} className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: formErrors.name ? themeConfig.colors.error : themeConfig.colors.textMuted }} />
            <input
              type="text"
              {...registerField('name')}
              placeholder="محمد أحمد"
              disabled={isSubmitting}
              className="w-full h-[52px] pr-10 pl-4 text-sm rounded-2xl outline-none transition-all disabled:opacity-50"
              style={{
                backgroundColor: themeConfig.colors.surface,
                color: themeConfig.colors.text,
                border: `2px solid ${getFieldBorder('name')}`,
              }}
            />
          </div>
          <AnimatePresence>{renderFieldError('name')}</AnimatePresence>
        </div>

        {/* Email */}
        <div>
          <label className="block text-xs font-bold mb-2 px-0.5" style={{ color: themeConfig.colors.text }}>
            البريد الإلكتروني
          </label>
          <div className="relative">
            <Mail size={16} className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: formErrors.email ? themeConfig.colors.error : themeConfig.colors.textMuted }} />
            <input
              type="email"
              {...registerField('email')}
              placeholder="example@email.com"
              dir="ltr" autoComplete="email"
              disabled={isSubmitting}
              className="w-full h-[52px] pr-10 pl-4 text-sm rounded-2xl outline-none transition-all disabled:opacity-50"
              style={{
                backgroundColor: themeConfig.colors.surface,
                color: themeConfig.colors.text,
                border: `2px solid ${getFieldBorder('email')}`,
              }}
            />
          </div>
          <AnimatePresence>{renderFieldError('email')}</AnimatePresence>
        </div>

        {/* Password */}
        <div>
          <label className="block text-xs font-bold mb-2 px-0.5" style={{ color: themeConfig.colors.text }}>
            كلمة المرور
          </label>
          <div className="relative">
            <Lock size={16} className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: formErrors.password ? themeConfig.colors.error : themeConfig.colors.textMuted }} />
            <input
              type={showPassword ? 'text' : 'password'}
              {...registerField('password')}
              placeholder="••••••••"
              dir="ltr" autoComplete="new-password"
              disabled={isSubmitting}
              className="w-full h-[52px] pr-10 pl-12 text-sm rounded-2xl outline-none transition-all disabled:opacity-50"
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
              className="absolute left-3.5 top-1/2 -translate-y-1/2 p-1 rounded-lg"
              tabIndex={-1}
            >
              {showPassword
                ? <EyeOff size={16} style={{ color: themeConfig.colors.textMuted }} />
                : <Eye size={16} style={{ color: themeConfig.colors.textMuted }} />
              }
            </motion.button>
          </div>

          {/* Password Strength */}
          {password.length > 0 && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="mt-2 space-y-1.5"
            >
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map(i => (
                  <div
                    key={i}
                    className="flex-1 h-1 rounded-full transition-all duration-300"
                    style={{
                      backgroundColor: i <= strength.score ? strength.color : themeConfig.colors.border,
                    }}
                  />
                ))}
              </div>
              <p className="text-[10px] font-bold" style={{ color: strength.color }}>
                قوة كلمة المرور: {strength.label}
              </p>
            </motion.div>
          )}
          <AnimatePresence>{renderFieldError('password')}</AnimatePresence>
        </div>

        {/* Confirm Password */}
        <div>
          <label className="block text-xs font-bold mb-2 px-0.5" style={{ color: themeConfig.colors.text }}>
            تأكيد كلمة المرور
          </label>
          <div className="relative">
            <Lock size={16} className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: formErrors.confirm ? themeConfig.colors.error : themeConfig.colors.textMuted }} />
            <input
              type={showPassword ? 'text' : 'password'}
              {...registerField('confirm')}
              placeholder="••••••••"
              dir="ltr" autoComplete="new-password"
              disabled={isSubmitting}
              className="w-full h-[52px] pr-10 pl-4 text-sm rounded-2xl outline-none transition-all disabled:opacity-50"
              style={{
                backgroundColor: themeConfig.colors.surface,
                color: themeConfig.colors.text,
                border: `2px solid ${getFieldBorder('confirm')}`,
              }}
            />
            {watch('confirm') && password && password === watch('confirm') && (
              <Check size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2" style={{ color: '#22C55E' }} />
            )}
          </div>
          <AnimatePresence>{renderFieldError('confirm')}</AnimatePresence>
        </div>

        {/* Account type */}
        <Controller
          name="accountType"
          control={control}
          render={({ field }) => (
            <fieldset>
              <legend className="block text-xs font-bold mb-2 px-0.5" style={{ color: themeConfig.colors.text }}>
                نوع الحساب
              </legend>
              <div className="grid grid-cols-2 gap-2">
                {([
                  { value: 'client', label: 'عميل', icon: User },
                  { value: 'barber', label: 'حلاق', icon: Scissors },
                  { value: 'store', label: 'متجر', icon: Store },
                  { value: 'company', label: 'شركة', icon: Building2 },
                  { value: 'doctor', label: 'طبيب', icon: Stethoscope },
                ] as const).map(option => {
                  const Icon = option.icon;
                  const selected = field.value === option.value;
                  return (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => field.onChange(option.value)}
                      className="h-12 rounded-2xl border-2 flex items-center justify-center gap-2 text-xs font-bold"
                      style={{
                        borderColor: selected ? themeConfig.colors.primary : themeConfig.colors.border,
                        backgroundColor: selected ? themeConfig.colors.primary + '10' : themeConfig.colors.surface,
                        color: selected ? themeConfig.colors.primary : themeConfig.colors.textMuted,
                      }}
                    >
                      <Icon size={16} />
                      {option.label}
                    </button>
                  );
                })}
              </div>
              <p className="text-[10px] mt-2" style={{ color: themeConfig.colors.textMuted }}>
                الأدوار منفصلة بالكامل — المتاجر والشركات والأطباء يحتاجون موافقة الأدمن.
              </p>
            </fieldset>
          )}
        />

        {/* Terms */}
        <Controller
          name="acceptedTerms"
          control={control}
          render={({ field }) => (
            <button
              type="button"
              onClick={() => { field.onChange(!field.value); clearErrors(); }}
              className="flex items-start gap-2.5 w-full pt-1"
            >
              <motion.div
                whileTap={{ scale: 0.9 }}
                className="w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 mt-0.5 transition-all"
                style={{
                  borderColor: formErrors.acceptedTerms ? themeConfig.colors.error : field.value ? themeConfig.colors.primary : themeConfig.colors.border,
                  backgroundColor: field.value ? themeConfig.colors.primary : 'transparent',
                }}
              >
                {field.value && <Check size={12} className="text-white" strokeWidth={3} />}
              </motion.div>
              <p className="text-[11px] leading-relaxed text-right" style={{ color: themeConfig.colors.textMuted }}>
                أوافق على{' '}
                <button
                  type="button"
                  className="font-bold underline-offset-2 hover:underline"
                  style={{ color: themeConfig.colors.primary }}
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate('home', { redirectTab: 'profile', openLegal: 'terms' });
                  }}
                >
                  شروط الاستخدام
                </button>
                {' '}و{' '}
                <button
                  type="button"
                  className="font-bold underline-offset-2 hover:underline"
                  style={{ color: themeConfig.colors.primary }}
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate('home', { redirectTab: 'profile', openLegal: 'privacy' });
                  }}
                >
                  سياسة الخصوصية
                </button>
              </p>
            </button>
          )}
        />
        <AnimatePresence>{renderFieldError('acceptedTerms')}</AnimatePresence>

        {/* Submit */}
        <motion.button
          type="submit"
          disabled={isSubmitting}
          whileTap={isSubmitting ? {} : { scale: 0.97 }}
          className="w-full h-[52px] rounded-2xl text-sm font-bold text-white transition-all duration-200 flex items-center justify-center gap-2.5 disabled:opacity-60 mt-1"
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
              <UserPlus size={18} strokeWidth={2.5} />
              <span>إنشاء حساب</span>
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
          <span>Google التسجيل بـ</span>
        </motion.button>

        {/* Security */}
        <div className="flex items-center justify-center gap-1.5 pt-1 pb-4">
          <ShieldCheck size={12} style={{ color: themeConfig.colors.textMuted + '80' }} />
          <p className="text-[10px] font-medium" style={{ color: themeConfig.colors.textMuted + '80' }}>
            بياناتك مشفرة ومحمية
          </p>
        </div>
      </motion.form>

      {/* Footer */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
        className="px-5 py-5 text-center"
      >
        <p className="text-xs" style={{ color: themeConfig.colors.textMuted }}>
          لديك حساب؟{' '}
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={() => navigate('login')}
            className="font-bold"
            style={{ color: themeConfig.colors.primary }}
          >
            سجل الدخول
          </motion.button>
        </p>
      </motion.div>
    </motion.div>
  );
}
