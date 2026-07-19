import { useEffect, useState } from 'react';
import { ArrowRight, MessageSquare } from 'lucide-react';
import { useApp } from '@/contexts/useApp';
import { useAuth } from '@/hooks/useAuth';
import { getUserConversations } from '@/supabase/database';
import BrandLogo from '@/components/BrandLogo';
import EmptyState from '@/components/EmptyState';

type ConversationSummary = Awaited<ReturnType<typeof getUserConversations>>[number];

export default function MessagesPage() {
  const { themeConfig, navigate, goBack } = useApp();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (authLoading) return;
    if (!isAuthenticated) {
      navigate('login', { redirectScreen: 'messages' });
      return;
    }
    let cancelled = false;
    setLoading(true);
    getUserConversations()
      .then(rows => { if (!cancelled) setConversations(rows); })
      .catch(err => { if (!cancelled) setError(err instanceof Error ? err.message : 'تعذر تحميل المحادثات'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [authLoading, isAuthenticated, navigate]);

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: themeConfig.colors.background }}>
        <div className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: themeConfig.colors.primary }} />
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-8" style={{ backgroundColor: themeConfig.colors.background }}>
      <header className="sticky top-0 z-30 flex items-center gap-3 px-4 py-3 border-b" style={{ backgroundColor: themeConfig.colors.surface, borderColor: themeConfig.colors.border }}>
        <button onClick={goBack} aria-label="رجوع" className="w-10 h-10 rounded-xl flex items-center justify-center"><ArrowRight size={20} style={{ color: themeConfig.colors.text }} /></button>
        <BrandLogo className="w-9 h-9 shadow-sm" />
        <div><h1 className="text-base font-bold" style={{ color: themeConfig.colors.text }}>المحادثات</h1><p className="text-[10px]" style={{ color: themeConfig.colors.textMuted }}>تواصل مع العملاء والحلاقين</p></div>
      </header>

      <main className="p-4 space-y-2">
        {loading && [0, 1, 2].map(item => <div key={item} className="h-20 rounded-2xl animate-pulse" style={{ backgroundColor: themeConfig.colors.surface }} />)}
        {!loading && conversations.map(conversation => (
          <button
            key={conversation.conversation_id}
            type="button"
            onClick={() => navigate('chat-room', {
              conversationId: conversation.conversation_id,
              participantId: conversation.participant_id,
              participantName: conversation.participant_name,
              participantAvatar: conversation.participant_avatar || undefined,
            })}
            className="w-full p-3 rounded-2xl border flex items-center gap-3 text-right"
            style={{ backgroundColor: themeConfig.colors.surface, borderColor: themeConfig.colors.border }}
          >
            {conversation.participant_avatar
              ? <img src={conversation.participant_avatar} alt="" loading="lazy" decoding="async" className="w-12 h-12 rounded-xl object-cover" />
              : <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ backgroundColor: themeConfig.colors.primary + '12' }}><MessageSquare size={20} style={{ color: themeConfig.colors.primary }} /></div>}
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-bold truncate" style={{ color: themeConfig.colors.text }}>{conversation.participant_name}</p>
                {conversation.last_message_at && <span className="text-[9px]" style={{ color: themeConfig.colors.textMuted }}>{new Date(conversation.last_message_at).toLocaleDateString('ar-DZ')}</span>}
              </div>
              <p className="text-[11px] truncate mt-1" style={{ color: themeConfig.colors.textMuted }}>{conversation.last_message || 'ابدأ المحادثة'}</p>
            </div>
            {conversation.unread_count > 0 && <span className="min-w-6 h-6 px-1 rounded-full text-[10px] text-white flex items-center justify-center" style={{ backgroundColor: themeConfig.colors.error }}>{Math.min(Number(conversation.unread_count), 99)}</span>}
          </button>
        ))}
        {!loading && conversations.length === 0 && !error && (
          <EmptyState
            icon={MessageSquare}
            title="لا توجد محادثات بعد"
            description="ابدأ من ملف الحلاق أو من موعدك"
            themeConfig={themeConfig}
          />
        )}
        {error && <p role="alert" className="text-xs p-3 rounded-xl" style={{ backgroundColor: themeConfig.colors.error + '10', color: themeConfig.colors.error }}>{error}</p>}
      </main>
    </div>
  );
}
