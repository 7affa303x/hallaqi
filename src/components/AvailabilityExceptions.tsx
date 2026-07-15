import { useState } from 'react';
import { useApp } from '@/contexts/useApp';
import { CalendarOff, Plus, AlertCircle, Info } from 'lucide-react';

interface ExceptionItem {
  id: string;
  date: string;
  type: string;
  reason: string;
}

const EXCEPTION_TYPES = [
  { key: 'holiday', label: 'عطلة رسمية' },
  { key: 'vacation', label: 'إجازة شخصية' },
  { key: 'closed', label: 'مغلق' },
];

export default function AvailabilityExceptions() {
  const { themeConfig } = useApp();
  const [exceptions] = useState<ExceptionItem[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [newDate, setNewDate] = useState('');
  const [newType, setNewType] = useState('closed');
  const [newReason, setNewReason] = useState('');
  const [isAdding, setIsAdding] = useState(false);

  const handleAdd = async () => {
    if (!newDate) {
      setError('يرجى اختيار التاريخ');
      return;
    }
    setIsAdding(true);
    setError(null);
    try {
      // availability_exceptions table does not exist — show informational message
      setError('ميزة إدارة الاستثناءات غير متاحة حالياً. يرجى تحديث ساعات العمل من إعدادات البروفايل.');
      setShowForm(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'فشل إضافة الاستثناء');
    } finally {
      setIsAdding(false);
    }
  };

  const getTypeLabel = (type: string) => EXCEPTION_TYPES.find(t => t.key === type)?.label || type;

  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleDateString('ar-DZ', {
        weekday: 'short',
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="space-y-3">
      {/* Info Banner */}
      <div className="flex items-center gap-2 p-3 rounded-xl" style={{ backgroundColor: themeConfig.colors.info + '10', border: `1px solid ${themeConfig.colors.info}25` }}>
        <Info size={16} style={{ color: themeConfig.colors.info }} />
        <p className="text-xs flex-1" style={{ color: themeConfig.colors.info }}>
          إدارة الاستثناءات متاحة عبر تحديث حقل workingHours في جدول الحلاقين
        </p>
      </div>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <CalendarOff size={16} style={{ color: themeConfig.colors.primary }} />
          <span className="text-xs font-bold" style={{ color: themeConfig.colors.text }}>أيام الإغلاق والعطل</span>
        </div>
        <button
          type="button"
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all"
          style={{
            backgroundColor: themeConfig.colors.primary + '15',
            color: themeConfig.colors.primary,
          }}
        >
          <Plus size={12} />
          إضافة
        </button>
      </div>

      {/* Add Form */}
      {showForm && (
        <div
          className="p-3 rounded-xl border space-y-3"
          style={{ backgroundColor: themeConfig.colors.surface, borderColor: themeConfig.colors.border }}
        >
          {/* Date */}
          <div>
            <label className="text-[10px] font-bold block mb-1" style={{ color: themeConfig.colors.textMuted }}>التاريخ</label>
            <input
              type="date"
              value={newDate}
              onChange={(e) => setNewDate(e.target.value)}
              min={new Date().toISOString().split('T')[0]}
              className="w-full px-3 py-2 rounded-lg text-xs border"
              style={{
                backgroundColor: themeConfig.colors.background,
                borderColor: themeConfig.colors.border,
                color: themeConfig.colors.text,
              }}
            />
          </div>

          {/* Type */}
          <div>
            <label className="text-[10px] font-bold block mb-1" style={{ color: themeConfig.colors.textMuted }}>النوع</label>
            <div className="flex gap-2">
              {EXCEPTION_TYPES.map(t => (
                <button
                  key={t.key}
                  type="button"
                  onClick={() => setNewType(t.key)}
                  className="flex-1 px-2 py-1.5 rounded-lg text-[10px] font-bold border transition-all"
                  style={{
                    backgroundColor: newType === t.key ? themeConfig.colors.primary + '15' : themeConfig.colors.background,
                    borderColor: newType === t.key ? themeConfig.colors.primary : themeConfig.colors.border,
                    color: newType === t.key ? themeConfig.colors.primary : themeConfig.colors.textMuted,
                  }}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* Reason */}
          <div>
            <label className="text-[10px] font-bold block mb-1" style={{ color: themeConfig.colors.textMuted }}>السبب (اختياري)</label>
            <input
              type="text"
              value={newReason}
              onChange={(e) => setNewReason(e.target.value)}
              placeholder="مثال: عيد الأضحى"
              className="w-full px-3 py-2 rounded-lg text-xs border"
              style={{
                backgroundColor: themeConfig.colors.background,
                borderColor: themeConfig.colors.border,
                color: themeConfig.colors.text,
              }}
            />
          </div>

          {/* Actions */}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="flex-1 h-9 rounded-lg text-[10px] font-bold border"
              style={{ borderColor: themeConfig.colors.border, color: themeConfig.colors.textMuted }}
            >
              إلغاء
            </button>
            <button
              type="button"
              onClick={handleAdd}
              disabled={isAdding || !newDate}
              className="flex-1 h-9 rounded-lg text-[10px] font-bold text-white disabled:opacity-50"
              style={{ backgroundColor: themeConfig.colors.primary }}
            >
              {isAdding ? 'جاري الإضافة...' : 'إضافة'}
            </button>
          </div>
        </div>
      )}

      {/* Exceptions List */}
      {exceptions.length === 0 && !showForm && (
        <p className="text-[10px] text-center py-4" style={{ color: themeConfig.colors.textMuted }}>
          لا توجد أيام إغلاق مسجلة
        </p>
      )}

      {exceptions
        .filter(e => new Date(e.date) >= new Date(new Date().toISOString().split('T')[0]))
        .map(exception => (
          <div
            key={exception.id}
            className="flex items-center justify-between p-3 rounded-xl border"
            style={{ backgroundColor: themeConfig.colors.surface, borderColor: themeConfig.colors.border }}
          >
            <div>
              <p className="text-xs font-bold" style={{ color: themeConfig.colors.text }}>
                {formatDate(exception.date)}
              </p>
              <p className="text-[10px]" style={{ color: themeConfig.colors.textMuted }}>
                {exception.reason || getTypeLabel(exception.type)}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span
                className="text-[9px] px-2 py-0.5 rounded-full font-bold"
                style={{
                  backgroundColor: themeConfig.colors.error + '15',
                  color: themeConfig.colors.error,
                }}
              >
                {getTypeLabel(exception.type)}
              </span>
            </div>
          </div>
        ))}

      {/* Messages */}
      {error && (
        <div className="flex items-center gap-2 p-2 rounded-lg" style={{ backgroundColor: themeConfig.colors.error + '10' }}>
          <AlertCircle size={14} style={{ color: themeConfig.colors.error }} />
          <span className="text-[10px]" style={{ color: themeConfig.colors.error }}>{error}</span>
        </div>
      )}
    </div>
  );
}
