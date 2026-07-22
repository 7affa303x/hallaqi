import { useEffect, useState } from 'react';
import { ArrowLeft, Bookmark, MessageCircle, ShoppingBag } from 'lucide-react';
import { useApp } from '@/contexts/useApp';
import EmptyState from '@/components/EmptyState';
import PausedFeatureBanner from '@/components/PausedFeatureBanner';
import { FEATURE_FLAGS } from '@/lib/featureFlags';
import {
  DEVICE_SAVE_HINT,
  getForumBookmarkIds,
  getMarketplaceSavedIds,
} from '@/lib/deviceStorage';
import { getMarketplaceProductById } from '@/supabase/marketplace';
import { formatDzd } from '@/lib/marketplace/filters';
import type { MarketplaceProduct } from '@/types/marketplace';

type SavedTab = 'products' | 'forum';

/**
 * Device-only saved products + forum bookmarks — top select tabs (not a multi-section landing).
 */
export default function SavedItemsPage({ onBack }: { onBack: () => void }) {
  const { themeConfig, navigate, setActiveTab, forumPosts } = useApp();
  const [tab, setTab] = useState<SavedTab>('products');
  const [products, setProducts] = useState<MarketplaceProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const bookmarkIds = getForumBookmarkIds();
  const bookmarkedPosts = forumPosts.filter(p => bookmarkIds.includes(p.id));

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const ids = getMarketplaceSavedIds();
      const loaded = await Promise.all(ids.map(id => getMarketplaceProductById(id)));
      if (cancelled) return;
      setProducts(loaded.filter((p): p is MarketplaceProduct => Boolean(p)));
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, []);

  return (
    <div className="pb-20 min-h-screen" style={{ backgroundColor: themeConfig.colors.background }}>
      <div className="sticky top-0 z-30 border-b" style={{ backgroundColor: themeConfig.colors.surface, borderColor: themeConfig.colors.border }}>
        <div className="flex items-center gap-3 px-4 py-3">
          <button type="button" onClick={onBack} aria-label="رجوع" className="w-9 h-9 rounded-xl flex items-center justify-center">
            <ArrowLeft size={20} style={{ color: themeConfig.colors.text }} />
          </button>
          <h2 className="text-base font-bold" style={{ color: themeConfig.colors.text }}>محفوظاتي</h2>
        </div>
        <div className="flex gap-1 px-4 pb-3">
          {([
            { key: 'products' as const, label: 'منتجات', icon: ShoppingBag, count: products.length },
            { key: 'forum' as const, label: 'منتدى', icon: MessageCircle, count: bookmarkedPosts.length },
          ]).map(item => {
            const Icon = item.icon;
            const on = tab === item.key;
            return (
              <button
                key={item.key}
                type="button"
                onClick={() => setTab(item.key)}
                className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-bold"
                style={{
                  backgroundColor: on ? themeConfig.colors.primary : themeConfig.colors.background,
                  color: on ? '#fff' : themeConfig.colors.textMuted,
                }}
              >
                <Icon size={14} />
                {item.label}
                <span className="text-[10px] opacity-80">({item.count})</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="p-4 space-y-3">
        {!FEATURE_FLAGS.serverBookmarksEnabled && (
          <PausedFeatureBanner
            title="مزامنة السحابة"
            description={`${DEVICE_SAVE_HINT}. المزامنة بين الأجهزة متوقفة عند الإطلاق.`}
            kind="paused"
            colors={themeConfig.colors}
          />
        )}

        {tab === 'products' && (
          loading ? (
            <p className="text-xs" style={{ color: themeConfig.colors.textMuted }}>جاري التحميل...</p>
          ) : products.length === 0 ? (
            <EmptyState
              icon={Bookmark}
              title="لا منتجات محفوظة"
              description="احفظ منتجات من السوق لتجدها هنا على هذا الجهاز"
              actionLabel="افتح السوق"
              onAction={() => { setActiveTab('marketplace'); onBack(); }}
              themeConfig={themeConfig}
              iconSize={40}
            />
          ) : (
            <div className="space-y-2">
              {products.map(p => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => navigate('product-detail', { productId: p.id })}
                  className="w-full flex items-center gap-3 p-3 rounded-2xl border text-right"
                  style={{ backgroundColor: themeConfig.colors.surface, borderColor: themeConfig.colors.border }}
                >
                  <img
                    src={p.imageUrls[0] || '/logo-icon.svg'}
                    alt=""
                    loading="lazy"
                    decoding="async"
                    className="w-14 h-14 rounded-xl object-cover shrink-0"
                  />
                  <span className="flex-1 min-w-0">
                    <span className="block text-xs font-bold truncate" style={{ color: themeConfig.colors.text }}>{p.title}</span>
                    <span className="block text-[11px] mt-0.5" style={{ color: themeConfig.colors.primary }}>{formatDzd(p.priceDzd)}</span>
                  </span>
                </button>
              ))}
            </div>
          )
        )}

        {tab === 'forum' && (
          bookmarkedPosts.length === 0 ? (
            <EmptyState
              icon={MessageCircle}
              title="لا إشارات بعد"
              description="احفظ منشورات من المنتدى لتراجعها لاحقاً"
              actionLabel="افتح المنتدى"
              onAction={() => { setActiveTab('forum'); onBack(); }}
              themeConfig={themeConfig}
              iconSize={40}
            />
          ) : (
            <div className="space-y-2">
              {bookmarkedPosts.map(post => (
                <button
                  key={post.id}
                  type="button"
                  onClick={() => navigate('post-detail', { postId: post.id })}
                  className="w-full p-3 rounded-2xl border text-right"
                  style={{ backgroundColor: themeConfig.colors.surface, borderColor: themeConfig.colors.border }}
                >
                  <p className="text-xs font-bold line-clamp-2" style={{ color: themeConfig.colors.text }}>{post.title}</p>
                  <p className="text-[10px] mt-1" style={{ color: themeConfig.colors.textMuted }}>{post.authorName}</p>
                </button>
              ))}
            </div>
          )
        )}
      </div>
    </div>
  );
}
