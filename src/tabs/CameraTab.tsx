import { useState, useRef, useCallback, useEffect } from 'react';
import { useApp } from '@/contexts/useApp';
import { useAuth } from '@/hooks/useAuth';
import { motion } from 'framer-motion';
import {
  Camera, QrCode, Scan, X, Flashlight, FlipHorizontal,
  Aperture, Share2, Download, Copy, Check
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import type { IScannerControls } from '@zxing/browser';

type CameraMode = 'scanner' | 'generator' | 'camera';

interface CameraTabProps {
  /** When false, camera/scanner streams are released immediately. */
  isActive?: boolean;
  /** Open directly in camera / scanner / generator (from AI hub tools). */
  initialMode?: CameraMode;
  /** Fit under a parent header without forcing a full-screen scroll. */
  compact?: boolean;
}

export default function CameraTab({ isActive = true, initialMode = 'scanner', compact = false }: CameraTabProps) {
  const { themeConfig, navigate, barbers } = useApp();
  const { appUser } = useAuth();
  const [mode, setMode] = useState<CameraMode>(initialMode);
  const [scannedResult, setScannedResult] = useState('');
  const [scannedBarberId, setScannedBarberId] = useState('');
  const ownBarber = barbers.find(b => b.id === appUser?.id);
  const [selectedBarberId, setSelectedBarberId] = useState(ownBarber?.id || '');
  const [flashOn, setFlashOn] = useState(false);
  const [frontCamera, setFrontCamera] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const scannerControlsRef = useRef<IScannerControls | null>(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState('');
  /** User must explicitly tap to start — never auto-start on mount. */
  const [userRequested, setUserRequested] = useState(false);

  const selectedBarber = ownBarber || barbers.find(b => b.id === selectedBarberId);
  const canonicalBarberUrl = selectedBarber
    ? `https://www.hallaqi.app/barber/${selectedBarber.id}`
    : '';

  useEffect(() => {
    setMode(initialMode);
  }, [initialMode]);

  useEffect(() => {
    if (ownBarber?.id) setSelectedBarberId(ownBarber.id);
  }, [ownBarber?.id]);

  const releaseCamera = useCallback(() => {
    scannerControlsRef.current?.stop();
    scannerControlsRef.current = null;

    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }

    const video = videoRef.current;
    if (video) {
      const attached = video.srcObject;
      if (attached instanceof MediaStream) {
        attached.getTracks().forEach(track => track.stop());
      }
      video.srcObject = null;
    }

    setCameraActive(false);
    setFlashOn(false);
  }, []);

  const startCamera = useCallback(async () => {
    releaseCamera();
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: frontCamera ? 'user' : 'environment' },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setCameraActive(true);
      setCameraError('');
    } catch {
      setCameraActive(false);
      setCameraError('تعذر الوصول إلى الكاميرا. تحقق من الإذن.');
    }
  }, [frontCamera, releaseCamera]);

  const parseBarberId = useCallback((text: string): string => {
    try {
      const parsed = JSON.parse(text) as { id?: unknown; url?: unknown };
      if (typeof parsed.id === 'string') return parsed.id;
      if (typeof parsed.url === 'string') text = parsed.url;
    } catch {
      // Plain URL QR codes are supported too.
    }
    try {
      const url = new URL(text);
      const match = url.pathname.match(/^\/barber\/([^/]+)$/);
      return match?.[1] ? decodeURIComponent(match[1]) : '';
    } catch {
      return '';
    }
  }, []);

  const startScanner = useCallback(async () => {
    if (!videoRef.current) return;
    releaseCamera();
    try {
      const { BrowserQRCodeReader } = await import('@zxing/browser');
      const reader = new BrowserQRCodeReader(undefined, { delayBetweenScanAttempts: 250 });
      scannerControlsRef.current = await reader.decodeFromConstraints(
        { video: { facingMode: frontCamera ? 'user' : { ideal: 'environment' } } },
        videoRef.current,
        result => {
          if (!result) return;
          const text = result.getText();
          const barberId = parseBarberId(text);
          setScannedResult(text);
          setScannedBarberId(barberId);
          // Keep stream running until user dismisses — stop scanner decode loop only
          scannerControlsRef.current?.stop();
          scannerControlsRef.current = null;
        },
      );
      // ZXing owns the stream on the video element — track it for cleanup
      if (videoRef.current.srcObject instanceof MediaStream) {
        streamRef.current = videoRef.current.srcObject;
      }
      setCameraActive(true);
      setCameraError('');
    } catch {
      setCameraActive(false);
      setCameraError('تعذر تشغيل ماسح QR. تحقق من إذن الكاميرا.');
    }
  }, [frontCamera, parseBarberId, releaseCamera]);

  // Start only when user requested AND page is active AND mode needs camera
  useEffect(() => {
    if (!isActive || !userRequested) {
      releaseCamera();
      return;
    }
    if (mode === 'scanner') void startScanner();
    else if (mode === 'camera') void startCamera();
    else releaseCamera();
    return () => releaseCamera();
  }, [isActive, userRequested, mode, startCamera, startScanner, releaseCamera]);

  // Pause when tab/app is backgrounded
  useEffect(() => {
    const onVisibility = () => {
      if (document.hidden) releaseCamera();
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, [releaseCamera]);

  // Always release on unmount
  useEffect(() => () => releaseCamera(), [releaseCamera]);

  const requestStart = () => {
    setUserRequested(true);
    setCameraError('');
  };

  const qrData = selectedBarber
    ? JSON.stringify({
        id: selectedBarber.id,
        name: selectedBarber.name,
        url: canonicalBarberUrl,
        timestamp: Date.now(),
      })
    : '';

  const copyToClipboard = (text: string) => {
    void navigator.clipboard.writeText(text);
  };

  const shareQr = async () => {
    if (!selectedBarber) return;
    const url = canonicalBarberUrl;
    if (navigator.share) await navigator.share({ title: selectedBarber.name, url });
    else await navigator.clipboard.writeText(url);
  };

  const downloadQr = () => {
    const svg = document.getElementById('hallaqi-profile-qr');
    if (!svg || !selectedBarber) return;
    const blob = new Blob([new XMLSerializer().serializeToString(svg)], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `hallaqi-${selectedBarber.id}.svg`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const capturePhoto = () => {
    const video = videoRef.current;
    if (!video || !video.videoWidth) return;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext('2d')?.drawImage(video, 0, 0);
    canvas.toBlob(blob => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `hallaqi-photo-${Date.now()}.jpg`;
      link.click();
      URL.revokeObjectURL(url);
    }, 'image/jpeg', 0.9);
  };

  const toggleFlash = async () => {
    const next = !flashOn;
    const activeStream = streamRef.current
      || (videoRef.current?.srcObject instanceof MediaStream ? videoRef.current.srcObject : null);
    const track = activeStream?.getVideoTracks()[0];
    if (track) {
      try {
        await track.applyConstraints({ advanced: [{ torch: next } as MediaTrackConstraintSet] });
      } catch {
        setCameraError('الفلاش غير مدعوم في هذا الجهاز.');
        return;
      }
    }
    setFlashOn(next);
  };

  const switchMode = (next: CameraMode) => {
    setMode(next);
    setScannedResult('');
    if (next === 'generator') {
      setUserRequested(false);
      releaseCamera();
    } else {
      // Require explicit start for camera/scanner modes
      setUserRequested(false);
      releaseCamera();
    }
  };

  const shellClass = compact
    ? 'h-full max-h-full flex flex-col overflow-hidden overscroll-none'
    : 'h-[100dvh] max-h-[100dvh] flex flex-col overflow-hidden overscroll-none';

  return (
    <div className={shellClass} style={{ backgroundColor: '#000' }}>
      <div className="relative flex-1 min-h-0 bg-black overflow-hidden">
        {(mode === 'scanner' || mode === 'camera') && (
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="absolute inset-0 w-full h-full object-cover"
          />
        )}

        {mode === 'generator' && selectedBarber && (
          <div className="absolute inset-0 flex flex-col items-center justify-center px-4 py-3"
            style={{ backgroundColor: themeConfig.colors.background }}
          >
            <div className="flex items-center gap-2 mb-3">
              <img src="/logo-symbol.svg" alt="Hallaqi" className="w-7 h-7" />
              <span className="text-base font-bold" style={{ color: themeConfig.colors.primary }}>HALLAQI</span>
            </div>

            <div className="relative p-3 rounded-2xl bg-white shadow-xl">
              <QRCodeSVG
                id="hallaqi-profile-qr"
                value={qrData}
                size={compact ? 168 : 200}
                bgColor="#FFFFFF"
                fgColor={themeConfig.colors.primary}
                level="H"
                imageSettings={{
                  src: '/logo-symbol.svg',
                  height: 32,
                  width: 32,
                  excavate: true,
                }}
              />
            </div>

            <h3 className="text-sm font-bold mt-3" style={{ color: themeConfig.colors.text }}>
              {selectedBarber.name}
            </h3>
            <p className="text-[11px] mt-0.5" style={{ color: themeConfig.colors.textMuted }}>
              QR بروفايلك فقط — امسحه لزيارة الصفحة
            </p>

            <div className="flex gap-2 mt-3">
              <button
                onClick={() => copyToClipboard(canonicalBarberUrl)}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold"
                style={{ backgroundColor: themeConfig.colors.primary + '10', color: themeConfig.colors.primary }}
              >
                <Copy size={14} />
                نسخ
              </button>
              <button
                onClick={() => void shareQr()}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold"
                style={{ backgroundColor: themeConfig.colors.primary + '10', color: themeConfig.colors.primary }}
              >
                <Share2 size={14} />
                مشاركة
              </button>
              <button
                onClick={downloadQr}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold"
                style={{ backgroundColor: themeConfig.colors.primary + '10', color: themeConfig.colors.primary }}
              >
                <Download size={14} />
                حفظ
              </button>
            </div>
          </div>
        )}

        {mode === 'generator' && !selectedBarber && (
          <div className="absolute inset-0 flex flex-col items-center justify-center p-6"
            style={{ backgroundColor: themeConfig.colors.background }}
          >
            <p className="text-sm font-bold" style={{ color: themeConfig.colors.text }}>إنشاء QR متاح لحساب الحلاق فقط</p>
            <p className="text-xs mt-2 text-center" style={{ color: themeConfig.colors.textMuted }}>سجّل كحلاق أو استخدم مسح QR / الكاميرا من الأزرار أدناه</p>
          </div>
        )}

        {mode === 'scanner' && cameraActive && (
          <>
            <div className="absolute inset-0 bg-black/40" />
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="relative w-64 h-64">
                <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 rounded-tl-lg" style={{ borderColor: themeConfig.colors.accent }} />
                <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 rounded-tr-lg" style={{ borderColor: themeConfig.colors.accent }} />
                <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 rounded-bl-lg" style={{ borderColor: themeConfig.colors.accent }} />
                <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 rounded-br-lg" style={{ borderColor: themeConfig.colors.accent }} />
                <div className="absolute left-0 right-0 h-0.5 animate-scan-line" style={{ backgroundColor: themeConfig.colors.accent, boxShadow: `0 0 10px ${themeConfig.colors.accent}` }} />
              </div>
            </div>
            <div className="absolute bottom-32 left-0 right-0 text-center">
              <p className="text-sm text-white/80 font-medium">ضع QR Code داخل الإطار</p>
            </div>
          </>
        )}

        {scannedResult && (
          <div className="absolute bottom-24 left-4 right-4 p-4 rounded-2xl bg-white/95 backdrop-blur shadow-xl">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ backgroundColor: themeConfig.colors.success + '15' }}>
                <Check size={24} style={{ color: themeConfig.colors.success }} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold" style={{ color: themeConfig.colors.text }}>تم المسح بنجاح!</p>
                <p className="text-xs truncate" style={{ color: themeConfig.colors.textMuted }}>{scannedResult}</p>
              </div>
              <button
                onClick={() => scannedBarberId && navigate('barber-detail', { barberId: scannedBarberId })}
                disabled={!scannedBarberId}
                className="px-4 py-2 rounded-xl text-xs font-bold text-white flex-shrink-0"
                style={{ backgroundColor: themeConfig.colors.primary }}
              >
                عرض
              </button>
              <button onClick={() => { setScannedResult(''); setUserRequested(true); void startScanner(); }} className="flex-shrink-0">
                <X size={18} style={{ color: themeConfig.colors.textMuted }} />
              </button>
            </div>
          </div>
        )}

        {!cameraActive && (mode === 'scanner' || mode === 'camera') && (
          <div className="absolute inset-0 flex flex-col items-center justify-center px-4" style={{ backgroundColor: themeConfig.colors.background }}>
            <img src="/logo-icon.svg" alt="Hallaqi" className="w-14 h-14 mb-2 rounded-2xl" />
            <p className="text-sm font-bold" style={{ color: themeConfig.colors.text }}>
              {mode === 'scanner' ? 'ماسح QR' : 'الكاميرا'}
            </p>
            <p className="text-[11px] mt-1 text-center max-w-xs" style={{ color: themeConfig.colors.textMuted }}>
              {cameraError || 'اضغط للتشغيل — تتوقف تلقائياً عند المغادرة'}
            </p>
            <button
              onClick={requestStart}
              className="mt-3 px-5 py-2 rounded-xl text-xs font-bold text-white"
              style={{ backgroundColor: themeConfig.colors.primary }}
            >
              تشغيل الكاميرا
            </button>
          </div>
        )}
      </div>

      <div className="flex-shrink-0 pb-3 pt-2 px-3" style={{ backgroundColor: 'rgba(0,0,0,0.92)', backdropFilter: 'blur(20px)' }}>
        <div className="flex items-center justify-center gap-1 mb-2">
          {[
            { key: 'scanner' as CameraMode, icon: Scan, label: 'مسح' },
            { key: 'camera' as CameraMode, icon: Camera, label: 'كاميرا' },
            { key: 'generator' as CameraMode, icon: QrCode, label: 'إنشاء' },
          ].map(m => (
            <motion.button
              key={m.key}
              whileTap={{ scale: 0.92 }}
              onClick={() => switchMode(m.key)}
              className="flex flex-col items-center gap-0.5 px-3 py-1 rounded-xl transition-all"
              style={{
                backgroundColor: mode === m.key ? 'rgba(255,255,255,0.15)' : 'transparent',
              }}
            >
              <m.icon size={16} style={{ color: mode === m.key ? '#F59E0B' : 'rgba(255,255,255,0.5)' }} />
              <span className="text-[9px] font-medium" style={{ color: mode === m.key ? '#F59E0B' : 'rgba(255,255,255,0.5)' }}>
                {m.label}
              </span>
            </motion.button>
          ))}
        </div>

        {mode !== 'generator' && (
          <div className="flex items-center justify-center gap-6">
            <motion.button
              whileTap={{ scale: 0.85 }}
              onClick={() => void toggleFlash()}
              className="w-10 h-10 rounded-full flex items-center justify-center"
              style={{ backgroundColor: flashOn ? 'rgba(245,158,11,0.3)' : 'rgba(255,255,255,0.1)' }}
            >
              <Flashlight size={18} style={{ color: flashOn ? '#F59E0B' : '#fff' }} />
            </motion.button>

            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={mode === 'camera'
                ? capturePhoto
                : () => { setUserRequested(true); void startScanner(); }}
              className="rounded-full flex items-center justify-center p-0.5"
              style={{
                border: mode === 'scanner' ? '2px solid #F59E0B' : '2px solid #fff',
              }}
            >
              <div className="w-11 h-11 rounded-full flex items-center justify-center"
                style={{ backgroundColor: mode === 'scanner' ? '#F59E0B' : '#fff' }}
              >
                {mode === 'scanner' ? (
                  <Scan size={20} className="text-black" />
                ) : (
                  <Aperture size={20} className="text-black" />
                )}
              </div>
            </motion.button>

            <motion.button
              whileTap={{ scale: 0.85 }}
              onClick={() => setFrontCamera(prev => !prev)}
              className="w-10 h-10 rounded-full flex items-center justify-center"
              style={{ backgroundColor: 'rgba(255,255,255,0.1)' }}
            >
              <FlipHorizontal size={18} className="text-white" />
            </motion.button>
          </div>
        )}
      </div>
    </div>
  );
}
