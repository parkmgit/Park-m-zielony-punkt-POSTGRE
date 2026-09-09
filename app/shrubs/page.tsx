'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowLeft, Search, Shrub, FileText, Download, Plus, Trash2, ChevronDown, ChevronUp, Calendar } from 'lucide-react';

interface ShrubRecord {
  id: number;
  site_id: number;
  species_id: number;
  quantity: number;
  plant_date: string;
  worker_id: number | null;
  status: string;
  notes: string | null;
  species_name: string;
  site_name: string;
  site_code: string;
  project_id: number;
  project_name: string;
  project_number: string;
  worker_name: string | null;
}

interface Project {
  id: number;
  project_number: string;
  name: string;
}

const STATUS_LABELS: Record<string, string> = {
  posadzone: 'Posadzone',
  utrzymanie: 'Utrzymanie',
  wymiana: 'Wymiana',
  usuniete: 'Usunięte',
};

const STATUS_COLORS: Record<string, string> = {
  posadzone: 'bg-green-500/20 text-green-300 border border-green-500/30',
  utrzymanie: 'bg-blue-500/20 text-blue-300 border border-blue-500/30',
  wymiana: 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/30',
  usuniete: 'bg-red-500/20 text-red-300 border border-red-500/30',
};

export default function ShrubsPage() {
  const [shrubs, setShrubs] = useState<ShrubRecord[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterProject, setFilterProject] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterDateFrom, setFilterDateFrom] = useState('');
  const [filterDateTo, setFilterDateTo] = useState('');
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [actions, setActions] = useState<Record<number, any[]>>({});
  const [actionForm, setActionForm] = useState<Record<number, any>>({});
  const [users, setUsers] = useState<any[]>([]);

  useEffect(() => {
    fetchAll();
  }, []);

  const fetchAll = async () => {
    try {
      const [shrubsRes, projectsRes, lookupsRes] = await Promise.all([
        fetch('/api/shrubs'),
        fetch('/api/projects'),
        fetch('/api/lookups'),
      ]);
      setShrubs(await shrubsRes.json());
      setProjects(await projectsRes.json());
      const lk = await lookupsRes.json();
      setUsers(lk.users || []);
    } finally {
      setLoading(false);
    }
  };

  const loadActions = async (id: number) => {
    if (actions[id]) return;
    const res = await fetch(`/api/shrubs/${id}/actions`);
    const data = await res.json();
    setActions(prev => ({ ...prev, [id]: data }));
  };

  const toggleExpand = (id: number) => {
    if (expandedId === id) { setExpandedId(null); return; }
    setExpandedId(id);
    loadActions(id);
    setActionForm(prev => ({ ...prev, [id]: prev[id] || { action_type: '', quantity_affected: '', performed_at: new Date().toISOString().split('T')[0], performer_id: '', notes: '' } }));
  };

  const addAction = async (shrubId: number) => {
    const form = actionForm[shrubId];
    if (!form?.action_type) { alert('Wybierz typ akcji'); return; }
    const res = await fetch(`/api/shrubs/${shrubId}/actions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action_type: form.action_type,
        quantity_affected: form.quantity_affected ? Number(form.quantity_affected) : null,
        performed_at: form.performed_at,
        performer_id: form.performer_id ? Number(form.performer_id) : null,
        notes: form.notes || null,
      }),
    });
    if (res.ok) {
      setActions(prev => ({ ...prev, [shrubId]: undefined as any }));
      loadActions(shrubId);
      setActionForm(prev => ({ ...prev, [shrubId]: { action_type: '', quantity_affected: '', performed_at: new Date().toISOString().split('T')[0], performer_id: '', notes: '' } }));
    }
  };

  const deleteShrub = async (id: number) => {
    if (!confirm('Usunąć to nasadzenie?')) return;
    await fetch(`/api/shrubs?id=${id}`, { method: 'DELETE' });
    setShrubs(prev => prev.filter(s => s.id !== id));
  };

  const filtered = shrubs.filter(s => {
    const matchSearch = !searchTerm || s.species_name?.toLowerCase().includes(searchTerm.toLowerCase()) || s.site_code?.toLowerCase().includes(searchTerm.toLowerCase()) || s.site_name?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchProject = !filterProject || s.project_id?.toString() === filterProject;
    const matchStatus = !filterStatus || s.status === filterStatus;
    const matchDateFrom = !filterDateFrom || new Date(s.plant_date) >= new Date(filterDateFrom);
    const matchDateTo = !filterDateTo || new Date(s.plant_date) <= new Date(filterDateTo);
    return matchSearch && matchProject && matchStatus && matchDateFrom && matchDateTo;
  });

  const totalQuantity = filtered.reduce((sum, s) => sum + s.quantity, 0);

  const printPDF = () => {
    const projectName = filterProject ? projects.find(p => p.id.toString() === filterProject)?.name || 'Projekt' : 'Wszystkie projekty';
    const periodStr = filterDateFrom || filterDateTo ? ` | ${filterDateFrom || '—'} → ${filterDateTo || '—'}` : '';
    const rows = filtered.map((s, i) => {
      const sc = STATUS_COLORS[s.status] ? '' : '';
      const bg = i % 2 === 0 ? '#fff' : '#f9fafb';
      return `<tr style="background:${bg}">
        <td style="padding:6px 10px;border-bottom:1px solid #e5e7eb">${s.species_name || '—'}</td>
        <td style="padding:6px 10px;border-bottom:1px solid #e5e7eb;text-align:center;font-weight:700;font-size:15px;color:#22c55e">${s.quantity}</td>
        <td style="padding:6px 10px;border-bottom:1px solid #e5e7eb">${s.site_code}<br/><span style="color:#6b7280;font-size:10px">${s.site_name}</span></td>
        <td style="padding:6px 10px;border-bottom:1px solid #e5e7eb;white-space:nowrap">${new Date(s.plant_date).toLocaleDateString('pl-PL')}</td>
        <td style="padding:6px 10px;border-bottom:1px solid #e5e7eb"><span style="padding:2px 8px;border-radius:20px;font-size:10px;font-weight:700;background:#d1fae5;color:#065f46">${s.status}</span></td>
        <td style="padding:6px 10px;border-bottom:1px solid #e5e7eb;color:#6b7280;font-size:11px">${s.worker_name || '—'}</td>
        <td style="padding:6px 10px;border-bottom:1px solid #e5e7eb;font-size:11px;color:#6b7280">${s.notes || '—'}</td>
      </tr>`;
    }).join('');

    let container = document.getElementById('print-container');
    if (!container) { container = document.createElement('div'); container.id = 'print-container'; document.body.appendChild(container); }
    container.innerHTML = `
      <style>@page{margin:15mm 12mm}*{box-sizing:border-box}</style>
      <div style="display:flex;align-items:center;justify-content:space-between;padding-bottom:14px;border-bottom:3px solid #22c55e;margin-bottom:20px">
        <div><div style="font-size:22px;font-weight:900;color:#22c55e">🌿 Zielony Punkt</div><div style="font-size:11px;color:#6b7280">Ewidencja Krzewów — Park M</div></div>
        <div style="text-align:right"><div style="font-size:14px;font-weight:700">Raport Krzewów</div><div style="font-size:11px;color:#6b7280">${new Date().toLocaleDateString('pl-PL',{day:'2-digit',month:'long',year:'numeric'})}</div></div>
      </div>
      <div style="display:flex;gap:12px;margin-bottom:20px">
        <div style="flex:1;background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:10px 14px"><div style="font-size:11px;color:#16a34a;font-weight:600;text-transform:uppercase">Projekt</div><div style="font-size:13px;font-weight:700">${projectName}${periodStr}</div></div>
        <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:10px 18px;text-align:center"><div style="font-size:11px;color:#16a34a;font-weight:600;text-transform:uppercase">Grup nasadzeń</div><div style="font-size:24px;font-weight:900;color:#22c55e">${filtered.length}</div></div>
        <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:10px 18px;text-align:center"><div style="font-size:11px;color:#16a34a;font-weight:600;text-transform:uppercase">Łącznie sztuk</div><div style="font-size:24px;font-weight:900;color:#22c55e">${totalQuantity}</div></div>
      </div>
      <table style="width:100%;border-collapse:collapse;font-size:12px">
        <thead><tr style="background:#f0fdf4"><th style="padding:8px 10px;text-align:left;border-bottom:2px solid #22c55e">Gatunek</th><th style="padding:8px 10px;text-align:center;border-bottom:2px solid #22c55e">Szt.</th><th style="padding:8px 10px;text-align:left;border-bottom:2px solid #22c55e">Miejsce</th><th style="padding:8px 10px;text-align:left;border-bottom:2px solid #22c55e">Data</th><th style="padding:8px 10px;text-align:left;border-bottom:2px solid #22c55e">Status</th><th style="padding:8px 10px;text-align:left;border-bottom:2px solid #22c55e">Wykonawca</th><th style="padding:8px 10px;text-align:left;border-bottom:2px solid #22c55e">Notatki</th></tr></thead>
        <tbody>${rows}</tbody>
        <tfoot><tr style="background:#f0fdf4"><td colspan="1" style="padding:8px 10px;font-weight:700">RAZEM</td><td style="padding:8px 10px;text-align:center;font-weight:900;color:#22c55e;font-size:15px">${totalQuantity}</td><td colspan="5"></td></tr></tfoot>
      </table>`;
    setTimeout(() => { window.print(); setTimeout(() => { if (container) container.innerHTML = ''; }, 1000); }, 300);
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600" /></div>;

  return (
    <div className="min-h-screen py-8 pb-28 md:pb-8">
      <div className="container mx-auto px-4">
        <Link href="/" className="inline-flex items-center gap-2 text-white/40 hover:text-white text-sm mb-6 transition-colors">
          <ArrowLeft className="w-4 h-4" /> Powrót
        </Link>

        <div className="glass rounded-3xl p-6 md:p-8 gradient-border-green">
          {/* Header */}
          <div className="flex flex-wrap justify-between items-center gap-4 mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-lime-500 to-green-600 flex items-center justify-center">
                <Shrub className="w-5 h-5 text-white" />
              </div>
              <h1 className="text-2xl font-black text-gradient-green">Krzewy i Nasadzenia zbiorcze</h1>
            </div>
            <div className="flex gap-3">
              <button onClick={printPDF} className="glass rounded-2xl text-red-400 border border-red-500/20 px-4 py-2 hover:bg-red-500/10 flex items-center gap-2 text-sm font-medium transition-all">
                <FileText className="w-4 h-4" /> Eksportuj PDF
              </button>
              <Link href="/add-shrub" className="font-bold text-sm text-white px-4 py-2 rounded-2xl hover:scale-105 transition-all flex items-center gap-2" style={{ background: 'linear-gradient(135deg,#16a34a,#22c55e)', boxShadow: '0 4px 12px rgba(34,197,94,0.3)' }}>
                <Plus className="w-4 h-4" /> Dodaj Nasadzenie
              </Link>
            </div>
          </div>

          {/* Filters row 1 */}
          <div className="grid md:grid-cols-3 gap-4 mb-3">
            <select value={filterProject} onChange={e => setFilterProject(e.target.value)} className="input-modern">
              <option value="">📁 Wszystkie projekty</option>
              {projects.map(p => <option key={p.id} value={p.id}>{p.project_number} - {p.name}</option>)}
            </select>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30 w-4 h-4" />
              <input type="text" placeholder="Szukaj po gatunku, miejscu..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="input-modern pl-10" />
            </div>
            <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="input-modern">
              <option value="">Wszystkie statusy</option>
              {Object.entries(STATUS_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </div>

          {/* Filters row 2 — date range */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div>
              <label className="block text-[10px] font-black text-white/30 uppercase tracking-widest mb-1.5 flex items-center gap-1"><Calendar className="w-3 h-3" /> Data od</label>
              <input type="date" value={filterDateFrom} onChange={e => setFilterDateFrom(e.target.value)} className="input-modern" />
            </div>
            <div>
              <label className="block text-[10px] font-black text-white/30 uppercase tracking-widest mb-1.5 flex items-center gap-1"><Calendar className="w-3 h-3" /> Data do</label>
              <input type="date" value={filterDateTo} onChange={e => setFilterDateTo(e.target.value)} className="input-modern" />
            </div>
          </div>

          {/* Stats */}
          <div className="glass rounded-2xl p-4 mb-6 flex flex-wrap gap-6">
            <div className="text-center"><p className="text-2xl font-black text-green-400">{filtered.length}</p><p className="text-[10px] text-white/30 font-semibold uppercase">Grup</p></div>
            <div className="text-center"><p className="text-2xl font-black text-emerald-300">{totalQuantity}</p><p className="text-[10px] text-white/30 font-semibold uppercase">Łącznie sztuk</p></div>
            <div className="text-center"><p className="text-2xl font-black text-cyan-400">{filtered.filter(s => s.status === 'posadzone').reduce((a, s) => a + s.quantity, 0)}</p><p className="text-[10px] text-white/30 font-semibold uppercase">Posadzone</p></div>
            <div className="text-center"><p className="text-2xl font-black text-yellow-400">{filtered.filter(s => s.status === 'utrzymanie').reduce((a, s) => a + s.quantity, 0)}</p><p className="text-[10px] text-white/30 font-semibold uppercase">Utrzymanie</p></div>
          </div>

          {/* List */}
          {filtered.length === 0 ? (
            <div className="text-center py-16 text-white/30">
              <Shrub className="w-12 h-12 mx-auto mb-4 opacity-30" />
              <p className="font-semibold">Brak nasadzeń</p>
              <Link href="/add-shrub" className="mt-4 inline-block text-green-400 hover:underline text-sm">+ Dodaj pierwsze nasadzenie</Link>
            </div>
          ) : (
            <div className="space-y-2">
              {filtered.map(s => (
                <div key={s.id} className="glass rounded-2xl overflow-hidden">
                  {/* Row */}
                  <div className="flex items-center gap-4 px-4 py-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-lime-600/30 to-green-600/30 flex items-center justify-center flex-shrink-0">
                      <span className="text-green-400 font-black text-sm">{s.quantity}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-white text-sm">{s.species_name}</span>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${STATUS_COLORS[s.status] || 'bg-white/10 text-white/50'}`}>{STATUS_LABELS[s.status] || s.status}</span>
                      </div>
                      <div className="text-xs text-white/40 mt-0.5">
                        {s.site_code} — {s.site_name} &nbsp;·&nbsp; {new Date(s.plant_date).toLocaleDateString('pl-PL')}
                        {s.worker_name && <> &nbsp;·&nbsp; {s.worker_name}</>}
                      </div>
                      {s.notes && <div className="text-xs text-white/25 mt-0.5 italic truncate">{s.notes}</div>}
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <button onClick={() => toggleExpand(s.id)} className="w-8 h-8 flex items-center justify-center rounded-xl text-white/40 hover:text-white hover:bg-white/8 transition-all">
                        {expandedId === s.id ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </button>
                      <button onClick={() => deleteShrub(s.id)} className="w-8 h-8 flex items-center justify-center rounded-xl text-white/30 hover:text-red-400 hover:bg-red-500/10 transition-all">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Expanded — actions */}
                  {expandedId === s.id && (
                    <div className="border-t border-white/5 px-4 py-4 space-y-4">
                      {/* Existing actions */}
                      <div>
                        <p className="text-[10px] font-black text-white/30 uppercase tracking-widest mb-2">Historia akcji</p>
                        {!actions[s.id] ? (
                          <p className="text-xs text-white/30">Ładowanie...</p>
                        ) : actions[s.id].length === 0 ? (
                          <p className="text-xs text-white/30">Brak akcji</p>
                        ) : (
                          <div className="space-y-1.5">
                            {actions[s.id].map((a: any) => (
                              <div key={a.id} className="flex items-start gap-3 text-xs">
                                <div className="w-1.5 h-1.5 rounded-full bg-green-500 mt-1.5 flex-shrink-0" />
                                <div>
                                  <span className="font-semibold text-white">{a.action_type}</span>
                                  {a.quantity_affected && <span className="text-green-400 ml-2">({a.quantity_affected} szt.)</span>}
                                  <span className="text-white/40 ml-2">{new Date(a.performed_at).toLocaleDateString('pl-PL')}</span>
                                  {a.performer_name && <span className="text-white/40 ml-2">· {a.performer_name}</span>}
                                  {a.notes && <div className="text-white/30 italic">{a.notes}</div>}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Add action form */}
                      <div>
                        <p className="text-[10px] font-black text-white/30 uppercase tracking-widest mb-2">Dodaj akcję</p>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                          <select
                            value={actionForm[s.id]?.action_type || ''}
                            onChange={e => setActionForm(prev => ({ ...prev, [s.id]: { ...prev[s.id], action_type: e.target.value } }))}
                            className="input-modern text-xs py-2"
                          >
                            <option value="">— typ akcji —</option>
                            <option value="posadzenie">Posadzenie</option>
                            <option value="podlewanie">Podlewanie</option>
                            <option value="przycinanie">Przycinanie</option>
                            <option value="wymiana">Wymiana</option>
                            <option value="inspekcja">Inspekcja</option>
                            <option value="usunięcie">Usunięcie</option>
                          </select>
                          <input
                            type="number"
                            placeholder="Ilość szt. (opt.)"
                            min="1"
                            value={actionForm[s.id]?.quantity_affected || ''}
                            onChange={e => setActionForm(prev => ({ ...prev, [s.id]: { ...prev[s.id], quantity_affected: e.target.value } }))}
                            className="input-modern text-xs py-2"
                          />
                          <input
                            type="date"
                            value={actionForm[s.id]?.performed_at || new Date().toISOString().split('T')[0]}
                            onChange={e => setActionForm(prev => ({ ...prev, [s.id]: { ...prev[s.id], performed_at: e.target.value } }))}
                            className="input-modern text-xs py-2"
                          />
                          <select
                            value={actionForm[s.id]?.performer_id || ''}
                            onChange={e => setActionForm(prev => ({ ...prev, [s.id]: { ...prev[s.id], performer_id: e.target.value } }))}
                            className="input-modern text-xs py-2"
                          >
                            <option value="">— wykonawca —</option>
                            {users.map((u: any) => <option key={u.id} value={u.id}>{u.name}</option>)}
                          </select>
                          <input
                            type="text"
                            placeholder="Notatka (opt.)"
                            value={actionForm[s.id]?.notes || ''}
                            onChange={e => setActionForm(prev => ({ ...prev, [s.id]: { ...prev[s.id], notes: e.target.value } }))}
                            className="input-modern text-xs py-2"
                          />
                          <button
                            onClick={() => addAction(s.id)}
                            className="px-4 py-2 rounded-xl text-xs font-bold text-white transition-all hover:scale-105"
                            style={{ background: 'linear-gradient(135deg,#16a34a,#22c55e)' }}
                          >
                            + Zapisz
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          <div className="mt-5 pt-5 border-t border-white/8">
            <p className="text-xs text-white/30">Wyświetlono: <span className="font-bold text-white/60">{filtered.length}</span> grup · łącznie <span className="font-bold text-green-400">{totalQuantity}</span> sztuk</p>
          </div>
        </div>
      </div>
    </div>
  );
}
