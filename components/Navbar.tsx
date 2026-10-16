"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { HomeIcon, FolderPlusIcon } from "@heroicons/react/24/outline";
import { Bell, Download, LogOut, User } from "lucide-react";
import { useEffect, useState } from "react";

interface CurrentUser {
  id: number;
  name: string;
  role: string;
  email: string;
}

interface WateringReminder {
  id: number;
  tree_id: number;
  due_at: string;
  remind_before_hours: number;
  tree_number?: string;
  species_name?: string;
  site_name?: string;
  site_code?: string;
}

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showInstallButton, setShowInstallButton] = useState(false);
  const [reminders, setReminders] = useState<WateringReminder[]>([]);
  const [showReminders, setShowReminders] = useState(false);

  useEffect(() => {
    if (pathname !== "/login" && pathname !== "/register") {
      fetch("/api/auth/me")
        .then((res) => (res.ok ? res.json() : null))
        .then((user) => {
          setCurrentUser(user);
          if (user) {
            fetch("/api/reminders")
              .then((res) => (res.ok ? res.json() : []))
              .then((data) => setReminders(Array.isArray(data) ? data : []))
              .catch(() => setReminders([]));
          }
        })
        .catch(() => setCurrentUser(null));
    }

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowInstallButton(true);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

    if (window.matchMedia("(display-mode: standalone)").matches) {
      setShowInstallButton(false);
    }

    return () => {
      window.removeEventListener(
        "beforeinstallprompt",
        handleBeforeInstallPrompt,
      );
    };
  }, [pathname]);

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      router.push("/login");
      router.refresh();
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  const handleInstallClick = async () => {
    if (!deferredPrompt) {
      const ua = navigator.userAgent.toLowerCase();
      if (ua.includes("firefox")) {
        alert(
          'Instalacja w Firefox:\n• Android: kliknij menu ⋮ → "Zainstaluj" lub "Dodaj do ekranu głównego"\n• Desktop: kliknij ikonę ⌂ w pasku adresu lub menu ⋮ → "Zainstaluj aplikację"',
        );
      } else if (ua.includes("safari") && !ua.includes("chrome")) {
        alert(
          'Instalacja w Safari (iOS):\n• Kliknij ikonę Udostępnij (□↑) na dole\n• Wybierz "Dodaj do ekranu głównego"',
        );
      } else {
        alert(
          'Instalacja:\n• Chrome/Edge: kliknij ⋮ (menu) → "Zainstaluj aplikację"\n• Lub poczekaj na automatyczny monit przeglądarki',
        );
      }
      return;
    }

    // Show the install prompt
    deferredPrompt.prompt();

    // Wait for the user to respond to the prompt
    const { outcome } = await deferredPrompt.userChoice;

    if (outcome === "accepted") {
      console.log("User accepted the install prompt");
      setShowInstallButton(false);
    } else {
      console.log("User dismissed the install prompt");
    }

    // Clear the deferredPrompt
    setDeferredPrompt(null);
  };

  // Don't show navbar on login and register pages
  if (pathname === "/login" || pathname === "/register") {
    return null;
  }

  const initials = currentUser
    ? currentUser.name
        .split(" ")
        .map((n: string) => n[0])
        .slice(0, 2)
        .join("")
    : "";

  return (
    <div className="sticky top-0 z-50 px-3 pt-3 pb-0">
      <nav className="nav-glass rounded-2xl">
        <div className="flex items-center justify-between px-4 py-2.5">
          {/* Logo */}
          <Link
            href="/"
            className="flex items-center gap-2.5 flex-shrink-0 group"
          >
            <div className="w-8 h-8 rounded-2xl bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center shadow-md shadow-green-500/30 group-hover:scale-105 transition-transform">
              <HomeIcon className="w-4 h-4 text-white" />
            </div>
            <span className="font-black text-white text-sm hidden sm:block tracking-tight text-gradient-green">
              Zielony Punkt
            </span>
          </Link>

          {/* Right side */}
          <div className="flex items-center gap-2">
            {/* Bell */}
            {currentUser && (
              <div className="relative">
                <button
                  onClick={() => setShowReminders(!showReminders)}
                  className="relative w-8 h-8 flex items-center justify-center rounded-xl text-white/50 hover:text-white hover:bg-white/8 transition-all"
                  title="Powiadomienia"
                >
                  <Bell className="w-4 h-4" strokeWidth={1.8} />
                  {reminders.length > 0 && (
                    <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-red-500" />
                  )}
                </button>
                {showReminders && (
                  <div className="absolute right-0 top-11 z-50 w-80 rounded-2xl nav-glass p-4 shadow-2xl">
                    <h3 className="mb-3 text-sm font-semibold text-white">
                      Przypomnienia podlewania
                    </h3>
                    {reminders.length === 0 ? (
                      <p className="text-sm text-white/40">
                        Brak aktywnych powiadomień.
                      </p>
                    ) : (
                      <div className="space-y-2">
                        {reminders.slice(0, 5).map((reminder) => (
                          <Link
                            key={reminder.id}
                            href={`/trees/${reminder.tree_id}`}
                            onClick={() => setShowReminders(false)}
                            className="block rounded-xl glass p-3 hover:glass-green"
                          >
                            <p className="text-sm font-medium text-white">
                              {reminder.species_name ||
                                reminder.tree_number ||
                                `Drzewo #${reminder.tree_id}`}
                            </p>
                            <p className="text-xs text-white/40 mt-0.5">
                              {reminder.site_code} {reminder.site_name}
                            </p>
                            <p className="mt-1 text-xs text-green-400">
                              Podlać:{" "}
                              {new Date(reminder.due_at).toLocaleString(
                                "pl-PL",
                              )}
                            </p>
                          </Link>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* PWA Install - always visible, always green */}
            <button
              onClick={handleInstallClick}
              title="Zainstaluj aplikację na urządzeniu"
              className="flex items-center gap-2 px-3 py-2 rounded-2xl font-bold text-sm text-white transition-all hover:scale-105 active:scale-95"
              style={
                deferredPrompt
                  ? {
                      background: "linear-gradient(135deg,#16a34a,#22c55e)",
                      boxShadow: "0 0 20px rgba(34,197,94,0.5)",
                      animation: "neon-glow 2s ease-in-out infinite",
                    }
                  : {
                      background: "rgba(34,197,94,0.15)",
                      border: "1px solid rgba(34,197,94,0.35)",
                    }
              }
            >
              <Download className="w-4 h-4" strokeWidth={2.2} />
              <span className="hidden sm:inline">Zainstaluj</span>
            </button>

            {/* Avatar + name */}
            {currentUser && (
              <div className="flex items-center gap-2">
                <div className="avatar-ring">
                  <div className="w-7 h-7 rounded-full bg-[#04060f] flex items-center justify-center text-[11px] font-black text-gradient-green">
                    {initials}
                  </div>
                </div>
                <span className="text-xs font-medium text-white/70 hidden lg:block max-w-[100px] truncate">
                  {currentUser.name.split(" ")[0]}
                </span>
              </div>
            )}

            {/* Logout */}
            {currentUser && (
              <button
                onClick={handleLogout}
                className="w-8 h-8 flex items-center justify-center rounded-xl text-white/40 hover:text-red-400 hover:bg-red-500/10 transition-all"
                title="Wyloguj"
              >
                <LogOut className="w-4 h-4" strokeWidth={1.8} />
              </button>
            )}
          </div>
        </div>
      </nav>

      {/* Mobile bottom nav */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 px-3 pb-3">
        <div className="nav-glass rounded-3xl flex items-center justify-around px-3 py-2.5 gap-1">
          <Link
            href="/"
            className={`flex flex-col items-center gap-1 px-4 py-2 rounded-2xl transition-all ${pathname === "/" ? "bg-[#22c55e]/20 text-[#22c55e]" : "text-white/40 hover:text-white"}`}
          >
            <HomeIcon className="w-5 h-5" />
            <span className="text-[10px] font-medium">Home</span>
          </Link>
          <button
            onClick={handleInstallClick}
            className="flex flex-col items-center gap-1 px-4 py-2 rounded-2xl transition-all"
            style={
              deferredPrompt
                ? { color: "#22c55e" }
                : { color: "rgba(34,197,94,0.55)" }
            }
            title="Zainstaluj aplikację"
          >
            <Download className="w-5 h-5" strokeWidth={1.8} />
            <span className="text-[10px] font-bold">Zainstaluj</span>
          </button>
          {currentUser && (
            <button
              onClick={() => setShowReminders(!showReminders)}
              className="relative flex flex-col items-center gap-1 px-4 py-2 rounded-2xl text-white/40 hover:text-white transition-all"
            >
              <Bell className="w-5 h-5" strokeWidth={1.8} />
              <span className="text-[10px] font-medium">Alerty</span>
              {reminders.length > 0 && (
                <span className="absolute top-1.5 right-3 w-2 h-2 rounded-full bg-red-500" />
              )}
            </button>
          )}
          {currentUser && (
            <button
              onClick={handleLogout}
              className="flex flex-col items-center gap-1 px-4 py-2 rounded-2xl text-white/40 hover:text-red-400 transition-all"
            >
              <LogOut className="w-5 h-5" strokeWidth={1.8} />
              <span className="text-[10px] font-medium">Wyloguj</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
