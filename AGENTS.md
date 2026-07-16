# تعليمات للعميل الذي يعمل على هذا المشروع

عند كل تعديل تنفذه:
- اكتب رسالة commit واضحة تبدأ بنوع التغيير بين قوسين، مثال:
  [feat] إضافة نظام حجز المواعيد
  [fix] إصلاح خطأ في تسجيل الدخول
  [refactor] إعادة تنظيم كود الحجز
  [docs] تحديث التوثيق
- اجعل الرسالة تشرح "ماذا" و"لماذا" بجملة أو جملتين، بالعربية أو الإنجليزية.
- لا تدفع أي تعديل مباشرة إلى main، اعمل دائمًا على فرع منفصل باسم وصفي (مثال: feat-booking-system).

## Cursor Cloud specific instructions

Hallaqi is a single-service Vite + React 19 + TypeScript SPA (Arabic/RTL) with Supabase as the backend. There is no separate backend service to run locally. Standard commands live in `README.md` / `package.json` (`npm run dev` on port 3000, `npm run build`, `npm run typecheck`, `npm run lint`).

Non-obvious notes:
- `.env` is gitignored. The update script recreates it from `.env.example` (which ships with working `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY`) if missing. Vite only reads `VITE_`-prefixed vars at dev-server start, so restart `npm run dev` after editing `.env`.
- The bundled Supabase project is reachable but effectively empty and its `handle_new_user`/`profiles` migrations are not applied there, so real signup returns "Database error saving new user" and data lists come back empty. Do not assume a seeded backend.
- For local development/testing without a backend, use Developer Mode: click the small floating `</>` button at the bottom-left of the app. It reloads with a purple "وضع المطور" bar, logs in a mock user, and loads mock barbers/bookings/forum data. Caveat: mock data only loads when Supabase is NOT configured — with `.env` present, dev mode still fetches the (empty) real backend. To fully use mock data, temporarily blank the `VITE_SUPABASE_*` values in `.env` and restart the dev server.
- In Developer Mode, local-state actions (follow a barber, like a forum post) work end-to-end, but final booking submission calls Supabase and fails ("Supabase غير مُعد") because writes need a live backend.
- `pnpm-lock.yaml` and `pnpm-workspace.yaml` exist, but `pnpm-workspace.yaml` contains placeholder/invalid values; use npm (matches `README.md` and `package-lock.json`).
- `npm run lint` currently reports pre-existing errors in the repo (not an environment problem).
