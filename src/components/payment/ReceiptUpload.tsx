/**
 * ReceiptUpload Component
 * 
 * Allows customers to upload payment receipts (image or PDF) for CCP/BaridiMob payments.
 * Includes file validation, progress indicator, and transaction reference input.
 */
import { useState, useRef } from 'react';
import { Upload, FileImage, FileText, X, CheckCircle, AlertTriangle, Loader2 } from 'lucide-react';
import { useApp } from '@/contexts/useApp';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { receiptUploadSchema } from '@/lib/validation';
import type { ReceiptUploadFormData } from '@/lib/validation';

interface ReceiptUploadProps {
  onUpload: (file: File, transactionReference?: string) => Promise<boolean>;
  isUploading: boolean;
  uploadProgress: number;
  error?: string | null;
  paymentMethod: 'ccp' | 'baridi-mob';
}

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'application/pdf'];

export function ReceiptUpload({ onUpload, isUploading, uploadProgress, error, paymentMethod }: ReceiptUploadProps) {
  const { themeConfig } = useApp();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const {
    register,
    getValues,
    trigger,
    formState: { errors: formErrors },
  } = useForm<ReceiptUploadFormData>({
    resolver: zodResolver(receiptUploadSchema),
    defaultValues: {
      transactionRef: '',
    },
  });

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileError(null);

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      setFileError('حجم الملف كبير جداً. الحد الأقصى 5 ميغابايت');
      return;
    }

    // Validate file type
    if (!ALLOWED_TYPES.includes(file.type)) {
      setFileError('نوع الملف غير مدعوم. يرجى رفع صورة (JPEG, PNG, WebP) أو PDF');
      return;
    }

    void (async () => {
      let prepared = file;
      if (file.type.startsWith('image/')) {
        const { compressImageFile, UPLOAD_LIMITS } = await import('@/lib/imageUpload');
        prepared = await compressImageFile(file, { maxBytes: UPLOAD_LIMITS.receiptMaxBytes });
      }
      setSelectedFile(prepared);

      if (prepared.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (ev) => setPreview(ev.target?.result as string);
        reader.readAsDataURL(prepared);
      } else {
        setPreview(null);
      }
    })();
  };

  const handleSubmit = async () => {
    if (!selectedFile) return;
    const valid = await trigger('transactionRef');
    if (!valid) return;
    const transactionRef = getValues('transactionRef')?.trim() || undefined;
    const success = await onUpload(selectedFile, transactionRef);
    if (success) {
      setSubmitted(true);
    }
  };

  const handleRemoveFile = () => {
    setSelectedFile(null);
    setPreview(null);
    setFileError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  if (submitted) {
    return (
      <div className="flex flex-col items-center gap-3 p-6 rounded-2xl border" style={{ backgroundColor: themeConfig.colors.surface, borderColor: themeConfig.colors.success + '40' }}>
        <CheckCircle size={48} style={{ color: themeConfig.colors.success }} />
        <p className="text-sm font-bold text-center" style={{ color: themeConfig.colors.success }}>تم إرسال إيصال الدفع بنجاح</p>
        <p className="text-xs text-center" style={{ color: themeConfig.colors.textMuted }}>سيتم مراجعة الإيصال والموافقة عليه قريباً</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 p-4 rounded-2xl border" style={{ backgroundColor: themeConfig.colors.surface, borderColor: themeConfig.colors.border }}>
      {/* Header */}
      <div className="flex items-center gap-2">
        <Upload size={18} style={{ color: themeConfig.colors.primary }} />
        <p className="text-sm font-bold" style={{ color: themeConfig.colors.text }}>
          رفع إيصال الدفع {paymentMethod === 'ccp' ? '(CCP)' : '(بريدي موب)'}
        </p>
      </div>

      {/* Instructions */}
      <div className="p-3 rounded-xl" style={{ backgroundColor: themeConfig.colors.primary + '08' }}>
        <p className="text-xs leading-relaxed" style={{ color: themeConfig.colors.textMuted }}>
          {paymentMethod === 'ccp'
            ? 'قم بتحويل المبلغ عبر CCP ثم ارفع صورة الإيصال أو وصل التحويل'
            : 'قم بالدفع عبر تطبيق بريدي موب ثم ارفع لقطة شاشة التأكيد'}
        </p>
      </div>

      {/* File Upload Area */}
      {!selectedFile ? (
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="flex flex-col items-center gap-3 p-6 rounded-xl border-2 border-dashed transition-all active:scale-[0.98]"
          style={{ borderColor: themeConfig.colors.border }}
        >
          <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ backgroundColor: themeConfig.colors.primary + '15' }}>
            <Upload size={24} style={{ color: themeConfig.colors.primary }} />
          </div>
          <div className="text-center">
            <p className="text-xs font-bold" style={{ color: themeConfig.colors.text }}>اضغط لرفع الإيصال</p>
            <p className="text-[10px] mt-1" style={{ color: themeConfig.colors.textMuted }}>صورة (JPEG, PNG) أو PDF — الحد الأقصى 5MB</p>
          </div>
        </button>
      ) : (
        <div className="relative p-3 rounded-xl border" style={{ borderColor: themeConfig.colors.border }}>
          <button
            type="button"
            onClick={handleRemoveFile}
            className="absolute top-2 left-2 w-6 h-6 rounded-full flex items-center justify-center"
            style={{ backgroundColor: themeConfig.colors.error + '20' }}
          >
            <X size={14} style={{ color: themeConfig.colors.error }} />
          </button>
          <div className="flex items-center gap-3">
            {preview ? (
              <img src={preview} alt="Receipt preview" className="w-16 h-16 rounded-lg object-cover" />
            ) : (
              <div className="w-16 h-16 rounded-lg flex items-center justify-center" style={{ backgroundColor: themeConfig.colors.primary + '10' }}>
                {selectedFile.type === 'application/pdf' ? (
                  <FileText size={24} style={{ color: themeConfig.colors.primary }} />
                ) : (
                  <FileImage size={24} style={{ color: themeConfig.colors.primary }} />
                )}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold truncate" style={{ color: themeConfig.colors.text }}>{selectedFile.name}</p>
              <p className="text-[10px]" style={{ color: themeConfig.colors.textMuted }}>
                {(selectedFile.size / 1024).toFixed(0)} KB
              </p>
            </div>
          </div>
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/heic,application/pdf"
        onChange={handleFileSelect}
        className="hidden"
      />

      {/* Transaction Reference (optional) */}
      <div>
        <p className="text-xs font-bold mb-1.5" style={{ color: themeConfig.colors.text }}>رقم العملية (اختياري)</p>
        <input
          type="text"
          {...register('transactionRef')}
          placeholder="مثال: 123456789"
          className="w-full p-3 rounded-xl border text-xs"
          style={{
            backgroundColor: themeConfig.colors.background,
            borderColor: formErrors.transactionRef ? themeConfig.colors.error : themeConfig.colors.border,
            color: themeConfig.colors.text,
          }}
          dir="ltr"
        />
        {formErrors.transactionRef && (
          <p className="text-[10px] mt-1" style={{ color: themeConfig.colors.error }}>{formErrors.transactionRef.message}</p>
        )}
      </div>

      {/* Progress Indicator */}
      {isUploading && (
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <Loader2 size={14} className="animate-spin" style={{ color: themeConfig.colors.primary }} />
            <p className="text-xs" style={{ color: themeConfig.colors.textMuted }}>جاري رفع الإيصال...</p>
          </div>
          <div className="w-full h-2 rounded-full overflow-hidden" style={{ backgroundColor: themeConfig.colors.border }}>
            <div
              className="h-full rounded-full transition-all duration-300"
              style={{ width: `${uploadProgress}%`, backgroundColor: themeConfig.colors.primary }}
            />
          </div>
        </div>
      )}

      {/* Error Messages */}
      {(fileError || error) && (
        <div className="flex items-center gap-2 p-3 rounded-xl" style={{ backgroundColor: themeConfig.colors.error + '10' }}>
          <AlertTriangle size={14} style={{ color: themeConfig.colors.error }} />
          <p className="text-xs" style={{ color: themeConfig.colors.error }}>{fileError || error}</p>
        </div>
      )}

      {/* Submit Button */}
      <button
        type="button"
        onClick={handleSubmit}
        disabled={!selectedFile || isUploading}
        className="w-full h-11 rounded-xl text-sm font-bold text-white flex items-center justify-center gap-2 transition-all disabled:opacity-50"
        style={{ backgroundColor: themeConfig.colors.primary }}
      >
        {isUploading ? (
          <>
            <Loader2 size={16} className="animate-spin" />
            جاري الإرسال...
          </>
        ) : (
          <>
            <Upload size={16} />
            إرسال الإيصال
          </>
        )}
      </button>
    </div>
  );
}
