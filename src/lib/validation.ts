import { z } from 'zod';

/* ------------------------------------------------------------------ */
/*  Auth schemas                                                        */
/* ------------------------------------------------------------------ */

export const loginSchema = z.object({
  email: z.string().min(1, 'أدخل البريد الإلكتروني').email('البريد الإلكتروني غير صالح'),
  password: z.string().min(1, 'أدخل كلمة المرور').min(6, 'كلمة المرور قصيرة جداً'),
});

export const registerSchema = z.object({
  name: z.string().min(1, 'أدخل اسمك الكامل').min(2, 'الاسم قصير جداً'),
  email: z.string().min(1, 'أدخل البريد الإلكتروني').email('البريد الإلكتروني غير صالح'),
  password: z.string().min(1, 'أدخل كلمة المرور').min(6, 'يجب أن تكون 6 أحرف على الأقل'),
  confirm: z.string().min(1, 'أكد كلمة المرور'),
  accountType: z.enum(['client', 'barber', 'store', 'company', 'doctor']),
  acceptedTerms: z.boolean().refine(v => v === true, 'يجب قبول الشروط'),
}).refine(data => data.password === data.confirm, {
  message: 'كلمتا المرور غير متطابقتين',
  path: ['confirm'],
});

export const forgotPasswordSchema = z.object({
  email: z.string().min(1, 'أدخل البريد الإلكتروني').email('البريد الإلكتروني غير صالح'),
});

export const resetPasswordSchema = z.object({
  password: z.string().min(1, 'أدخل كلمة المرور').min(6, 'كلمة المرور يجب أن تكون 6 أحرف على الأقل.'),
  confirmPassword: z.string().min(1, 'أدخل تأكيد كلمة المرور').min(6, 'كلمة المرور يجب أن تكون 6 أحرف على الأقل.'),
}).refine(data => data.password === data.confirmPassword, {
  message: 'كلمات المرور غير متطابقة.',
  path: ['confirmPassword'],
});

/* ------------------------------------------------------------------ */
/*  Profile / Barber schemas                                           */
/* ------------------------------------------------------------------ */

export const editBarberProfileSchema = z.object({
  full_name: z.string().min(1, 'الاسم مطلوب'),
  bio: z.string().optional(),
  phone_number: z.string().optional(),
  business_name: z.string().optional(),
  business_address: z.string().optional(),
  business_phone: z.string().optional(),
  business_email: z.string().email('البريد الإلكتروني غير صالح').optional(),
  website_url: z.string().url('رابط غير صالح').optional(),
});

export const serviceSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(2, 'الاسم قصير جداً'),
  description: z.string().optional(),
  price: z.number().min(1, 'السعر يجب أن يكون موجباً').max(25000, 'السعر غير منطقي'),
  duration: z.number().min(5, 'المدة قصيرة جداً').max(240, 'المدة طويلة جداً').int(),
  category: z.enum(['haircut', 'beard', 'shave', 'hair_treatment', 'facial', 'coloring', 'styling', 'package']),
});

export const servicesArraySchema = z.object({
  services: z.array(serviceSchema),
});

/* ------------------------------------------------------------------ */
/*  Working hours schema                                               */
/* ------------------------------------------------------------------ */

export const dayScheduleSchema = z.object({
  day_of_week: z.number(),
  start_time: z.string(),
  end_time: z.string(),
  is_active: z.boolean(),
});

export const workingHoursSchema = z.object({
  days: z.array(dayScheduleSchema),
});

/* ------------------------------------------------------------------ */
/*  Availability exception schema                                      */
/* ------------------------------------------------------------------ */

export const availabilityExceptionSchema = z.object({
  date: z.string().min(1, 'يرجى اختيار التاريخ'),
  type: z.enum(['holiday', 'vacation', 'closed']),
  reason: z.string().optional(),
});

/* ------------------------------------------------------------------ */
/*  Booking schemas                                                    */
/* ------------------------------------------------------------------ */

export const bookingStep3Schema = z.object({
  paymentMethod: z.enum(['ccp', 'baridi-mob', 'cash', 'card']),
  note: z.string().optional(),
  isMobileService: z.boolean(),
  address: z.string().optional(),
}).refine(data => {
  if (!data.isMobileService) return true;
  return Boolean(data.address && data.address.trim().length >= 8);
}, {
  message: 'أدخل عنواناً واضحاً (8 أحرف على الأقل) للخدمة المتنقلة',
  path: ['address'],
});

/* ------------------------------------------------------------------ */
/*  Receipt upload schema                                              */
/* ------------------------------------------------------------------ */

export const receiptUploadSchema = z.object({
  transactionRef: z.string().optional(),
});

/* ------------------------------------------------------------------ */
/*  Payment approval schema                                            */
/* ------------------------------------------------------------------ */

export const paymentRejectSchema = z.object({
  reason: z.string().optional(),
});

export const forumPostSchema = z.object({
  title: z.string().trim().min(3, 'العنوان قصير جداً').max(120, 'العنوان طويل جداً'),
  content: z.string().trim().min(10, 'اكتب تفاصيل أكثر').max(5000, 'المحتوى طويل جداً'),
  categoryId: z.string().uuid('اختر تصنيفاً صالحاً'),
});

/* ------------------------------------------------------------------ */
/*  Type exports                                                       */
/* ------------------------------------------------------------------ */

export type LoginFormData = z.infer<typeof loginSchema>;
export type RegisterFormData = z.infer<typeof registerSchema>;
export type ForgotPasswordFormData = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordFormData = z.infer<typeof resetPasswordSchema>;
export type EditBarberProfileFormData = z.infer<typeof editBarberProfileSchema>;
export type ServiceFormData = z.infer<typeof serviceSchema>;
export type WorkingHoursFormData = z.infer<typeof workingHoursSchema>;
export type ServicesFormData = z.infer<typeof servicesArraySchema>;
export type AvailabilityExceptionFormData = z.infer<typeof availabilityExceptionSchema>;
export type BookingStep3FormData = z.infer<typeof bookingStep3Schema>;
export type ReceiptUploadFormData = z.infer<typeof receiptUploadSchema>;
export type PaymentRejectFormData = z.infer<typeof paymentRejectSchema>;
export type ForumPostFormData = z.infer<typeof forumPostSchema>;
