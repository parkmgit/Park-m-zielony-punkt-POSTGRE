'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { TreePine, UserPlus, ArrowLeft, Eye, EyeOff } from 'lucide-react';

export default function RegisterPage() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'pracownik' as 'admin' | 'brygadzista' | 'pracownik'
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    // Client-side validation
    if (!formData.name || formData.name.trim().length < 3) {
      setError('Imię i nazwisko musi mieć minimum 3 znaki');
      setLoading(false);
      return;
    }

    if (!formData.email.endsWith('@park-m.pl')) {
      setError('Email musi kończyć się na @park-m.pl');
      setLoading(false);
      return;
    }

    if (!formData.password || formData.password.length < 6) {
      setError('Hasło musi mieć minimum 6 znaków');
      setLoading(false);
      return;
    }

    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Błąd rejestracji');
        setLoading(false);
        return;
      }

      // Registration successful - redirect to home
      router.push('/');
      router.refresh();
    } catch (err) {
      setError('Błąd połączenia z serwerem');
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-green-100 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <TreePine className="w-20 h-20 text-[#22c55e] mx-auto mb-4" strokeWidth={1.5} />
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Park M
          </h1>
          <p className="text-gray-600 dark:text-gray-300">
            System Ewidencji Drzew
          </p>
        </div>

        <div className="bg-white dark:bg-slate-800/80 dark:backdrop-blur rounded-3xl shadow-lg dark:shadow-[0_0_30px_rgba(34,197,94,0.5)] p-8 border-[3px] border-gray-200 dark:border-[#22c55e]">
          <div className="mb-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-[#22c55e] mb-2">
              Utwórz konto
            </h2>
            <p className="text-sm text-gray-600 dark:text-slate-300">
              Zarejestruj się, aby korzystać z aplikacji
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Imię i nazwisko
              </label>
              <input
                type="text"
                id="name"
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder="Jan Kowalski"
                className="w-full px-4 py-3 rounded-xl border-2 border-gray-300 dark:border-[#22c55e]/50 bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:outline-none focus:border-green-500 dark:focus:border-[#22c55e] transition-colors"
                disabled={loading}
                required
              />
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Email służbowy
              </label>
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="jan.kowalski@park-m.pl"
                className="w-full px-4 py-3 rounded-xl border-2 border-gray-300 dark:border-[#22c55e]/50 bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:outline-none focus:border-green-500 dark:focus:border-[#22c55e] transition-colors"
                disabled={loading}
                required
              />
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                Musi kończyć się na @park-m.pl
              </p>
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
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
                  className="w-full px-4 py-3 pr-12 rounded-xl border-2 border-gray-300 dark:border-[#22c55e]/50 bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:outline-none focus:border-green-500 dark:focus:border-[#22c55e] transition-colors"
                  disabled={loading}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
                  tabIndex={-1}
                >
                  {showPassword ? (
                    <EyeOff className="w-5 h-5" strokeWidth={1.5} />
                  ) : (
                    <Eye className="w-5 h-5" strokeWidth={1.5} />
                  )}
                </button>
              </div>
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                Minimum 6 znaków
              </p>
            </div>

            <div>
              <label htmlFor="role" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Stanowisko
              </label>
              <select
                id="role"
                name="role"
                value={formData.role}
                onChange={handleChange}
                className="w-full px-4 py-3 rounded-xl border-2 border-gray-300 dark:border-[#22c55e]/50 bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:outline-none focus:border-green-500 dark:focus:border-[#22c55e] transition-colors"
                disabled={loading}
                required
              >
                <option value="pracownik">Pracownik</option>
                <option value="brygadzista">Brygadzista</option>
                <option value="admin">Administrator</option>
              </select>
            </div>

            {error && (
              <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
                <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-green-600 dark:bg-[#22c55e] hover:bg-green-700 dark:hover:bg-[#16a34a] text-white font-semibold py-3 px-6 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              <UserPlus className="w-5 h-5" strokeWidth={1.5} />
              {loading ? 'Rejestracja...' : 'Utwórz konto'}
            </button>
          </form>

          <div className="mt-6 pt-6 border-t border-gray-200 dark:border-slate-700">
            <Link
              href="/login"
              className="flex items-center justify-center gap-2 text-sm text-gray-600 dark:text-gray-400 hover:text-green-600 dark:hover:text-[#22c55e] transition-colors"
            >
              <ArrowLeft className="w-4 h-4" strokeWidth={1.5} />
              Masz już konto? Zaloguj się
            </Link>
          </div>
        </div>

        <div className="mt-6 text-center">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Tylko pracownicy Park M mogą się zarejestrować
          </p>
        </div>
      </div>
    </div>
  );
}
