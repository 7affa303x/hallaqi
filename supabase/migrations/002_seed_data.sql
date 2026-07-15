-- Hallaqi Seed Data
-- Run this after 001_initial_schema.sql

-- ============================================
-- FORUM CATEGORIES
-- ============================================
INSERT INTO forum_categories (name, slug, description, icon, color, sort_order) VALUES
  ('عام', 'general', 'مواضيع عامة حول الحلاقة والعناية بالشعر', 'MessageCircle', '#6366f1', 1),
  ('نصائح وتعليم', 'tips', 'نصائح احترافية وتقنيات حلاقة متقدمة', 'Lightbulb', '#f59e0b', 2),
  ('منتجات وأدوات', 'products', 'مراجعات المنتجات وأدوات الحلاقة', 'ShoppingBag', '#10b981', 3),
  ('تسريحات شعر', 'hairstyles', 'أحدث تسريحات الشعر والاتجاهات', 'Scissors', '#ec4899', 4),
  ('مسابقات', 'competitions', 'مسابقات وجوائز للمجتمع', 'Trophy', '#8b5cf6', 5)
ON CONFLICT (slug) DO NOTHING;

-- ============================================
-- SAMPLE PROFILES (for testing - these need matching auth.users entries)
-- ============================================
-- Note: For production, profiles are auto-created via trigger on auth.users insert
-- These sample entries are for documentation purposes only

-- ============================================
-- WILAYAS (Algerian states) - stored as reference data
-- ============================================
-- The 'city' field in profiles can use any of these values:
-- أدرار, الشلف, الأغواط, أم البواقي, باتنة, بجاية, بسكرة, بشار, البليدة, البويرة,
-- تمنراست, تبسة, تلمسان, تيارت, تيزي وزو, الجزائر, الجلفة, جيجل, سطيف, سعيدة,
-- سكيكدة, سيدي بلعباس, عنابة, قالمة, قسنطينة, المدية, مستغانم, المسيلة, معسكر, ورقلة,
-- وهران, البيض, إليزي, برج بوعريريج, بومرداس, الطارف, تندوف, تيسمسيلت, الوادي, خنشلة,
-- سوق أهراس, تيبازة, ميلة, عين الدفلى, النعامة, عين تيموشنت, غرداية, غليزان, تيميمون,
-- برج باجي مختار, أولاد جلال, بني عباس, إن صالح, إن قزام, توغورت, جانت, المغير, المنيعة
