import { NavLink, Outlet } from "react-router-dom";
import { Home, TrendingUp, TrendingDown, Target, BarChart3, Smile, Frown } from "lucide-react";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

const navigation = [
  { name: "Dashboard", href: "/", icon: Home },
  // { name: "Ingresos", href: "/ingresos", icon: TrendingUp }, // oculto por pedido del usuario
  { name: "Gastos", href: "/gastos", icon: TrendingDown },
  { name: "Objetivos", href: "/objetivos", icon: Target },
  // { name: "Reportes", href: "/reportes", icon: BarChart3 }, // oculto por pedido del usuario
];

export default function Layout() {
  // Theme (light/dark) with happy/sad faces
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    try {
      const saved = localStorage.getItem('mm_theme');
      if (saved === 'light' || saved === 'dark') return saved;
    } catch (e) { /* ignore theme read */ }
    // fallback: system
    if (typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      return 'dark';
    }
    return 'light';
  });

  useEffect(() => {
    try { localStorage.setItem('mm_theme', theme); } catch (e) { /* ignore theme write */ }
    const root = document.documentElement;
    if (theme === 'dark') root.classList.add('dark'); else root.classList.remove('dark');
  }, [theme]);

  const toggleTheme = () => setTheme(t => (t === 'dark' ? 'light' : 'dark'));

  // Indicador de conexión a la API/DB
  const API_BASE = ((import.meta as unknown as { env?: Record<string,string> }).env?.VITE_API_URL) || 'http://localhost:8081';
  const [apiOk, setApiOk] = useState<boolean | null>(null);
  useEffect(() => {
    let alive = true;
    const ping = async () => {
      try {
        const r = await fetch(`${API_BASE}/api/health`);
        if (!alive) return;
        setApiOk(r.ok);
      } catch {
        if (!alive) return;
        setApiOk(false);
      }
    };
    ping();
    const id = setInterval(ping, 10000);
    return () => { alive = false; clearInterval(id); };
  }, [API_BASE]);

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation Header */}
      <nav className="bg-background shadow-soft border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-2">
              <img src="/logo-depresion.png" alt="Pobrify" className="w-8 h-8 rounded" onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }} />
              <h1 className="text-xl font-bold text-foreground">Pobrify</h1>
            </div>
            
            <div className="flex items-center space-x-1">
              {navigation.map((item) => {
                const Icon = item.icon;
                return (
                  <NavLink
                    key={item.name}
                    to={item.href}
                    end={item.href === "/"}
                    className={({ isActive }) =>
                      cn(
                        "flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200",
                        isActive
                          ? "bg-primary text-primary-foreground shadow-glow"
                          : "text-muted-foreground hover:text-foreground hover:bg-muted"
                      )
                    }
                  >
                    <Icon size={18} />
                    <span className="hidden sm:block">{item.name}</span>
                  </NavLink>
                );
              })}
              {/* DB health badge */}
              <span
                title={apiOk === null ? 'Chequeando base...' : apiOk ? 'DB OK' : 'DB OFF'}
                className={cn(
                  'ml-2 px-2 py-1 rounded text-xs font-medium border',
                  apiOk === null && 'text-muted-foreground border-muted',
                  apiOk === true && 'bg-green-600/90 text-white border-green-700',
                  apiOk === false && 'bg-red-600/90 text-white border-red-700'
                )}
              >
                {apiOk === null ? 'DB…' : apiOk ? 'DB OK' : 'DB OFF'}
              </span>
              {/* Theme Toggle: happy (light) / sad (dark) */}
              <button
                aria-label="Cambiar tema"
                className="ml-2 inline-flex items-center justify-center w-9 h-9 rounded-lg border hover:bg-muted transition-colors"
                onClick={toggleTheme}
                title={theme === 'dark' ? 'Modo claro' : 'Modo oscuro'}
              >
                {theme === 'dark' ? <Frown size={18} className="text-foreground" /> : <Smile size={18} className="text-foreground" />}
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Outlet />
      </main>
    </div>
  );
}