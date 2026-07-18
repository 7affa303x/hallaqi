# ملاحظات ما قبل الإطلاق — Hallaqi

تاريخ: 2026-07-18

## إصلاحات هذا التحديث (حرج للإطلاق)

| المشكلة | الإصلاح |
|---------|---------|
| زر الرجوع لا يعمل | `goBack` يعود دائماً (fallback للرئيسية) + `replaceState` بدل تكديس التاريخ |
| شكل التنقل يتغير بعد التسجيل / فتح AI | التبويبات لا تغادر الـ shell؛ AI يبقى تبويباً مع الشريط السفلي؛ بعد التسجيل/الدخول يُعاد ضبط الـ stack |
| المواعيد غير ظاهرة | زر كبير **المواعيد** في صفحة الحجز + رجوع من صفحة المواعيد |

## ما يعمل عند الإطلاق

- التنقل 5 تبويبات: حجز · منتدى · AI · سوق · بروفايل
- حجز مواعيد + صفحة المواعيد من زر الحجز
- السوق (اكتشاف + Visit Store خارجي https فقط)
- لوحات متجر/شركة/طبيب منفصلة عن استوديو الحلاق
- أدمن، منتدى، مساعد AI (Groq للنصوص)
- Onboarding أول زيارة + skip-to-content + soft 404
- ضغط صور قبل الرفع (منتدى / أفاتار / هوية / إيصالات)

## قريباً / متوقف (موقوف عمداً عند الإطلاق)

| الميزة | الحالة |
|--------|--------|
| برنامج الولاء / النقاط | **قريباً** (واجهة تظهر الشارة) |
| عمولات السوق | **قريباً** — مستبعد |
| Affiliate | **قريباً** — مستبعد |
| دفع منتجات داخل التطبيق | **قريباً** — الشراء خارجي فقط |
| لوجستيات شحن ثقيلة | **قريباً** |
| دفع البطاقة (Stripe) | **متوقف** — `cardPaymentsEnabled: false` |
| CCP / بريدي موب | **متوقف** — `ccpPaymentsEnabled: false` |
| ترقية الاشتراك المدفوع | **متوقف** — `paidSubscriptionsEnabled: false` |
| مواضع إعلان مدفوعة | **متوقف** — `paidPlacementsEnabled: false` |
| Web Push | **متوقف** — يحتاج `VITE_VAPID_PUBLIC_KEY` |
| مزامنة الحفظ/الإشارات للسيرفر | **متوقف** — جهاز فقط (`serverBookmarksEnabled`) |
| سجل تدقيق أدمن / لوحة مشرف | **متوقف** |
| تحليلات وهمية / mock | **متوقف** — أرقام حقيقية (قد تكون صفر) |
| OG ديناميكي لكل مسار SPA | **متوقف** — OG ثابت في index |
| E2E في CI | **متوقف** — typecheck/build يبقى |

## بعد الإطلاق مباشرة

1. ضبط `VITE_SUPABASE_URL` + anon key الحقيقية
2. تطبيق migrations السوق
3. تفعيل Gemini إن رغبت بأدوات AI الحية (يوجد fallback محلي)

## حالة المفاتيح (تحقق 2026-07-18)

| المفتاح | الحالة |
|---------|--------|
| Supabase URL + anon JWT | **يعمل** — `profiles` HTTP 200 |
| Supabase publishable (`sb_publishable_…`) | **يعمل** |
| Supabase service (`sb_secret_…`) | **يعمل** — للخادم فقط |
| Gemini API | **المفتاح صالح** لكن `generateContent` يرجع **429** (حصة مجانية منتهية) |
| **Groq API** | **✅ يعمل مجاناً** — `llama-3.3-70b-versatile` للنصوص |
| مخطط السوق على Supabase | **مُحدَّث** — بذر 3 بائعين + 6 منتجات |

### خطوات إصلاح Supabase

1. Supabase Dashboard → **SQL Editor** → نفّذ `supabase/migrations/20260718140000_replace_legacy_marketplace.sql`
2. ثم نفّذ بقية `20260718120000_marketplace_platform.sql` إن لزم (RPCs، اشتراكات، triggers)
3. تحقق: `node scripts/verify-credentials.mjs`

### متغيرات Vercel المطلوبة

```
VITE_SUPABASE_URL=https://cdwzbtjwqybnahhbhldy.supabase.co
VITE_SUPABASE_ANON_KEY=<anon JWT أو publishable>
SUPABASE_SERVICE_ROLE_KEY=<sb_secret — خادم فقط>
GROQ_API_KEY=<gsk_... — مجاني للنصوص>
AI_GENERATION_ENABLED=true
AI_TEXT_MODEL=llama-3.3-70b-versatile
VITE_AI_PROVIDER=groq
GEMINI_API_KEY=<اختياري — لتوليد الصور فقط>
```

### ما تم إصلاحه في دفعة الإطلاق P0 (2026-07-18)

- بذر 3 بائعين + 6 منتجات في Supabase
- إيقاف seed الوهمي عند اتصال Supabase (`marketplaceSeedFallback: false`)
- CSP يسمح بـ Stripe + Groq
- إلغاء الحجز تلقائياً عند فشل/إلغاء دفع البطاقة
- بوابة «بانتظار الموافقة» للبائعين
- روابط شروط/خصوصية من التسجيل + نص قانوني موسّع

### دفعة P1 (مكتملة + إيقاف احترافي)

- إظهار الدفع/الاشتراك/المواضع كـ **متوقف** في الواجهة (نقداً متاح)
- Visit Store https فقط + sitemap شركة/طبيب
- سياسة إلغاء أوضح + تحقق عنوان الجوال
- Web Push متوقف بدون VAPID
- حفظ/إشارات على الجهاز فقط
- سجل تدقيق/مشرف متوقفان في الأدمن

### دفعة P2 (بدأت)

- Soft onboarding أول زيارة (3 خطوات قابلة للتخطي)
- Skip link + soft 404
- Skeleton شبكة السوق
- صفحات عن/مساعدة أوضح
- تحليلات صادقة بدون mock
- ضغط صور وحدود حجم قبل الرفع
- توضيح شارات الثقة (موثّق / بريميوم / طبيب موثوق)

### ما زال ناقصاً (اختياري / لاحقاً)

- `VITE_STRIPE_PUBLISHABLE_KEY` + `STRIPE_SECRET_KEY` — دفع Stripe
- `VITE_CCP_ACCOUNT_NUMBER` + `VITE_CCP_CARD_NUMBER` — دفع CCP
- `VITE_VAPID_PUBLIC_KEY` — إشعارات الويب
- i18n أوسع، React Query، تقسيم Recharts
- كلمة مرور قاعدة البيانات أو `SUPABASE_ACCESS_TOKEN` لتشغيل `supabase db push`

> **أمان:** لا تضع المفاتيح في المحادثة أو Git. غيّر المفاتيح إذا تسرّبت.
