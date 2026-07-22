-- Reward store pricing/content polish (UX pass 2)

UPDATE public.reward_store_items
SET
  title = 'شهر Pro مجاني',
  description = 'اشتراك احترافي لمدة شهر واحد',
  coin_cost = 2000,
  image_emoji = '👑'
WHERE id = 'pro_month';

UPDATE public.reward_store_items
SET
  title = 'رصيد ترويج',
  description = 'رصيد إعلاني للحلاقين داخل المنصة',
  coin_cost = 150,
  category = 'credit',
  image_emoji = '📣'
WHERE id = 'promo_credit';

UPDATE public.reward_store_items
SET
  title = 'حلاقة مجانية',
  description = 'حلاقة مجانية حتى 50,000 دج — فوق ذلك يُطبَّق تخفيض',
  coin_cost = 400,
  image_emoji = '💈'
WHERE id = 'gift_card';

UPDATE public.reward_store_items
SET is_active = false
WHERE id IN ('product_sample', 'coupon_10');
