import { AnimatePresence, motion } from 'framer-motion';
import { LogOut, Network, History, Activity } from 'lucide-react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { GlassCard } from '@/components/ui/GlassCard';
import { useAuthContext } from '@/context/AuthContext';
import { cn } from '@/lib/utils';

const navButton = 'rounded-full px-5 py-2.5 text-sm font-semibold transition';

export function AppShell() {
  const { user, logout } = useAuthContext();
  const location = useLocation();

  return (
    <div className="flex h-screen w-screen flex-col overflow-hidden bg-[#f0f9ff] text-slate-800">
      <header className="relative z-20 shrink-0 px-4 pb-2 pt-4 md:px-6">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 rounded-[30px] border border-white/40 bg-white/30 px-4 py-3 shadow-glass backdrop-blur-2xl">
          <div>
            <p className="text-[10px] uppercase tracking-[0.3em] text-sky-500">Antigravity Pro</p>
            <h1 className="text-sm font-semibold text-slate-800 md:text-base">PDF to digital twin monitoring hub</h1>
          </div>

          <div className="flex items-center gap-3">
            <nav className="flex items-center rounded-full border border-white/40 bg-white/35 p-1 backdrop-blur-2xl">
              <NavLink to="/app/architect" className={({ isActive }) => cn(navButton, isActive ? 'bg-sky-500 text-white shadow-sm' : 'text-slate-600 hover:bg-white/60')}>
                <span className="inline-flex items-center gap-2"><Network className="h-4 w-4" />AI Assistant</span>
              </NavLink>
              <NavLink to="/app/history" className={({ isActive }) => cn(navButton, isActive ? 'bg-sky-500 text-white shadow-sm' : 'text-slate-600 hover:bg-white/60')}>
                <span className="inline-flex items-center gap-2"><History className="h-4 w-4" />History</span>
              </NavLink>
              <NavLink to="/app/network" className={({ isActive }) => cn(navButton, isActive ? 'bg-sky-500 text-white shadow-sm' : 'text-slate-600 hover:bg-white/60')}>
                <span className="inline-flex items-center gap-2"><Activity className="h-4 w-4" />Network</span>
              </NavLink>
            </nav>

            <GlassCard className="hidden border-white/40 px-4 py-2 md:block">
              <div className="text-[11px] text-slate-500">{user?.email}</div>
              <div className="text-xs capitalize text-slate-400">{user?.role}</div>
            </GlassCard>

            <button type="button" onClick={() => void logout()} className="inline-flex items-center gap-2 rounded-full border border-white/40 bg-white/40 px-4 py-2 text-sm font-semibold text-slate-700 backdrop-blur-2xl hover:bg-white/60">
              <LogOut className="h-4 w-4" />
              Logout
            </button>
          </div>
        </div>
      </header>

      <main className="min-h-0 flex-1 overflow-hidden">
        <AnimatePresence mode="wait">
          <motion.div key={location.pathname} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.24, ease: 'easeOut' }} className="h-full">
            <Outlet />
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  );
}
