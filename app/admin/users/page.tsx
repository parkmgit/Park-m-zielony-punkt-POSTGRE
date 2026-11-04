'use client';

import { FormEvent, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  Eye,
  EyeOff,
  KeyRound,
  ShieldCheck,
  UserCog,
  Users,
} from 'lucide-react';

interface AdminUser {
  id: number;
  name: string;
  email: string | null;
  role: 'admin' | 'brygadzista' | 'pracownik';
  active: boolean;
  created_at: string;
  last_seen_at: string | null;
  has_password: boolean;
}

const ROLE_LABEL: Record<AdminUser['role'], string> = {
  admin: 'Administrator',
  brygadzista: 'Brygadzista',
  pracownik: 'Pracownik',
};

function formatDate(value: string | null) {
  if (!value) return 'Brak aktywności';
  return new Date(value).toLocaleString('pl-PL', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function timeSince(value: string | null) {
  if (!value) return 'brak';

  const diff = Date.now() - new Date(value).getTime();
  const days = Math.floor(diff / 86_400_000);

  if (days <= 0) return 'dzisiaj';
  if (days === 1) return 'wczoraj';
  if (days < 7) return `${days} dni temu`;
  if (days < 30) return `${Math.floor(days / 7)} tyg. temu`;
  if (days < 365) return `${Math.floor(days / 30)} mies. temu`;
  return `${Math.floor(days / 365)} lat temu`;
}

export default function AdminUsersPage() {
  const router = useRouter();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [currentUserId, setCurrentUserId] = useState<number | null>(null);
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);
  const [selectedRole, setSelectedRole] = useState<AdminUser['role']>('pracownik');
  const [password, setPassword] = useState('');
  const [passwordConfirmation, setPasswordConfirmation] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(true);
  const [savingPassword, setSavingPassword] = useState(false);
  const [savingRole, setSavingRole] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    const loadUsers = async () => {
      try {
        const response = await fetch('/api/admin/users', { cache: 'no-store' });
        const data = await response.json();

        if (response.status === 401 || response.status === 403) {
          router.replace('/');
          return;
        }
        if (!response.ok) throw new Error(data.error || 'Nie udało się pobrać użytkowników');

        setUsers(data.users);
        setCurrentUserId(data.currentUserId);
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : 'Nie udało się pobrać użytkowników');
      } finally {
        setLoading(false);
      }
    };

    loadUsers();
  }, [router]);

  const selectUser = (user: AdminUser) => {
    setSelectedUser(user);
    setSelectedRole(user.role);
    setPassword('');
    setPasswordConfirmation('');
    setError('');
    setSuccess('');
  };

  const handlePasswordChange = async (event: FormEvent) => {
    event.preventDefault();
    if (!selectedUser) return;

    setError('');
    setSuccess('');

    if (password.length < 8) {
      setError('Nowe hasło musi mieć minimum 8 znaków');
      return;
    }
    if (password !== passwordConfirmation) {
      setError('Wpisane hasła nie są takie same');
      return;
    }

    setSavingPassword(true);
    try {
      const response = await fetch(`/api/admin/users/${selectedUser.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });
      const data = await response.json();

      if (!response.ok) throw new Error(data.error || 'Nie udało się zmienić hasła');

      setUsers(current => current.map(user => (
        user.id === selectedUser.id ? { ...user, has_password: true } : user
      )));
      setSelectedUser(current => current ? { ...current, has_password: true } : current);
      setPassword('');
      setPasswordConfirmation('');
      setSuccess(data.message);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Nie udało się zmienić hasła');
    } finally {
      setSavingPassword(false);
    }
  };

  const handleRoleChange = async (event: FormEvent) => {
    event.preventDefault();
    if (!selectedUser || selectedRole === selectedUser.role) return;

    setError('');
    setSuccess('');
    setSavingRole(true);

    try {
      const response = await fetch(`/api/admin/users/${selectedUser.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: selectedRole }),
      });
      const data = await response.json();

      if (!response.ok) throw new Error(data.error || 'Nie udało się zmienić roli');

      const updatedUser = { ...selectedUser, role: data.role as AdminUser['role'] };
      setUsers(current => current.map(user => (
        user.id === updatedUser.id ? updatedUser : user
      )));
      setSelectedUser(updatedUser);
      setSuccess(data.message);

      if (updatedUser.id === currentUserId && updatedUser.role !== 'admin') {
        router.replace('/');
        router.refresh();
      }
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Nie udało się zmienić roli');
    } finally {
      setSavingRole(false);
    }
  };

  return (
    <div className="min-h-screen py-8 pb-28 md:pb-8">
      <div className="container mx-auto px-4 max-w-6xl">
        <Link href="/" className="inline-flex items-center gap-2 text-white/40 hover:text-white text-sm mb-6 transition-colors">
          <ArrowLeft className="w-4 h-4" /> Powrót
        </Link>

        <div className="glass rounded-3xl p-6 sm:p-8 gradient-border-green">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/20">
              <Users className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-cyan-400">Panel administratora</p>
              <h1 className="text-2xl font-black text-white">Użytkownicy</h1>
            </div>
          </div>
          <p className="text-sm text-white/40 mb-7">Wybierz użytkownika, aby zmienić jego rolę lub ustawić nowe hasło.</p>

          {loading ? (
            <div className="flex justify-center py-16">
              <div className="w-10 h-10 border-4 border-green-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <div className="grid lg:grid-cols-[1.15fr_0.85fr] gap-5">
              <section>
                <h2 className="text-xs font-black text-white/40 uppercase tracking-widest mb-3">Lista kont ({users.length})</h2>
                <div className="space-y-2 max-h-[620px] overflow-y-auto pr-1">
                  {users.map((user, index) => (
                    <button
                      key={user.id}
                      type="button"
                      onClick={() => selectUser(user)}
                      aria-pressed={selectedUser?.id === user.id}
                      className={`w-full text-left cursor-pointer rounded-2xl p-5 transition-all hover:-translate-y-0.5 animate-tile-in focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-400/60 ${
                        selectedUser?.id === user.id
                          ? 'glass-green gradient-border-green'
                          : 'glass'
                      }`}
                      style={{ animationDelay: `${Math.min(index, 8) * 0.04}s` }}
                    >
                      <div className="flex items-start justify-between gap-3 mb-3">
                        <div className="min-w-0">
                          <p className="font-bold text-white truncate">{user.name}</p>
                          <p className="text-xs text-white/40 truncate">{user.email || 'Brak adresu email'}</p>
                        </div>
                        <span
                          className="text-[10px] font-black text-[#22c55e] px-2 py-0.5 rounded-xl whitespace-nowrap"
                          style={{ background: 'rgba(34,197,94,0.12)', border: '1px solid rgba(34,197,94,0.2)' }}
                        >
                          {ROLE_LABEL[user.role]}
                        </span>
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        <div className="text-center glass rounded-xl py-2 px-1">
                          <p className={`text-xs font-black truncate ${user.active ? 'text-[#4ade80]' : 'text-red-400'}`}>
                            {user.active ? 'Aktywne' : 'Wyłączone'}
                          </p>
                          <p className="text-[10px] text-white/30">konto</p>
                        </div>
                        <div className="text-center glass rounded-xl py-2 px-1">
                          <p className={`text-xs font-black truncate ${user.has_password ? 'text-cyan-400' : 'text-amber-400'}`}>
                            {user.has_password ? 'Ustawione' : 'Brak'}
                          </p>
                          <p className="text-[10px] text-white/30">hasło</p>
                        </div>
                        <div className="text-center glass rounded-xl py-2 px-1" title={formatDate(user.last_seen_at)}>
                          <p className="text-xs font-bold text-violet-400 truncate">{timeSince(user.last_seen_at)}</p>
                          <p className="text-[10px] text-white/30">aktywność</p>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </section>

              <section className="rounded-2xl bg-white/[0.03] border border-white/[0.08] p-5 sm:p-6 h-fit lg:sticky lg:top-24">
                {selectedUser ? (
                  <div className="space-y-5">
                    <div className="flex items-center gap-3 pb-4 border-b border-white/10">
                      <div className="w-10 h-10 rounded-xl bg-cyan-500/10 flex items-center justify-center">
                        <UserCog className="w-5 h-5 text-cyan-400" />
                      </div>
                      <div className="min-w-0">
                        <h2 className="font-black text-white">Zarządzaj użytkownikiem</h2>
                        <p className="text-xs text-white/40 truncate">{selectedUser.name}</p>
                      </div>
                    </div>

                    {error && (
                      <div className="flex items-start gap-2 rounded-xl bg-red-500/10 border border-red-500/25 p-3 text-sm text-red-300">
                        <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" /> {error}
                      </div>
                    )}
                    {success && (
                      <div className="flex items-start gap-2 rounded-xl bg-green-500/10 border border-green-500/25 p-3 text-sm text-green-300">
                        <CheckCircle2 className="w-4 h-4 mt-0.5 flex-shrink-0" /> {success}
                      </div>
                    )}

                    <form onSubmit={handleRoleChange} className="space-y-3">
                      <div>
                        <label htmlFor="user-role" className="block text-xs font-bold text-white/60 mb-2">Rola użytkownika</label>
                        <select
                          id="user-role"
                          value={selectedRole}
                          onChange={event => setSelectedRole(event.target.value as AdminUser['role'])}
                          className="input-modern"
                          disabled={savingRole || savingPassword}
                        >
                          <option value="pracownik">Pracownik</option>
                          <option value="brygadzista">Brygadzista</option>
                          <option value="admin">Administrator</option>
                        </select>
                      </div>
                      <button
                        type="submit"
                        disabled={savingRole || savingPassword || selectedRole === selectedUser.role}
                        className="btn-primary"
                      >
                        <UserCog className="w-5 h-5" />
                        {savingRole ? 'Zapisywanie...' : 'Zapisz rolę'}
                      </button>
                      <p className="text-[11px] text-white/30">
                        System nie pozwoli zdegradować ostatniego aktywnego administratora.
                      </p>
                    </form>

                    <div className="border-t border-white/10" />

                    <form onSubmit={handlePasswordChange} className="space-y-4">
                      <div className="flex items-center gap-2">
                        <KeyRound className="w-4 h-4 text-green-400" />
                        <h3 className="text-sm font-black text-white">Zmiana hasła</h3>
                      </div>

                      <div>
                        <label htmlFor="new-password" className="block text-xs font-bold text-white/60 mb-2">Nowe hasło</label>
                        <div className="relative">
                          <input
                            id="new-password"
                            type={showPassword ? 'text' : 'password'}
                            value={password}
                            onChange={event => setPassword(event.target.value)}
                            className="input-modern pr-12"
                            minLength={8}
                            maxLength={72}
                            autoComplete="new-password"
                            disabled={savingPassword || savingRole}
                            required
                          />
                          <button
                            type="button"
                            onClick={() => setShowPassword(current => !current)}
                            className="absolute right-4 top-1/2 -translate-y-1/2 text-white/30 hover:text-green-400"
                            aria-label={showPassword ? 'Ukryj hasło' : 'Pokaż hasło'}
                          >
                            {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                          </button>
                        </div>
                        <p className="mt-1.5 text-[11px] text-white/30">Minimum 8 znaków.</p>
                      </div>

                      <div>
                        <label htmlFor="confirm-password" className="block text-xs font-bold text-white/60 mb-2">Powtórz nowe hasło</label>
                        <input
                          id="confirm-password"
                          type={showPassword ? 'text' : 'password'}
                          value={passwordConfirmation}
                          onChange={event => setPasswordConfirmation(event.target.value)}
                          className="input-modern"
                          minLength={8}
                          maxLength={72}
                          autoComplete="new-password"
                          disabled={savingPassword || savingRole}
                          required
                        />
                      </div>

                      <button type="submit" disabled={savingPassword || savingRole} className="btn-primary">
                        <ShieldCheck className="w-5 h-5" />
                        {savingPassword ? 'Zapisywanie...' : 'Ustaw nowe hasło'}
                      </button>
                    </form>
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <UserCog className="w-10 h-10 text-white/15 mx-auto mb-3" />
                    <p className="font-bold text-white/60">Wybierz użytkownika</p>
                    <p className="text-xs text-white/30 mt-1">Opcje roli i hasła pojawią się tutaj.</p>
                  </div>
                )}
              </section>
            </div>
          )}

          {!loading && !selectedUser && error && (
            <div className="mt-5 flex items-start gap-2 rounded-xl bg-red-500/10 border border-red-500/25 p-3 text-sm text-red-300">
              <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" /> {error}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
