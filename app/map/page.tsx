'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { ArrowLeft, Loader2, TreePine, Wrench, AlertTriangle, X, MapPin, Plus, Layers, Map, Satellite } from 'lucide-react';
import { Tree } from '@/lib/types';

// Dynamically import TreeMap to avoid SSR issues with Leaflet
const TreeMap = dynamic(() => import('@/components/TreeMap'), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-[500px]">
      <Loader2 className="w-8 h-8 animate-spin text-green-600" />
    </div>
  )
});

interface Project {
  id: number;
  project_number: string;
  name: string;
}

export default function MapPage() {
  const [trees, setTrees] = useState<Tree[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('');
  const [filterProject, setFilterProject] = useState('');
  const [mapLayer, setMapLayer] = useState<'standard' | 'satellite'>('satellite');

  useEffect(() => {
    fetchTrees();
    fetchProjects();
  }, []);

  const fetchTrees = async () => {
    try {
      const response = await fetch('/api/trees');
      const data = await response.json();
      setTrees(data);
    } catch (error) {
      console.error('Error fetching trees:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchProjects = async () => {
    try {
      const response = await fetch('/api/projects');
      const data = await response.json();
      setProjects(data);
    } catch (error) {
      console.error('Error fetching projects:', error);
    }
  };

  const filteredTrees = trees.filter(tree => {
    const statusMatch = filterStatus ? tree.status === filterStatus : true;
    const projectMatch = filterProject ? tree.project_id?.toString() === filterProject : true;
    return statusMatch && projectMatch;
  });

  // Statystyki dla aktualnie wyfiltrowanych drzew (po projekcie)
  const treesForStats = filterProject 
    ? trees.filter(t => t.project_id?.toString() === filterProject)
    : trees;

  const stats = {
    total: treesForStats.length,
    posadzone: treesForStats.filter(t => t.status === 'posadzone').length,
    utrzymanie: treesForStats.filter(t => t.status === 'utrzymanie').length,
    wymiana: treesForStats.filter(t => t.status === 'wymiana').length,
    usuniete: treesForStats.filter(t => t.status === 'usuniete').length
  };

  const statItems = [
    { label: 'Wszystkie',  val: stats.total,      status: '',           from: '#1d4ed8', to: '#60a5fa', Icon: Layers },
    { label: 'Posadzone',  val: stats.posadzone,  status: 'posadzone',  from: '#16a34a', to: '#22c55e', Icon: TreePine },
    { label: 'Utrzymanie', val: stats.utrzymanie, status: 'utrzymanie', from: '#0e7490', to: '#06b6d4', Icon: Wrench },
    { label: 'Wymiana',    val: stats.wymiana,    status: 'wymiana',    from: '#a16207', to: '#eab308', Icon: AlertTriangle },
    { label: 'Usunięte',  val: stats.usuniete,   status: 'usuniete',   from: '#b91c1c', to: '#ef4444', Icon: X },
  ];

  return (
    <div className="min-h-screen py-8 pb-28 md:pb-8">
      <div className="container mx-auto px-4">

        <div className="mb-6">
          <Link href="/" className="inline-flex items-center gap-2 text-white/40 hover:text-white text-sm transition-colors">
            <ArrowLeft className="w-4 h-4" /> Powrót
          </Link>
        </div>

        {/* Decorative background orbs */}
        <div className="relative">
          <div className="absolute -top-20 -left-20 w-72 h-72 rounded-full opacity-10 blur-3xl pointer-events-none" style={{background:'radial-gradient(circle,#22c55e,transparent)'}} />
          <div className="absolute -top-10 right-0 w-56 h-56 rounded-full opacity-8 blur-3xl pointer-events-none" style={{background:'radial-gradient(circle,#06b6d4,transparent)'}} />
          <div className="absolute bottom-32 -right-16 w-64 h-64 rounded-full opacity-6 blur-3xl pointer-events-none" style={{background:'radial-gradient(circle,#a78bfa,transparent)'}} />

        <div className="glass rounded-3xl gradient-border-green overflow-hidden">

          {/* Header band */}
          <div className="px-6 pt-6 pb-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4" style={{borderBottom:'1px solid rgba(255,255,255,0.06)'}}>
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl flex items-center justify-center shadow-lg" style={{background:'linear-gradient(135deg,#0e7490,#06b6d4)',boxShadow:'0 4px 16px rgba(6,182,212,0.35)'}}>
                <MapPin className="w-5 h-5 text-white" strokeWidth={1.8} />
              </div>
              <div>
                <h1 className="text-xl font-black text-gradient-green leading-tight">Mapa Drzew</h1>
                <p className="text-[10px] text-white/30 font-medium">{filteredTrees.length} drzew na mapie</p>
              </div>
            </div>
            <select value={filterProject} onChange={(e) => setFilterProject(e.target.value)} className="input-modern sm:w-72">
              <option value="">Wszystkie projekty</option>
              {projects.map((p) => <option key={p.id} value={p.id}>{p.project_number} — {p.name}</option>)}
            </select>
          </div>

          {/* Stats filter row */}
          <div className="grid grid-cols-5 gap-0" style={{borderBottom:'1px solid rgba(255,255,255,0.06)'}}>
            {statItems.map(({ label, val, status, from, to, Icon }, idx) => {
              const active = filterStatus === status;
              return (
                <button key={status} onClick={() => setFilterStatus(active ? '' : status)}
                  className="group relative flex flex-col items-center py-4 px-2 transition-all"
                  style={active
                    ? {background:`linear-gradient(180deg,${from}20,${to}10)`,borderBottom:`2px solid ${to}`}
                    : {borderBottom:'2px solid transparent'}
                  }
                >
                  {active && <div className="absolute inset-0 pointer-events-none" style={{background:`radial-gradient(ellipse at 50% 100%,${from}18,transparent 70%)`}} />}
                  <Icon className="w-4 h-4 mb-1.5 transition-transform group-hover:scale-110" strokeWidth={1.8}
                    style={{color: active ? to : 'rgba(255,255,255,0.3)'}} />
                  <span className={`text-2xl font-black leading-none ${active ? 'text-white' : 'text-white/70'}`}>{val}</span>
                  <span className={`text-[8px] font-bold mt-1 uppercase tracking-wide ${active ? 'text-white/70' : 'text-white/20'}`}>{label}</span>
                  {idx < statItems.length - 1 && <div className="absolute right-0 top-4 bottom-4 w-px" style={{background:'rgba(255,255,255,0.05)'}} />}
                </button>
              );
            })}
          </div>

          {/* Map */}
          {loading ? (
            <div className="flex items-center justify-center" style={{height:'520px'}}>
              <div className="flex flex-col items-center gap-3">
                <Loader2 className="w-8 h-8 animate-spin" style={{color:'#22c55e'}} />
                <p className="text-xs text-white/30">Wczytywanie mapy...</p>
              </div>
            </div>
          ) : (
            <div style={{height:'520px'}}>
              <TreeMap
                trees={filteredTrees}
                externalLayer={mapLayer}
                onLayerToggle={() => setMapLayer(l => l === 'satellite' ? 'standard' : 'satellite')}
              />
            </div>
          )}

          {/* Bottom bar */}
          <div className="relative z-[500] px-4 py-2.5 flex items-center gap-3 flex-wrap" style={{borderTop:'1px solid rgba(255,255,255,0.08)',background:'rgba(4,6,15,0.92)',backdropFilter:'blur(16px)'}}>
            {statItems.slice(1).map(({ label, to, Icon }) => (
              <div key={label} className="flex items-center gap-1.5">
                <Icon className="w-3 h-3" style={{color:to}} strokeWidth={2} />
                <span className="text-[10px] text-white/35 font-medium">{label}</span>
              </div>
            ))}
            <button
              onClick={() => setMapLayer(l => l === 'satellite' ? 'standard' : 'satellite')}
              className="inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-2xl glass border border-white/15 text-white/70 hover:text-white transition-all hover:scale-105 flex-shrink-0"
            >
              {mapLayer === 'satellite' ? <Map className="w-3.5 h-3.5" strokeWidth={2} /> : <Satellite className="w-3.5 h-3.5" strokeWidth={2} />}
              {mapLayer === 'satellite' ? 'Mapa' : 'Satelita'}
            </button>
            <Link href="/add-tree"
              className="inline-flex items-center gap-1.5 text-xs font-bold text-white px-3 py-1.5 rounded-2xl transition-all hover:scale-105 flex-shrink-0"
              style={{background:'linear-gradient(135deg,#16a34a,#22c55e)',boxShadow:'0 2px 12px rgba(34,197,94,0.4)'}}
            >
              <Plus className="w-3.5 h-3.5" strokeWidth={2.5} /> Dodaj Drzewo
            </Link>
          </div>
        </div>
        </div>
      </div>
    </div>
  );
}
