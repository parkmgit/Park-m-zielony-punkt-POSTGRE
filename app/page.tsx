'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { TreePine, List, MapPin, FolderPlus, Leaf, Plus, BarChart2, ArrowRight, ChevronRight, Shrub } from 'lucide-react';

const ROLE_LABEL: Record<string, string> = {
  admin: 'Administrator',
  brygadzista: 'Brygadzista',
  pracownik: 'Pracownik',
};

export default function Home() {
  const [initialized, setInitialized] = useState(false);
  const [stats, setStats] = useState<{ trees: number; projects: number; species: number } | null>(null);
  const [currentUser, setCurrentUser] = useState<{ name: string; role: string } | null>(null);

  useEffect(() => {
    fetch('/api/init')
      .then(() => {
        setInitialized(true);
        return Promise.all([
          fetch('/api/stats').then(r => r.ok ? r.json() : null),
          fetch('/api/auth/me').then(r => r.ok ? r.json() : null),
        ]);
      })
      .then(([statsData, userData]) => {
        if (statsData) setStats(statsData);
        if (userData) setCurrentUser(userData);
      })
      .catch(console.error);
  }, []);

  if (!initialized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 bg-dot-grid">
        <div className="text-center animate-fade-in-up">
          <div className="relative inline-block mb-4">
            <div className="absolute inset-0 bg-[#22c55e]/20 blur-2xl rounded-full scale-150 animate-pulse" />
            <TreePine className="relative w-16 h-16 text-[#22c55e] animate-float drop-shadow-[0_0_12px_#22c55e]" strokeWidth={1.3} />
          </div>
          <p className="text-slate-400">Ładowanie systemu...</p>
        </div>
      </div>
    );
  }

  const firstName = currentUser?.name.split(' ')[0] ?? '';

  return (
    <div className="min-h-screen mesh-bg pb-24 md:pb-0">
      <div className="container mx-auto px-4 py-6 max-w-6xl">

        {/* ── HERO ROW ── */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5 mb-6 animate-fade-in-up">
          <div className="flex items-center gap-4">
            <div className="relative flex-shrink-0">
              <div className="absolute inset-0 bg-[#22c55e]/30 blur-2xl rounded-full animate-pulse" />
              <div className="relative w-12 h-12 rounded-2xl bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center shadow-lg shadow-green-500/40">
                <TreePine className="w-7 h-7 text-[#22c55e] animate-float" strokeWidth={1.3} />
              </div>
            </div>
            <div>
              <p className="text-[10px] font-bold text-green-400/80 uppercase tracking-[0.2em] mb-0.5">Panel główny</p>
              <h1 className="text-xl sm:text-2xl font-black text-white leading-tight">
                {currentUser
                  ? <><span className="text-white/50 font-normal text-base">Witaj, </span><span className="text-gradient-green">{firstName}</span> 👋</>
                  : <span className="text-gradient-green">Zielony Punkt</span>}
              </h1>
              <p className="text-white/35 text-xs mt-0.5 font-medium">
                {currentUser
                  ? `${ROLE_LABEL[currentUser.role] ?? currentUser.role} · System Ewidencji Drzew`
                  : 'System Ewidencji Drzew · Grupa Park M'}
              </p>
            </div>
          </div>

          {stats && (
            <div className="flex gap-2 flex-shrink-0">
              {[
                { label: 'Drzew',     value: stats.trees,    from: '#16a34a', to: '#22c55e' },
                { label: 'Projektów', value: stats.projects, from: '#0e7490', to: '#06b6d4' },
                { label: 'Gatunków', value: stats.species,   from: '#6d28d9', to: '#a78bfa' },
              ].map(({ label, value, from, to }) => (
                <div key={label} className="relative overflow-hidden rounded-3xl text-center px-4 py-3 min-w-[68px]" style={{background:`linear-gradient(135deg,${from},${to})`,boxShadow:`0 4px 16px ${from}55`}}>
                  <p className="text-xl font-black text-white">{value}</p>
                  <p className="text-[10px] text-white/70 font-semibold mt-0.5">{label}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── FEATURED: Dodaj Drzewo ── */}
        <Link href="/add-tree" className="group block mb-4 animate-fade-in-up" style={{animationDelay:'0.07s'}}>
          <div className="relative overflow-hidden rounded-[2.5rem] glass-green gradient-border-green p-7 sm:p-10 transition-all duration-300 group-hover:scale-[1.005]">
            {/* Decorative orbs */}
            <div className="absolute -right-12 -top-12 w-48 h-48 rounded-full bg-green-400/10 blur-3xl" />
            <div className="absolute right-1/4 -bottom-8 w-32 h-32 rounded-full bg-emerald-300/10 blur-2xl" />
            {/* Ghost tree */}
            <TreePine className="absolute right-8 top-1/2 -translate-y-1/2 w-24 h-24 sm:w-32 sm:h-32 text-[#22c55e]/10 group-hover:text-[#22c55e]/20 transition-colors duration-500" strokeWidth={1} />

            <div className="relative z-10 flex items-center justify-between gap-4">
              <div>
                <span className="inline-flex items-center gap-1.5 text-[10px] font-black text-[#22c55e] uppercase tracking-[0.15em] mb-3 glass px-3 py-1 rounded-full">
                  <Plus className="w-3 h-3" strokeWidth={2.5} /> Szybka akcja
                </span>
                <h2 className="text-xl sm:text-2xl font-black text-white mb-1.5 leading-tight">
                  Dodaj <span className="text-gradient-green">Nowe Drzewo</span>
                </h2>
                <p className="text-white/40 text-sm max-w-xs">GPS · Zdjęcie · Historia działań · Powiadomienia</p>
              </div>
              <div className="hidden sm:flex items-center justify-center w-11 h-11 rounded-2xl glass border border-[#22c55e]/30 group-hover:border-[#22c55e]/60 group-hover:scale-110 transition-all flex-shrink-0">
                <ArrowRight className="w-5 h-5 text-[#22c55e]" strokeWidth={2.5} />
              </div>
            </div>
          </div>
        </Link>

        {/* ── MAIN TILES ── */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-3">
          {[
            {
              href: '/trees', icon: List,
              label: 'Lista Drzew',
              desc: 'Przeglądaj, filtruj i zarządzaj wszystkimi zarejestrowanymi drzewami',
              iconBg: 'from-emerald-500 to-green-600',
              badge: stats ? `${stats.trees}` : null,
              badgeSuffix: 'drzew',
              glowColor: 'rgba(34,197,94,0.12)',
            },
            {
              href: '/shrubs', icon: Shrub,
              label: 'Krzewy',
              desc: 'Nasadzenia zbiorcze krzewów — ilość sztuk, akcje grupowe, raporty',
              iconBg: 'from-lime-500 to-green-500',
              badge: null,
              badgeSuffix: null,
              glowColor: 'rgba(132,204,22,0.12)',
            },
            {
              href: '/map', icon: MapPin,
              label: 'Mapa Interaktywna',
              desc: 'Rozmieszczenie wszystkich drzew z filtrami projektów i statusu',
              iconBg: 'from-cyan-500 to-teal-600',
              badge: 'GPS',
              badgeSuffix: null,
              glowColor: 'rgba(6,182,212,0.12)',
            },
          ].map(({ href, icon: Icon, label, desc, iconBg, badge, badgeSuffix, glowColor }, i) => (
            <Link key={href} href={href} className={`group animate-tile-in tile-${i + 1}`}>
              <div className="h-full glass rounded-[2rem] p-7 flex flex-col" style={{['--hover-glow' as string]: glowColor}}>
                <div className="flex items-start justify-between mb-4">
                  <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${iconBg} flex items-center justify-center shadow-lg group-hover:scale-110 group-hover:rotate-2 transition-all duration-300`}>
                    <Icon className="w-7 h-7 text-white" strokeWidth={1.4} />
                  </div>
                  {badge && (
                    <span className="glass text-[11px] font-bold px-2.5 py-1 rounded-xl text-white/70">
                      {badge}{badgeSuffix ? ` ${badgeSuffix}` : ''}
                    </span>
                  )}
                </div>
                <h2 className="text-base font-bold text-white mb-2 group-hover:text-[#4ade80] transition-colors">{label}</h2>
                <p className="text-xs text-white/35 leading-relaxed flex-1">{desc}</p>
                <div className="mt-5 flex items-center gap-1 text-xs font-semibold text-white/20 group-hover:text-green-400 transition-colors">
                  Otwórz <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            </Link>
          ))}
        </div>

        {/* ── SECONDARY TILES ── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { href: '/projects',    icon: FolderPlus, label: 'Projekty',    color: 'from-blue-500 to-indigo-600',   hoverBorder: 'group-hover:shadow-[0_0_0_1px_rgba(99,102,241,0.4)]' },
            { href: '/species',     icon: Leaf,        label: 'Gatunki',     color: 'from-lime-400 to-green-500',    hoverBorder: 'group-hover:shadow-[0_0_0_1px_rgba(163,230,53,0.4)]' },
            { href: '/add-project', icon: FolderPlus,  label: 'Nowy Projekt',color: 'from-cyan-500 to-teal-600',    hoverBorder: 'group-hover:shadow-[0_0_0_1px_rgba(6,182,212,0.4)]' },
            { href: '/reports',     icon: BarChart2,   label: 'Raporty',     color: 'from-violet-500 to-purple-600', hoverBorder: 'group-hover:shadow-[0_0_0_1px_rgba(139,92,246,0.4)]' },
          ].map(({ href, icon: Icon, label, color, hoverBorder }, i) => (
            <Link key={href} href={href} className={`group animate-tile-in tile-${i + 3}`}>
              <div className={`glass rounded-[2rem] flex flex-col items-center text-center p-6 transition-all duration-200 hover:-translate-y-1 ${hoverBorder}`}>
                <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${color} flex items-center justify-center mb-3.5 shadow-md group-hover:scale-110 group-hover:rotate-3 transition-all duration-300`}>
                  <Icon className="w-6 h-6 text-white" strokeWidth={1.4} />
                </div>
                <h2 className="text-xs font-bold text-white/70 group-hover:text-white transition-colors">{label}</h2>
              </div>
            </Link>
          ))}
        </div>

        <div className="mt-6 flex flex-wrap justify-center gap-x-4 gap-y-1 text-[10px] text-white/15">
          {['GPS', 'Cloudinary', 'Historia', 'Powiadomienia', 'Mapa OSM', 'Raporty'].map(f => (
            <span key={f} className="flex items-center gap-1">
              <span className="text-green-600">✓</span>{f}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
