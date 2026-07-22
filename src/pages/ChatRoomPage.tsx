import { useState, useRef, useEffect, useCallback } from 'react';
import { useApp } from '@/contexts/useApp';
import { useAuth } from '@/hooks/useAuth';
import {
  getConversationMessages,
  sendMessage as dbSendMessage,
  subscribeToMessages,
  markMessagesAsRead,
} from '@/supabase/database';
import type { Message } from '@/types/supabase-aliases';
import { motion } from 'framer-motion';
import { ArrowLeft, Send, User as UserIcon, Check, CheckCheck, Phone, Video } from 'lucide-react';
import { BARBER_MESSAGE_TEMPLATES } from '@/lib/barber/messageTemplates';

function formatTime(iso: string | null): string {
  if (!iso) return '';
  return new Date(iso).toLocaleTimeString('ar-DZ', { hour: '2-digit', minute: '2-digit' });
}

export default function ChatRoomPage() {
  const { themeConfig, screenParams, goBack, navigate } = useApp();
  const { appUser } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [messageText, setMessageText] = useState('');
  const [sending, setSending] = useState(false);
  const [callMessage, setCallMessage] = useState('');
  const [showTemplates, setShowTemplates] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const conversationId = screenParams?.conversationId;
  const participantName = screenParams?.participantName || 'محادثة';
  const participantAvatar = screenParams?.participantAvatar;
  const participantId = screenParams?.participantId;
  const isProfessional = appUser?.user_role === 'barber' || appUser?.user_role === 'specialist';

  const load = useCallback(async () => {
    if (!conversationId) return;
    try {
      setMessages(await getConversationMessages(conversationId));
    } catch {
      setMessages([]);
    }
  }, [conversationId]);

  useEffect(() => { void load(); }, [load]);

  useEffect(() => {
    if (!conversationId) return;
    const channel = subscribeToMessages(conversationId, setMessages);
    return () => { try { channel.unsubscribe(); } catch { /* ignore */ } };
  }, [conversationId]);

  useEffect(() => {
    if (conversationId && appUser) markMessagesAsRead(conversationId, appUser.id).catch(() => {});
  }, [conversationId, appUser, messages.length]);

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages.length]);

  if (!conversationId || !appUser) {
    return (
      <div className="h-screen flex flex-col items-center justify-center" style={{ backgroundColor: themeConfig.colors.background }}>
        <img src="/logo-icon.svg" alt="Hallaqi" className="w-16 h-16 mb-4 opacity-30" />
        <p style={{ color: themeConfig.colors.textMuted }}>الدردشة غير متاحة</p>
        <button onClick={goBack} className="mt-4 px-4 py-2 rounded-xl text-xs font-bold text-white" style={{ backgroundColor: themeConfig.colors.primary }}>رجوع</button>
      </div>
    );
  }

  const handleSend = async (preset?: string) => {
    const text = (preset ?? messageText).trim();
    if (!text || sending) return;
    if (!preset) setMessageText('');
    setSending(true);
    setShowTemplates(false);
    try {
      await dbSendMessage({ conversation_id: conversationId, sender_id: appUser.id, content: text, status: 'sent', type: 'text' });
      await load();
    } catch {
      if (!preset) setMessageText(text);
    } finally {
      setSending(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 300 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 300 }}
      transition={{ type: 'spring', damping: 25, stiffness: 200 }}
      className="h-[100dvh] max-h-[100dvh] flex flex-col overflow-hidden" style={{ backgroundColor: themeConfig.colors.background }}>

      <div className="flex items-center gap-3 px-4 py-3 border-b backdrop-blur-lg flex-shrink-0"
        style={{ backgroundColor: `${themeConfig.colors.surface}ee`, borderColor: themeConfig.colors.border }}>
        <button onClick={goBack} className="w-10 h-10 rounded-xl flex items-center justify-center">
          <ArrowLeft size={22} style={{ color: themeConfig.colors.text }} />
        </button>
        <button onClick={() => participantId && navigate('barber-detail', { barberId: participantId })} className="flex items-center gap-3 flex-1 min-w-0 text-right">
          {participantAvatar
            ? <img src={participantAvatar} alt={participantName} className="w-10 h-10 rounded-xl object-cover" />
            : <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: themeConfig.colors.primary + '15' }}><UserIcon size={20} style={{ color: themeConfig.colors.primary }} /></div>}
          <p className="text-sm font-bold truncate" style={{ color: themeConfig.colors.text }}>{participantName}</p>
        </button>
        <button onClick={() => setCallMessage('المكالمة الصوتية قيد ربط مزود الاتصال — قريباً')} aria-label="مكالمة صوتية قريباً" className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ backgroundColor: themeConfig.colors.primary + '10', color: themeConfig.colors.primary }}><Phone size={16} /></button>
        <button onClick={() => setCallMessage('مكالمة الفيديو قيد ربط مزود الاتصال — قريباً')} aria-label="مكالمة فيديو قريباً" className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ backgroundColor: themeConfig.colors.primary + '10', color: themeConfig.colors.primary }}><Video size={16} /></button>
      </div>
      {callMessage && <button onClick={() => setCallMessage('')} className="mx-4 mt-2 p-2 rounded-xl text-[11px] text-center" style={{ backgroundColor: themeConfig.colors.warning + '12', color: themeConfig.colors.warning }}>{callMessage}</button>}

      <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-3 overscroll-contain">
        {messages.length === 0 && (
          <p className="text-center text-xs mt-8" style={{ color: themeConfig.colors.textMuted }}>ابدأ المحادثة بإرسال رسالة</p>
        )}
        {messages.map((msg) => {
          const isMe = msg.sender_id === appUser.id;
          return (
            <div key={msg.id} className={`flex ${isMe ? 'justify-start' : 'justify-end'}`}>
              <div className="max-w-[75%]">
                <div className="px-3.5 py-2.5 rounded-2xl"
                  style={{
                    backgroundColor: isMe ? themeConfig.colors.primary : themeConfig.colors.surface,
                    color: isMe ? '#fff' : themeConfig.colors.text,
                    border: !isMe ? `1px solid ${themeConfig.colors.border}` : undefined,
                  }}>
                  <p className="text-sm leading-relaxed">{msg.content}</p>
                </div>
                <div className={`flex items-center gap-1 mt-1 ${isMe ? 'mr-1' : 'ml-1'}`}>
                  <span className="text-[9px]" style={{ color: themeConfig.colors.textMuted }}>{formatTime(msg.created_at)}</span>
                  {isMe && (msg.status === 'read' ? <CheckCheck size={10} className="text-sky-500" /> : <Check size={10} style={{ color: themeConfig.colors.textMuted }} />)}
                </div>
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {isProfessional && showTemplates && (
        <div className="px-3 pb-2 flex gap-2 overflow-x-auto">
          {BARBER_MESSAGE_TEMPLATES.map(tpl => (
            <button
              key={tpl.id}
              type="button"
              onClick={() => void handleSend(tpl.body)}
              className="whitespace-nowrap px-3 h-8 rounded-full text-[11px] font-bold shrink-0"
              style={{ backgroundColor: themeConfig.colors.primary + '14', color: themeConfig.colors.primary }}
            >
              {tpl.label}
            </button>
          ))}
        </div>
      )}

      <div className="flex-shrink-0 p-3 border-t backdrop-blur-lg"
        style={{ backgroundColor: `${themeConfig.colors.surface}ee`, borderColor: themeConfig.colors.border }}>
        <div className="max-w-lg mx-auto flex items-center gap-2">
          {isProfessional && (
            <button
              type="button"
              onClick={() => setShowTemplates(v => !v)}
              className="h-10 px-3 rounded-xl text-[11px] font-bold shrink-0"
              style={{ backgroundColor: themeConfig.colors.background, color: themeConfig.colors.primary }}
            >
              قوالب
            </button>
          )}
          <div className="flex-1 relative">
            <input type="text" value={messageText} onChange={(e) => setMessageText(e.target.value)}
              placeholder="اكتب رسالة..."
              className="w-full h-10 px-4 text-sm rounded-xl outline-none"
              style={{ backgroundColor: themeConfig.colors.background, color: themeConfig.colors.text }}
              onKeyDown={(e) => e.key === 'Enter' && void handleSend()} />
          </div>
          <button onClick={() => void handleSend()} disabled={!messageText.trim() || sending}
            className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 disabled:opacity-50"
            style={{ backgroundColor: themeConfig.colors.primary }}>
            <Send size={18} className="text-white" />
          </button>
        </div>
      </div>
    </motion.div>
  );
}
