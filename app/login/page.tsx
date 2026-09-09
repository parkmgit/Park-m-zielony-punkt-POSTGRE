'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { TreePine, LogIn, Eye, EyeOff, MapPin, Camera, Shield, Smartphone } from 'lucide-react';

export default function LoginPage() {
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  useEffect(() => {
    // Initialize database
    fetch('/api/init').catch(console.error);
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.email || !formData.password) {
      setError('Email i hasło są wymagane');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Błąd logowania');
        setLoading(false);
        return;
      }

      // Redirect to home page
      router.push('/');
      router.refresh();
    } catch (err) {
      setError('Błąd połączenia z serwerem');
      setLoading(false);
    }
  };

  const features = [
    { icon: MapPin, text: 'Lokalizacja GPS z precyzją do 1m' },
    { icon: Camera, text: 'Zdjęcia i dokumentacja każdego drzewa' },
    { icon: Shield, text: 'Bezpieczny dostęp oparty na rolach' },
    { icon: Smartphone, text: 'Działa na urządzeniach mobilnych' },
  ];

  return (
    <div className="min-h-screen bg-slate-950 flex overflow-hidden">

      {/* ===== LEFT PANEL – dekoracyjny ===== */}
      <div className="hidden lg:flex lg:w-[52%] relative flex-col justify-between p-14 overflow-hidden">

        {/* Tło gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-green-950/30 to-slate-950" />
        <div className="absolute inset-0 bg-dot-grid opacity-60" />

        {/* Orby świetlne */}
        <div className="orb   absolute top-20  left-20  w-72 h-72 rounded-full bg-green-500/8  blur-3xl" />
        <div className="orb-2 absolute bottom-32 right-10 w-96 h-96 rounded-full bg-emerald-400/6 blur-3xl" />
        <div className="orb-3 absolute top-1/2  left-1/2  w-64 h-64 rounded-full bg-teal-500/8  blur-3xl -translate-x-1/2 -translate-y-1/2" />

        {/* Linia neonowa prawa */}
        <div className="neon-line-right absolute right-0 top-16 bottom-16" />

        {/* Logo */}
        <div className="relative z-10 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#22c55e]/20 border border-[#22c55e]/40 flex items-center justify-center">
            <TreePine className="w-6 h-6 text-[#22c55e]" strokeWidth={1.5} />
          </div>
          <span className="text-white font-bold text-xl tracking-tight">Zielony Punkt</span>
          <span className="ml-auto flex items-center gap-1.5 text-xs text-green-400 bg-green-500/10 border border-green-500/20 px-2.5 py-1 rounded-full">
            <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
            Online
          </span>
        </div>

        {/* Centralny content */}
        <div className="relative z-10 my-auto">
          <div className="relative mb-8 inline-block">
            <div className="absolute inset-0 bg-[#22c55e]/15 blur-2xl rounded-full scale-150" />
            <TreePine
              className="relative w-28 h-28 text-[#22c55e] animate-float drop-shadow-[0_0_24px_rgba(34,197,94,0.6)]"
              strokeWidth={1.1}
            />
          </div>
          <h2 className="text-5xl font-black text-white mb-4 leading-tight">
            System ewidencji<br/>
            <span className="text-gradient-green">drzew</span>
          </h2>
          <p className="text-slate-400 text-lg leading-relaxed max-w-sm">
            Profesjonalne narzędzie do zarządzania zielenią miejską dla Grupy Park M.
          </p>
        </div>

        {/* Feature list */}
        <div className="relative z-10 space-y-3">
          {features.map(({ icon: Icon, text }, i) => (
            <div
              key={text}
              className="flex items-center gap-3 animate-fade-in-up"
              style={{ animationDelay: `${0.1 * i}s` }}
            >
              <div className="w-8 h-8 rounded-xl bg-[#22c55e]/15 border border-[#22c55e]/25 flex items-center justify-center flex-shrink-0">
                <Icon className="w-4 h-4 text-[#22c55e]" strokeWidth={1.5} />
              </div>
              <span className="text-slate-300 text-sm">{text}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ===== RIGHT PANEL – formularz ===== */}
      <div className="flex-1 flex items-center justify-center p-6 lg:p-12 bg-slate-950 relative">
        <div className="absolute inset-0 bg-dot-grid opacity-20" />

        <div className="relative z-10 w-full max-w-md animate-fade-in-up">

          {/* Mobile logo */}
          <div className="lg:hidden text-center mb-10">
            <div className="inline-flex items-center gap-3 mb-4">
              <TreePine className="w-10 h-10 text-[#22c55e] animate-float" strokeWidth={1.3} />
              <span className="text-2xl font-black text-gradient-green">Zielony Punkt</span>
            </div>
            <p className="text-slate-400 text-sm">System Ewidencji Drzew · Grupa Park M</p>
          </div>

          {/* Heading */}
          <div className="mb-8">
            <h2 className="text-3xl font-black text-white mb-1.5">Witaj z powrotem 👋</h2>
            <p className="text-slate-400">Zaloguj się, aby zarządzać ewidencją drzew</p>
          </div>

          {/* Form */}
          <form onSubmit={handleLogin} className="space-y-5">

            <div className="space-y-2">
              <label htmlFor="email" className="block text-sm font-semibold text-slate-300">
                Adres e-mail
              </label>
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="imie.nazwisko@park-m.pl"
                className="input-modern"
                disabled={loading}
                required
                autoComplete="email"
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="password" className="block text-sm font-semibold text-slate-300">
                Hasło
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  id="password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="••••••••"
                  className="input-modern pr-12"
                  disabled={loading}
                  required
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-[#22c55e] transition-colors"
                  tabIndex={-1}
                >
                  {showPassword
                    ? <EyeOff className="w-5 h-5" strokeWidth={1.5} />
                    : <Eye className="w-5 h-5" strokeWidth={1.5} />}
                </button>
              </div>
            </div>

            {error && (
              <div className="flex items-center gap-3 p-4 rounded-2xl bg-red-500/10 border border-red-500/30">
                <div className="w-2 h-2 rounded-full bg-red-400 flex-shrink-0" />
                <p className="text-sm text-red-400">{error}</p>
              </div>
            )}

            <button type="submit" disabled={loading} className="btn-primary mt-2">
              <LogIn className="w-5 h-5" strokeWidth={2} />
              {loading ? 'Logowanie...' : 'Zaloguj się'}
            </button>
          </form>

          {/* Footer */}
          <div className="mt-8 pt-6 border-t border-slate-800 flex justify-center">
            <p className="text-xs text-slate-600">
              Aplikacja działa offline po pierwszym załadowaniu
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
