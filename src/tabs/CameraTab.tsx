import { useState, useRef, useCallback, useEffect } from 'react';
import { useApp } from '@/contexts/useApp';
import { motion } from 'framer-motion';
import {
  Camera, QrCode, Scan, X, Flashlight, FlipHorizontal,
  Aperture, Share2, Download, Copy, Check, Image as ImageIcon
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import type { IScannerControls } from '@zxing/browser';

type CameraMode = 'scanner' | 'generator' | 'camera';

export default function CameraTab() {
  const { themeConfig, navigate, barbers, screenParams } = useApp();
  const initialMode = (screenParams?.cameraMode === 'camera' || screenParams?.cameraMode === 'gallery' || screenParams?.cameraMode === 'scanner' || screenParams?.cameraMode === 'generator')
    ? (screenParams.cameraMode as CameraMode | 'gallery')
    : 'scanner';
  const [mode, setMode] = useState<CameraMode | 'gallery'>(initialMode === 'gallery' ? 'gallery' : initialMode);
  const [galleryPreview, setGalleryPreview] = useState<string | null>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const [scannedResult, setScannedResult] = useState('');
  const [scannedBarberId, setScannedBarberId] = useState('');
  const [selectedBarberId, setSelectedBarberId] = useState(barbers[0]?.id || '');
  const [flashOn, setFlashOn] = useState(false);
  const [frontCamera, setFrontCamera] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const scannerControlsRef = useRef<IScannerControls | null>(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState('');

  const selectedBarber = barbers.find(b => b.id === selectedBarberId);
  const canonicalBarberUrl = selectedBarber
    ? `https://www.hallaqi.app/barber/${selectedBarber.id}`
    : '';

  useEffect(() => {
    if (!selectedBarberId && barbers[0]) setSelectedBarberId(barbers[0].id);
  }, [barbers, selectedBarberId]);

  const startCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: frontCamera ? 'user' : 'environment' }
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
  }, [frontCamera]);

  const stopCamera = useCallback(() => {
    scannerControlsRef.current?.stop();
    scannerControlsRef.current = null;
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    setCameraActive(false);
  }, []);

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
    stopCamera();
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
          scannerControlsRef.current?.stop();
        }
      );
      setCameraActive(true);
      setCameraError('');
    } catch {
      setCameraActive(false);
      setCameraError('تعذر تشغيل ماسح QR. تحقق من إذن الكاميرا.');
    }
  }, [frontCamera, parseBarberId, stopCamera]);

  useEffect(() => {
    if (mode === 'scanner') void startScanner();
    else if (mode === 'camera') void startCamera();
    else stopCamera();
    return () => stopCamera();
  }, [mode, startCamera, startScanner, stopCamera]);

  useEffect(() => {
    if (mode === 'gallery') {
      // Auto-open picker once when entering gallery from AI radial.
      const t = window.setTimeout(() => galleryInputRef.current?.click(), 200);
      return () => window.clearTimeout(t);
    }
  }, [mode]);

  useEffect(() => {
    const next = screenParams?.cameraMode;
    if (next === 'scanner' || next === 'generator' || next === 'camera' || next === 'gallery') {
      setMode(next);
    }
  }, [screenParams?.cameraMode]);

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

  return (
    <div className="h-screen flex flex-col" style={{ backgroundColor: '#000' }}>
      {/* Camera Viewfinder */}
      <div className="relative flex-1 bg-black overflow-hidden">
        {(mode === 'scanner' || mode === 'camera') && (
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="absolute inset-0 w-full h-full object-cover"
          />
        )}

        {/* Generator View */}
        {mode === 'generator' && selectedBarber && (
          <div className="absolute inset-0 flex flex-col items-center justify-center p-6"
            style={{ backgroundColor: themeConfig.colors.background }}
          >
            {/* Hallaqi Logo */}
            <div className="flex items-center gap-2 mb-6">
              <img src="/logo-symbol.png" alt="Hallaqi" className="w-8 h-8" />
              <span className="text-lg font-bold" style={{ color: themeConfig.colors.primary }}>HALLAQI</span>
            </div>

            {/* QR Code */}
            <div className="relative p-4 rounded-3xl bg-white shadow-xl">
              <QRCodeSVG
                id="hallaqi-profile-qr"
                value={qrData}
                size={220}
                bgColor="#FFFFFF"
                fgColor={themeConfig.colors.primary}
                level="H"
                imageSettings={{
                  src: '/logo-symbol.png',
                  height: 40,
                  width: 40,
                  excavate: true,
                }}
              />
              <div className="absolute inset-0 rounded-3xl border-2 pointer-events-none"
                style={{ borderColor: themeConfig.colors.primary + '20' }}
              />
            </div>

            <h3 className="text-lg font-bold mt-4" style={{ color: themeConfig.colors.text }}>
              {selectedBarber.name}
            </h3>
            <p className="text-xs mt-1" style={{ color: themeConfig.colors.textMuted }}>
              امسح QR Code لزيارة البروفايل
            </p>

            {/* Actions */}
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => copyToClipboard(canonicalBarberUrl)}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold"
                style={{ backgroundColor: themeConfig.colors.primary + '10', color: themeConfig.colors.primary }}
              >
                <Copy size={16} />
                نسخ
              </button>
              <button
                onClick={() => void shareQr()}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold"
                style={{ backgroundColor: themeConfig.colors.primary + '10', color: themeConfig.colors.primary }}
              >
                <Share2 size={16} />
                مشاركة
              </button>
              <button
                onClick={downloadQr}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold"
                style={{ backgroundColor: themeConfig.colors.primary + '10', color: themeConfig.colors.primary }}
              >
                <Download size={16} />
                حفظ
              </button>
            </div>
          </div>
        )}

        {/* Scan Frame Overlay */}
        {mode === 'scanner' && cameraActive && (
          <>
            <div className="absolute inset-0 bg-black/40" />
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="relative w-64 h-64">
                {/* Corner markers */}
                <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 rounded-tl-lg" style={{ borderColor: themeConfig.colors.accent }} />
                <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 rounded-tr-lg" style={{ borderColor: themeConfig.colors.accent }} />
                <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 rounded-bl-lg" style={{ borderColor: themeConfig.colors.accent }} />
                <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 rounded-br-lg" style={{ borderColor: themeConfig.colors.accent }} />
                {/* Scan line */}
                <div className="absolute left-0 right-0 h-0.5 animate-scan-line" style={{ backgroundColor: themeConfig.colors.accent, boxShadow: `0 0 10px ${themeConfig.colors.accent}` }} />
              </div>
            </div>
            <div className="absolute bottom-32 left-0 right-0 text-center">
              <p className="text-sm text-white/80 font-medium"> ضع QR Code داخل الإطار</p>
            </div>
          </>
        )}

        {/* Scan Result */}
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
              <button onClick={() => setScannedResult('')} className="flex-shrink-0">
                <X size={18} style={{ color: themeConfig.colors.textMuted }} />
              </button>
            </div>
          </div>
        )}

        {mode === 'gallery' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center p-6" style={{ backgroundColor: themeConfig.colors.background }}>
            <ImageIcon size={40} style={{ color: themeConfig.colors.primary }} />
            <p className="text-sm font-bold mt-3" style={{ color: themeConfig.colors.text }}>رفع من المعرض</p>
            <p className="text-xs mt-1 text-center" style={{ color: themeConfig.colors.textMuted }}>
              جزء من زر AI المركزي — للاستخدام مع أدوات المساعدة والتحليل لاحقًا
            </p>
            {galleryPreview && (
              <>
                <img src={galleryPreview} alt="معاينة" className="mt-4 max-h-56 rounded-2xl object-cover" />
                <button
                  type="button"
                  onClick={() => setGalleryPreview(null)}
                  className="mt-2 text-xs font-bold underline"
                  style={{ color: themeConfig.colors.error }}
                >
                  مسح المعاينة
                </button>
              </>
            )}
            <button
              type="button"
              onClick={() => galleryInputRef.current?.click()}
              className="mt-4 px-6 py-2.5 rounded-xl text-sm font-bold text-white"
              style={{ backgroundColor: themeConfig.colors.primary }}
            >
              اختيار صورة
            </button>
            <input
              ref={galleryInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={e => {
                const file = e.target.files?.[0];
                if (!file) return;
                const url = URL.createObjectURL(file);
                setGalleryPreview(url);
              }}
            />
            <p className="text-[10px] mt-3" style={{ color: themeConfig.colors.accent }}>تحليل الصورة بالـ AI · قريبًا</p>
          </div>
        )}

        {/* No Camera Fallback */}
        {!cameraActive && (mode === 'scanner' || mode === 'camera') && (
          <div className="absolute inset-0 flex flex-col items-center justify-center" style={{ backgroundColor: themeConfig.colors.background }}>
            <img src="/logo-icon.png" alt="Hallaqi" className="w-20 h-20 mb-4 rounded-2xl" />
            <p className="text-sm font-bold" style={{ color: themeConfig.colors.text }}>
              {mode === 'scanner' ? 'ماسح QR Code' : 'الكاميرا'}
            </p>
            <p className="text-xs mt-2" style={{ color: themeConfig.colors.textMuted }}>
              {cameraError || 'يلزم إذن الوصول للكاميرا'}
            </p>
            <button
              onClick={() => mode === 'scanner' ? void startScanner() : void startCamera()}
              className="mt-4 px-6 py-2.5 rounded-xl text-sm font-bold text-white"
              style={{ backgroundColor: themeConfig.colors.primary }}
            >
              تشغيل الكاميرا
            </button>
          </div>
        )}
      </div>

      {/* Bottom Controls */}
      <div className="flex-shrink-0 pb-8 pt-4 px-4" style={{ backgroundColor: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(20px)' }}>
        <p
          className="text-center text-[10px] mb-2"
          aria-live="polite"
          style={{ color: 'rgba(255,255,255,0.45)', height: 14 }}
        >
          {mode === 'scanner' ? 'مسح QR' : mode === 'camera' ? 'كاميرا' : mode === 'gallery' ? 'معرض' : 'إنشاء QR'}
        </p>
        {/* Mode Switcher */}
        <div className="flex items-center justify-center gap-2 mb-6">
          {[
            { key: 'scanner' as const, icon: Scan, label: 'مسح QR' },
            { key: 'camera' as const, icon: Camera, label: 'كاميرا' },
            { key: 'gallery' as const, icon: ImageIcon, label: 'معرض' },
            { key: 'generator' as const, icon: QrCode, label: 'إنشاء QR' },
          ].map(m => (
            <motion.button
              key={m.key}
              whileTap={{ scale: 0.92 }}
              onClick={() => setMode(m.key)}
              className="flex flex-col items-center gap-1 px-4 py-2 rounded-xl transition-all relative"
              style={{
                backgroundColor: mode === m.key ? 'rgba(255,255,255,0.15)' : 'transparent',
              }}
            >
              <m.icon size={20} style={{ color: mode === m.key ? '#F59E0B' : 'rgba(255,255,255,0.5)' }} />
              <span className="text-[10px] font-medium" style={{ color: mode === m.key ? '#F59E0B' : 'rgba(255,255,255,0.5)' }}>
                {m.label}
              </span>
            </motion.button>
          ))}
        </div>

        {/* Action Buttons */}
        {mode !== 'generator' && mode !== 'gallery' && <div className="flex items-center justify-center gap-8">
          <motion.button
            whileTap={{ scale: 0.85 }}
            onClick={() => void toggleFlash()}
            className="w-12 h-12 rounded-full flex items-center justify-center"
            style={{ backgroundColor: flashOn ? 'rgba(245,158,11,0.3)' : 'rgba(255,255,255,0.1)' }}
          >
            <Flashlight size={22} style={{ color: flashOn ? '#F59E0B' : '#fff' }} />
          </motion.button>

          {/* Shutter / Scan Button */}
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={mode === 'camera' ? capturePhoto : mode === 'scanner' ? () => void startScanner() : undefined}
            className="w-18 h-18 rounded-full flex items-center justify-center p-1"
            style={{
              border: mode === 'scanner' ? '3px solid #F59E0B' : '3px solid #fff',
            }}
          >
            <div className="w-14 h-14 rounded-full flex items-center justify-center"
              style={{ backgroundColor: mode === 'scanner' ? '#F59E0B' : '#fff' }}
            >
              {mode === 'scanner' ? (
                <Scan size={24} className="text-black" />
              ) : (
                <Aperture size={24} className="text-black" />
              )}
            </div>
          </motion.button>

          <motion.button
            whileTap={{ scale: 0.85 }}
            onClick={() => setFrontCamera(!frontCamera)}
            className="w-12 h-12 rounded-full flex items-center justify-center"
            style={{ backgroundColor: 'rgba(255,255,255,0.1)' }}
          >
            <FlipHorizontal size={22} className="text-white" />
          </motion.button>
        </div>}

        {/* Barber Selector for Generator Mode */}
        {mode === 'generator' && (
          <div className="mt-4 flex gap-2 overflow-x-auto scrollbar-hide px-2">
            {barbers.map(barber => (
              <motion.button
                key={barber.id}
                whileTap={{ scale: 0.95 }}
                onClick={() => setSelectedBarberId(barber.id)}
                className="flex items-center gap-2 px-3 py-2 rounded-xl border flex-shrink-0 transition-all"
                style={{
                  backgroundColor: selectedBarberId === barber.id ? themeConfig.colors.primary + '15' : themeConfig.colors.surface,
                  borderColor: selectedBarberId === barber.id ? themeConfig.colors.primary : themeConfig.colors.border,
                }}
              >
                <img src={barber.avatar} alt={barber.name} className="w-8 h-8 rounded-lg object-cover" />
                <span className="text-xs font-bold whitespace-nowrap" style={{ color: themeConfig.colors.text }}>{barber.name}</span>
              </motion.button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
