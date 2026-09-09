'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowLeft, BarChart2, TreePine, User, Clock, Activity, Filter } from 'lucide-react';

interface UserStat {
  id: number;
  name: string;
  email: string;
  role: string;
  registered_at: string;
  trees_added: number;
  last_tree_at: string | null;
  actions_count: number;
  last_action_at: string | null;
  last_activity_at: string | null;
}

interface TreeRow {
  id: number;
  tree_number: string | null;
  plant_date: string;
  status: string;
  created_at: string;
  added_by: string;
  added_by_id: number;
  species_name: string | null;
  project_name: string | null;
  project_number: string | null;
}

function fmtDate(iso: string | null) {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleDateString('pl-PL', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function timeSince(iso: string | null) {
  if (!iso || iso.startsWith('1900')) return 'brak aktywności';
  const diff = Date.now() - new Date(iso).getTime();
  const days = Math.floor(diff / 86400000);
  if (days === 0) return 'dziś';
  if (days === 1) return 'wczoraj';
  if (days < 7) return `${days} dni temu`;
  if (days < 30) return `${Math.floor(days / 7)} tyg. temu`;
  if (days < 365) return `${Math.floor(days / 30)} mies. temu`;
  return `${Math.floor(days / 365)} lat temu`;
}

const ROLE_LABEL: Record<string, string> = {
  admin: 'Administrator',
  brygadzista: 'Brygadzista',
  pracownik: 'Pracownik',
};

const STATUS_COLOR: Record<string, string> = {
  posadzone: 'text-green-400 bg-green-500/15 border border-green-500/25',
  utrzymanie: 'text-yellow-400 bg-yellow-500/15 border border-yellow-500/25',
  wymiana: 'text-orange-400 bg-orange-500/15 border border-orange-500/25',
  usuniete: 'text-red-400 bg-red-500/15 border border-red-500/25',
};

export default function ReportsPage() {
  const [userStats, setUserStats] = useState<UserStat[]>([]);
  const [recentTrees, setRecentTrees] = useState<TreeRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState<number | null>(null);
  const [totalTreesCount, setTotalTreesCount] = useState(0);

  const fetchData = async (userId?: number) => {
    setLoading(true);
    try {
      const url = userId ? `/api/reports?user_id=${userId}` : '/api/reports';
      const res = await fetch(url);
      const data = await res.json();
      if (userId) {
        setRecentTrees(data.recentTrees);
      } else {
        setUserStats(data.userStats);
        setRecentTrees(data.recentTrees);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    fetch('/api/stats').then(r => r.json()).then(s => {
      if (s.trees !== undefined) setTotalTreesCount(s.trees);
    }).catch(() => {});
  }, []);

  const handleUserFilter = (userId: number | null) => {
    setSelectedUser(userId);
    if (userId) {
      fetchData(userId);
    } else {
      fetchData();
    }
  };

  const filteredTrees = selectedUser
    ? recentTrees.filter(t => t.added_by_id === selectedUser)
    : recentTrees;

  const totalTrees = totalTreesCount || userStats.reduce((s, u) => s + u.trees_added, 0);
  const activeUsers = userStats.filter(u => u.last_activity_at && !u.last_activity_at.startsWith('1900')).length;

  return (
    <div className="min-h-screen py-8 pb-28 md:pb-8">
      <div className="container mx-auto px-4 max-w-6xl">
        <Link href="/" className="inline-flex items-center gap-2 text-white/40 hover:text-white text-sm mb-6 transition-colors">
          <ArrowLeft className="w-4 h-4" /> Powrót
        </Link>

        <div className="glass rounded-3xl p-8 gradient-border-green">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
              <BarChart2 className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-2xl font-black text-gradient-green">Raporty Aktywności</h1>
          </div>

          {loading ? (
            <div className="flex justify-center py-16">
              <div className="w-10 h-10 border-4 border-green-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <>
              {/* Summary bar */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
                {[
                  { icon: TreePine, val: totalTrees,        label: 'Wszystkich drzew', from:'#16a34a', to:'#22c55e' },
                  { icon: User,     val: userStats.length,  label: 'Użytkowników',    from:'#0e7490', to:'#06b6d4' },
                  { icon: Activity, val: activeUsers,       label: 'Aktywnych osób',  from:'#6d28d9', to:'#a78bfa' },
                  { icon: Clock,    val: recentTrees.length,label: 'Ostatnich wpisów',from:'#c2410c', to:'#f97316' },
                ].map(({ icon: I, val, label, from, to }) => (
                  <div key={label} className="relative overflow-hidden rounded-2xl p-4 text-center" style={{background:`linear-gradient(135deg,${from},${to})`,boxShadow:`0 4px 16px ${from}44`}}>
                    <I className="w-4 h-4 text-white/70 mx-auto mb-1" />
                    <p className="text-2xl font-black text-white">{val}</p>
                    <p className="text-[10px] text-white/70 font-semibold">{label}</p>
                  </div>
                ))}
              </div>

              {/* Per-user cards */}
              <h2 className="text-sm font-black text-white/50 uppercase tracking-widest mb-4 flex items-center gap-2">
                <User className="w-4 h-4" /> Aktywność użytkowników
              </h2>
              <div className="grid md:grid-cols-2 gap-3 mb-8">
                {userStats.map(u => (
                  <div key={u.id}
                    onClick={() => handleUserFilter(selectedUser === u.id ? null : u.id)}
                    className={`cursor-pointer rounded-2xl p-5 transition-all hover:-translate-y-0.5 ${
                      selectedUser === u.id ? 'glass-green gradient-border-green' : 'glass'
                    }`}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <p className="font-bold text-white">{u.name}</p>
                        <p className="text-xs text-white/40">{u.email}</p>
                      </div>
                      <span className="text-[10px] font-black text-[#22c55e] px-2 py-0.5 rounded-xl" style={{background:'rgba(34,197,94,0.12)',border:'1px solid rgba(34,197,94,0.2)'}}>
                        {ROLE_LABEL[u.role] || u.role}
                      </span>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      <div className="text-center glass rounded-xl py-2">
                        <p className="text-lg font-black text-[#4ade80]">{u.trees_added}</p>
                        <p className="text-[10px] text-white/30">drzew</p>
                      </div>
                      <div className="text-center glass rounded-xl py-2">
                        <p className="text-lg font-black text-cyan-400">{u.actions_count}</p>
                        <p className="text-[10px] text-white/30">akcji</p>
                      </div>
                      <div className="text-center glass rounded-xl py-2">
                        <p className="text-xs font-bold text-violet-400 truncate px-1">{timeSince(u.last_activity_at)}</p>
                        <p className="text-[10px] text-white/30">aktywność</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {selectedUser && (
                <div className="flex items-center gap-2 mb-4 glass rounded-xl px-3 py-2">
                  <Filter className="w-3.5 h-3.5 text-[#22c55e]" />
                  <span className="text-xs text-white/60">Filtr: <strong className="text-white">{userStats.find(u => u.id === selectedUser)?.name}</strong></span>
                  <button onClick={() => handleUserFilter(null)} className="text-xs text-red-400 hover:text-red-300 ml-auto">Usuń</button>
                </div>
              )}

              <h2 className="text-sm font-black text-white/50 uppercase tracking-widest mb-4 flex items-center gap-2">
                <TreePine className="w-4 h-4" />
                {selectedUser ? 'Drzewa wybranej osoby' : 'Ostatnio dodane drzewa'}
                <span className="text-xs font-normal text-white/25">({filteredTrees.length})</span>
              </h2>
              <div className="overflow-x-auto rounded-2xl glass">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-white/8">
                      <th className="px-4 py-3 text-left text-[10px] font-black text-white/30 uppercase tracking-wider">Nr</th>
                      <th className="px-4 py-3 text-left text-[10px] font-black text-white/30 uppercase tracking-wider">Gatunek</th>
                      <th className="px-4 py-3 text-left text-[10px] font-black text-white/30 uppercase tracking-wider hidden md:table-cell">Projekt</th>
                      <th className="px-4 py-3 text-left text-[10px] font-black text-white/30 uppercase tracking-wider">Dodał/a</th>
                      <th className="px-4 py-3 text-left text-[10px] font-black text-white/30 uppercase tracking-wider">Status</th>
                      <th className="px-4 py-3 text-left text-[10px] font-black text-white/30 uppercase tracking-wider hidden md:table-cell">Data</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredTrees.length === 0 ? (
                      <tr><td colSpan={6} className="px-4 py-10 text-center text-white/25 text-sm">Brak drzew</td></tr>
                    ) : filteredTrees.map((t) => (
                      <tr key={t.id} className="border-t border-white/5 hover:bg-white/5 transition-colors">
                        <td className="px-4 py-3">
                          <Link href={`/trees/${t.id}`} className="font-bold text-[#4ade80] hover:text-white transition-colors">
                            {t.tree_number || `#${t.id}`}
                          </Link>
                        </td>
                        <td className="px-4 py-3 text-white/60 text-xs">{t.species_name || '—'}</td>
                        <td className="px-4 py-3 text-white/40 text-xs hidden md:table-cell">{t.project_number ? `${t.project_number}` : '—'}</td>
                        <td className="px-4 py-3">
                          <button onClick={() => handleUserFilter(t.added_by_id === selectedUser ? null : t.added_by_id)} className="text-cyan-400 hover:text-white text-xs font-medium transition-colors">{t.added_by}</button>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${STATUS_COLOR[t.status] || 'text-white/40'}`}>{t.status}</span>
                        </td>
                        <td className="px-4 py-3 text-white/30 text-xs whitespace-nowrap hidden md:table-cell">{fmtDate(t.created_at)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
