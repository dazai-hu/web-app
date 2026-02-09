
import React, { useState } from 'react';
import { X, MapPin, Monitor, Wifi, ShieldAlert, Cpu, Download, Sparkles, Battery, Clock, Globe, Camera, Loader2, Info } from 'lucide-react';
import { CaptureReport } from '../types';
import { GoogleGenAI } from "@google/genai";

interface Props {
  report: CaptureReport;
  onClose: () => void;
}

const ReportDetail: React.FC<Props> = ({ report, onClose }) => {
  const [insight, setInsight] = useState<string>('');
  const [loadingInsight, setLoadingInsight] = useState(false);

  const generateInsight = async () => {
    // API key check
    if (!process.env.API_KEY) return;
    setLoadingInsight(true);
    try {
      // Create GoogleGenAI instance with the API key
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const prompt = `Analyze this security diagnostic data. Style: Modern Security Analyst.
      Profile: ${report.device.os} on ${report.device.browser}. RAM: ${report.device.ram}GB.
      Location: ${report.location.city}, ${report.location.country}. Timezone: ${report.device.timezoneName}.
      Provide a concise 3-sentence summary of the likely environment and behavioral pattern.`;

      // Use the Gemini model for content generation
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt
      });
      // Extract the generated text output from response.text property
      setInsight(response.text || '');
    } catch (err) {
      setInsight("Telemetry analysis unavailable. Verification key missing.");
    } finally {
      setLoadingInsight(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-6 bg-ink/70 backdrop-blur-md animate-pop">
      <div className="bg-paper w-full max-w-5xl border-3 border-ink shadow-comic overflow-hidden flex flex-col max-h-[95vh]">
        {/* Header */}
        <div className="px-6 py-4 md:px-8 md:py-6 border-b-3 border-ink flex items-center justify-between bg-brand-accent">
          <div className="text-white">
            <h2 className="text-xl md:text-2xl font-black italic uppercase tracking-tighter flex items-center gap-3">
              <ShieldAlert size={24} /> Intel Package: {report.id}
            </h2>
            <p className="text-[10px] font-bold opacity-70 uppercase mt-1 tracking-widest">
              Acquisition Time: {new Date(report.timestamp).toLocaleString()}
            </p>
          </div>
          <button onClick={onClose} className="p-2 border-3 border-ink bg-white hover:bg-red-500 hover:text-white transition-colors">
            <X size={24} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-10 custom-scrollbar">
          {/* Visual Evidence */}
          <section>
            <h3 className="text-xs font-black text-ink uppercase tracking-widest mb-6 flex items-center gap-3">
              <Camera size={20} className="text-brand-accent" /> Visual Confirmation
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {report.photos.map((photo, i) => (
                <div key={i} className="group relative aspect-square border-3 border-ink bg-white shadow-comic-sm overflow-hidden rotate-1 even:-rotate-1 hover:rotate-0 transition-transform cursor-zoom-in">
                  <img src={photo} className="w-full h-full object-cover" alt={`Capture ${i}`} />
                  <a 
                    href={photo} 
                    download={`intel_${i}.jpg`}
                    className="absolute inset-0 bg-ink/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <Download className="text-white" />
                  </a>
                </div>
              ))}
              {report.photos.length === 0 && (
                <div className="col-span-full py-16 text-center border-3 border-dashed border-ink/20 bg-white/30 text-ink/30 italic font-black text-sm uppercase">
                  No visual assets retrieved.
                </div>
              )}
            </div>
          </section>

          {/* Core Telemetry Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white p-6 border-3 border-ink shadow-comic-sm">
              <h4 className="flex items-center gap-3 font-black text-ink uppercase italic mb-6">
                <Monitor size={20} className="text-pastel-blue" /> Machine Specs
              </h4>
              <div className="space-y-4 font-bold text-xs uppercase tracking-tighter">
                <div className="flex justify-between border-b-2 border-paper pb-1"><span>System</span> <span>{report.device.os}</span></div>
                <div className="flex justify-between border-b-2 border-paper pb-1"><span>Architecture</span> <span>{report.device.cores} Cores</span></div>
                <div className="flex justify-between border-b-2 border-paper pb-1"><span>Memory</span> <span>{report.device.ram} GB</span></div>
                <div className="flex justify-between border-b-2 border-paper pb-1"><span>Language</span> <span>{report.device.language}</span></div>
                <div className="flex flex-col gap-1 mt-2">
                  <span className="text-[9px] text-ink/30">Zone Reference</span>
                  <div className="flex items-center gap-2 bg-paper p-2 border border-ink/5">
                    <Clock size={12} /> <span className="truncate">{report.device.timezoneName}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white p-6 border-3 border-ink shadow-comic-sm">
              <h4 className="flex items-center gap-3 font-black text-ink uppercase italic mb-6">
                <MapPin size={20} className="text-pastel-pink" /> Geolocation
              </h4>
              <div className="space-y-4 font-bold text-xs uppercase tracking-tighter">
                <div className="flex justify-between border-b-2 border-paper pb-1"><span>IP Address</span> <span className="text-brand-accent">{report.location.ip}</span></div>
                <div className="flex justify-between border-b-2 border-paper pb-1"><span>Region</span> <span>{report.location.city}, {report.location.country}</span></div>
                <div className="flex justify-between border-b-2 border-paper pb-1"><span>ISP</span> <span className="truncate max-w-[100px]">{report.location.isp}</span></div>
                <div className="flex justify-between border-b-2 border-paper pb-1"><span>Lock Accuracy</span> <span>~{Math.round(report.location.accuracy)}m</span></div>
                <div className="flex flex-col gap-1 mt-2">
                  <span className="text-[9px] text-ink/30">GPS Vector</span>
                  <div className="flex items-center gap-2 bg-paper p-2 border border-ink/5">
                    <Globe size={12} /> <span>{report.location.lat.toFixed(4)}, {report.location.lon.toFixed(4)}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white p-6 border-3 border-ink shadow-comic-sm">
              <h4 className="flex items-center gap-3 font-black text-ink uppercase italic mb-6">
                <Wifi size={20} className="text-pastel-green" /> Network Stat
              </h4>
              <div className="space-y-4 font-bold text-xs uppercase tracking-tighter">
                <div className="flex justify-between border-b-2 border-paper pb-1"><span>Protocol</span> <span>{report.network.effectiveType || 'IPV4'}</span></div>
                <div className="flex justify-between border-b-2 border-paper pb-1"><span>Bitrate</span> <span>{report.network.downlink || 'N/A'} MBPS</span></div>
                <div className="flex justify-between border-b-2 border-paper pb-1"><span>Latancy (RTT)</span> <span>{report.network.rtt || 'N/A'} MS</span></div>
                <div className="flex justify-between border-b-2 border-paper pb-1"><span>Battery Status</span> <span>{Math.round(report.battery.level * 100)}%</span></div>
                <div className="flex justify-between"><span>Power Path</span> <span>{report.battery.charging ? 'Plugged' : 'DC Supply'}</span></div>
              </div>
            </div>
          </div>

          {/* User Agent Section */}
          <section className="bg-white p-6 border-3 border-ink shadow-comic-sm">
            <h4 className="flex items-center gap-3 font-black text-ink uppercase italic mb-4">
              <Info size={20} className="text-brand-accent" /> Raw Browser Signature
            </h4>
            <div className="bg-paper p-4 border-2 border-ink/10 rounded-sm font-mono text-[10px] text-ink/70 break-all leading-relaxed">
              {report.device.userAgent}
            </div>
          </section>

          {/* Analysis Module */}
          <section className="bg-ink p-8 border-3 border-ink shadow-comic relative group overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-5 text-brand-accent group-hover:scale-110 transition-transform">
              <Sparkles size={80} />
            </div>
            <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
              <h3 className="font-black text-brand-accent uppercase italic flex items-center gap-3 text-xl">
                <Sparkles size={24} /> Neural Analysis Engine
              </h3>
              {!insight && !loadingInsight && (
                <button
                  onClick={generateInsight}
                  className="bg-brand-accent border-2 border-ink text-white px-6 py-2 font-black uppercase text-xs shadow-comic-sm hover:translate-y-1 transition-all"
                >
                  Initiate Scan
                </button>
              )}
            </div>
            {loadingInsight ? (
              <div className="flex items-center gap-4 text-brand-accent font-black uppercase italic text-sm animate-pulse">
                <Loader2 className="animate-spin" /> Correlating behavioral telemetry...
              </div>
            ) : insight ? (
              <p className="text-base md:text-lg font-bold text-white leading-relaxed italic border-l-4 border-brand-accent pl-6">
                "{insight}"
              </p>
            ) : (
              <div className="text-[10px] text-brand-accent/40 font-black uppercase tracking-widest text-center border border-brand-accent/10 py-4 italic">
                Awaiting Command: Run scan for environment synthesis.
              </div>
            )}
          </section>
        </div>
      </div>
      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #1E293B; border-radius: 10px; }
      `}</style>
    </div>
  );
};

export default ReportDetail;
