import { useEffect, useState } from 'react';
import { ArrowLeft, Save, Building2 } from 'lucide-react';
import { useApp } from '@/contexts/useApp';
import { useAuth } from '@/hooks/useAuth';
import {
  ensureMarketplaceSellerProfile,
  getMarketplaceSellerById,
  updateMarketplaceSellerProfile,
} from '@/supabase/marketplace';
import type { MarketplaceSeller } from '@/types/marketplace';

export default function SellerProfileEditPage() {
  const { themeConfig, goBack, screenParams } = useApp();
  const { appUser } = useAuth();
  const role = (screenParams?.role || 'store') as 'store' | 'company' | 'doctor';
  const sellerId = screenParams?.sellerId || appUser?.id || `demo-${role}`;

  const [seller, setSeller] = useState<MarketplaceSeller | null>(null);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState('');
  const [form, setForm] = useState({
    displayName: '',
    shortDescription: '',
    about: '',
    websiteUrl: '',
    contactEmail: '',
    contactPhone: '',
    wilaya: '',
    deliveryAreas: '',
    brandName: '',
    logoUrl: '',
    coverUrl: '',
    instagram: '',
    facebook: '',
    tiktok: '',
  });

  useEffect(() => {
    void (async () => {
      await ensureMarketplaceSellerProfile({
        id: sellerId,
        sellerType: role,
        displayName: appUser?.full_name || 'متجري',
        contactEmail: undefined,
      });
      const s = await getMarketplaceSellerById(sellerId);
      if (!s) return;
      setSeller(s);
      setForm({
        displayName: s.displayName || '',
        shortDescription: s.shortDescription || '',
        about: s.about || '',
        websiteUrl: s.websiteUrl || '',
        contactEmail: s.contactEmail || '',
        contactPhone: s.contactPhone || '',
        wilaya: s.wilaya || '',
        deliveryAreas: (s.deliveryAreas || []).join('، '),
        brandName: s.brandName || '',
        logoUrl: s.logoUrl || '',
        coverUrl: s.coverUrl || '',
        instagram: s.socialLinks?.instagram || '',
        facebook: s.socialLinks?.facebook || '',
        tiktok: s.socialLinks?.tiktok || '',
      });
    })();
  }, [sellerId, role, appUser?.full_name]);

  const save = async () => {
    setSaving(true);
    setToast('');
    const result = await updateMarketplaceSellerProfile(sellerId, {
      displayName: form.displayName.trim(),
      shortDescription: form.shortDescription.trim(),
      about: form.about.trim(),
      websiteUrl: form.websiteUrl.trim(),
      contactEmail: form.contactEmail.trim(),
      contactPhone: form.contactPhone.trim(),
      wilaya: form.wilaya.trim(),
      deliveryAreas: form.deliveryAreas.split(/[،,]/).map(s => s.trim()).filter(Boolean),
      brandName: form.brandName.trim(),
      logoUrl: form.logoUrl.trim(),
      coverUrl: form.coverUrl.trim(),
      socialLinks: {
        instagram: form.instagram.trim(),
        facebook: form.facebook.trim(),
        tiktok: form.tiktok.trim(),
      },
    });
    setSaving(false);
    if (result.ok) {
      setSeller(result.seller);
      setToast('تم حفظ الملف');
    } else {
      setToast(result.error);
    }
  };

  return (
    <div className="min-h-screen pb-24 px-4 pt-4" style={{ backgroundColor: themeConfig.colors.background }}>
      <div className="flex items-center gap-3 mb-4">
        <button type="button" onClick={goBack} className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: themeConfig.colors.surface }} aria-label="رجوع">
          <ArrowLeft size={18} />
        </button>
        <h1 className="text-base font-black flex items-center gap-1" style={{ color: themeConfig.colors.text }}>
          <Building2 size={16} /> تعديل ملف {role === 'company' ? 'الشركة' : role === 'doctor' ? 'الدكتور' : 'المتجر'}
        </h1>
      </div>

      {seller && (
        <p className="text-[11px] mb-3" style={{ color: themeConfig.colors.textMuted }}>
          الحالة: {seller.approvalStatus} · الخطة: {seller.subscriptionPlan} · الحد: {seller.listingCap}/99
        </p>
      )}

      <div className="space-y-2">
        {([
          ['displayName', 'الاسم الظاهر'],
          ['brandName', 'العلامة التجارية'],
          ['shortDescription', 'وصف قصير'],
          ['websiteUrl', 'رابط الموقع (Visit Store)'],
          ['contactEmail', 'البريد'],
          ['contactPhone', 'الهاتف'],
          ['wilaya', 'الولاية'],
          ['deliveryAreas', 'مناطق التوصيل (مفصولة بفاصلة)'],
          ['logoUrl', 'رابط الشعار'],
          ['coverUrl', 'رابط صورة الغلاف'],
          ['instagram', 'Instagram'],
          ['facebook', 'Facebook'],
          ['tiktok', 'TikTok'],
        ] as const).map(([key, label]) => (
          <label key={key} className="block text-xs">
            <span style={{ color: themeConfig.colors.textMuted }}>{label}</span>
            <input
              className="w-full mt-1 rounded-xl p-2.5 text-sm outline-none border"
              value={form[key]}
              onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
              style={{ backgroundColor: themeConfig.colors.surface, color: themeConfig.colors.text, borderColor: themeConfig.colors.border }}
            />
          </label>
        ))}
        <label className="block text-xs">
          <span style={{ color: themeConfig.colors.textMuted }}>حول</span>
          <textarea
            rows={4}
            className="w-full mt-1 rounded-xl p-2.5 text-sm outline-none border"
            value={form.about}
            onChange={e => setForm(f => ({ ...f, about: e.target.value }))}
            style={{ backgroundColor: themeConfig.colors.surface, color: themeConfig.colors.text, borderColor: themeConfig.colors.border }}
          />
        </label>
      </div>

      <button
        type="button"
        disabled={saving}
        onClick={() => void save()}
        className="w-full mt-4 py-3 rounded-2xl text-sm font-black text-white flex items-center justify-center gap-2"
        style={{ backgroundColor: themeConfig.colors.primary, opacity: saving ? 0.7 : 1 }}
      >
        <Save size={16} /> حفظ
      </button>
      {toast && <p className="text-xs text-center mt-2 font-bold" style={{ color: themeConfig.colors.success }}>{toast}</p>}
      <p className="text-[10px] text-center mt-3" style={{ color: themeConfig.colors.textMuted }}>
        الشراء يبقى على موقعك الخارجي — Hallaqi طبقة اكتشاف فقط
      </p>
    </div>
  );
}
