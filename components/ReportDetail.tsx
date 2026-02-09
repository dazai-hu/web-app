
import React, { useState } from 'react';
import { X, MapPin, Monitor, Wifi, ShieldAlert, Cpu, Download, Sparkles, Battery, Clock } from 'lucide-react';
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
    if (!process.env.API_KEY) return;
    setLoadingInsight(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const prompt = `Analyze this security diagnostic data. Style: Modern Security Analyst.
      Profile: ${report.device.os} on ${report.device.browser}. RAM: ${report.device.ram}GB.
      Location: ${report.location.city}, ${report.location.country}. Timezone: ${report.device.timezoneName} (Offset: ${report.device.timezoneOffset}m).
      Provide a concise 3-sentence summary of the likely environment.`;

      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt
      });
      setInsight(response.text || '');
    } catch (err) {
      setInsight("Telemetry analysis unavailable.");
    } finally {
      setLoadingInsight(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-ink/60 backdrop-blur-md animate-pop">
      <div className="bg-paper w-full max-w-5xl border-3 border-ink shadow-comic overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="px-8 py-6 border-b-3 border-ink flex items-center justify-between bg-pastel-yellow">
          <div>
            <h2 className="text-2xl font-black text-ink italic uppercase tracking-tighter">Intel Package: {report.id}</h2>
            <p className="text-xs font-bold text-ink/60 uppercase mt-1">{new Date(report.timestamp).toLocaleString()}</p>
          </div>
          <button onClick={onClose} className="p-2 border-3 border-ink bg-white hover:bg-pastel-pink transition-colors">
            <X size={24} className="text-ink" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-8 space-y-10">
          {/* Visuals Section */}
          <section>
            <h3 className="text-sm font-black text-ink uppercase tracking-widest mb-6 flex items-center gap-3">
              <ShieldAlert size={20} className="text-pastel-pink" /> Visual Assets Captured
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              {report.photos.map((photo, i) => (
                <div key={i} className="relative aspect-square border-3 border-ink bg-white shadow-comic-sm overflow-hidden group hover:-translate-y-1 transition-transform rotate-1 odd:-rotate-1">
                  <img src={photo} className="w-full h-full object-cover" alt={`Intel ${i}`} />
                  <div className="absolute inset-0 bg-ink/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <a href={photo} download={`intel_${i}.png`} className="bg-pastel-blue border-2 border-ink p-3 shadow-comic-sm text-ink font-bold">
                      <Download size={24} />
                    </a>
                  </div>
                </div>
              ))}
              {report.photos.length === 0 && (
                <div className="col-span-full py-16 text-center border-3 border-dashed border-ink/20 bg-white/50 text-ink/30 italic font-bold">
                  No visual confirmation received.
                </div>
              )}
            </div>
          </section>

          {/* Grid Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-white p-6 border-3 border-ink shadow-comic-sm -rotate-1 hover:rotate-0 transition-transform">
              <h4 className="flex items-center gap-3 font-black text-ink uppercase italic mb-6">
                <Monitor size={22} className="text-pastel-blue" /> Machine
              </h4>
              <ul className="space-y-4 font-bold text-sm">
                <li className="flex justify-between border-b-2 border-ink/5 pb-2"><span>OS</span> <span className="bg-pastel-blue px-2">{report.device.os}</span></li>
                <li className="flex justify-between border-b-2 border-ink/5 pb-2"><span>Memory</span> <span>{report.device.ram} GB</span></li>
                <li className="flex justify-between border-b-2 border-ink/5 pb-2"><span>Architecture</span> <span>{report.device.cores} Cores</span></li>
                <li className="flex flex-col border-b-2 border-ink/5 pb-2">
                  <span className="text-[10px] text-ink/40 uppercase tracking-tighter">Timezone</span>
                  <span className="flex items-center gap-2 mt-1">
                    <Clock size={14} className="text-pastel-blue" /> {report.device.timezoneName}
                  </span>
                </li>
                <li className="flex justify-between"><span>UTC Offset</span> <span>{report.device.timezoneOffset} min</span></li>
              </ul>
            </div>

            <div className="bg-white p-6 border-3 border-ink shadow-comic-sm rotate-1 hover:rotate-0 transition-transform">
              <h4 className="flex items-center gap-3 font-black text-ink uppercase italic mb-6">
                <MapPin size={22} className="text-pastel-pink" /> Coordinates
              </h4>
              <ul className="space-y-4 font-bold text-sm">
                <li className="flex justify-between border-b-2 border-ink/5 pb-2"><span>IP Address</span> <span className="text-brand font-black">{report.location.ip}</span></li>
                <li className="flex justify-between border-b-2 border-ink/5 pb-2"><span>Location</span> <span>{report.location.city}, {report.location.country}</span></li>
                <li className="flex justify-between border-b-2 border-ink/5 pb-2"><span>Provider</span> <span className="truncate max-w-[120px]">{report.location.isp}</span></li>
                <li className="flex justify-between"><span>Precision</span> <span>~{Math.round(report.location.accuracy)}m</span></li>
              </ul>
            </div>

            <div className="bg-white p-6 border-3 border-ink shadow-comic-sm -rotate-2 hover:rotate-0 transition-transform">
              <h4 className="flex items-center gap-3 font-black text-ink uppercase italic mb-6">
                <Wifi size={22} className="text-pastel-green" /> Network
              </h4>
              <ul className="space-y-4 font-bold text-sm">
                <li className="flex justify-between border-b-2 border-ink/5 pb-2"><span>Class</span> <span className="uppercase">{report.network.effectiveType || 'N/A'}</span></li>
                <li className="flex justify-between border-b-2 border-ink/5 pb-2"><span>Bandwidth</span> <span>{report.network.downlink || 'N/A'} Mbps</span></li>
                <li className="flex justify-between border-b-2 border-ink/5 pb-2"><span>Battery</span> <span className={report.battery.level < 0.2 ? 'bg-pastel-pink' : ''}>{Math.round(report.battery.level * 100)}%</span></li>
                <li className="flex justify-between"><span>Charging</span> <span>{report.battery.charging ? 'Active' : 'Standby'}</span></li>
              </ul>
            </div>
          </div>

          {/* AI Section */}
          <section className="bg-pastel-purple/20 p-8 border-3 border-ink shadow-comic relative overflow-hidden">
            <div className="absolute top-0 right-0 p-2 opacity-10">
              <Sparkles size={64} />
            </div>
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-black text-ink uppercase italic flex items-center gap-3 text-xl">
                <Sparkles size={24} className="text-brand" /> Intelligence Analysis
              </h3>
              {!insight && !loadingInsight && (
                <button
                  onClick={generateInsight}
                  className="bg-white border-3 border-ink px-6 py-2 font-black uppercase text-sm shadow-comic-sm hover:translate-y-1 transition-all"
                >
                  Run Deep Scan
                </button>
              )}
            </div>
            {loadingInsight ? (
              <div className="flex items-center gap-4 text-brand font-black uppercase italic">
                <div className="w-6 h-6 border-4 border-ink border-t-transparent rounded-full animate-spin"></div>
                Decrypting patterns...
              </div>
            ) : insight ? (
              <p className="text-lg font-bold text-ink leading-relaxed italic border-l-4 border-ink pl-6">
                "{insight}"
              </p>
            ) : (
              <p className="text-sm text-ink/40 font-bold uppercase italic">Activate analysis for expert diagnostic interpretation.</p>
            )}
          </section>
        </div>
      </div>
    </div>
  );
};

export default ReportDetail;
