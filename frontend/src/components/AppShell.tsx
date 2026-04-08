import { AnimatePresence, motion } from 'framer-motion';
import { 
  LogOut, 
  LayoutDashboard, 
  Network, 
  Activity, 
  BarChart3, 
  Settings, 
  Search, 
  Bell, 
  User as UserIcon 
} from 'lucide-react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { useAuthContext } from '@/context/AuthContext';
import { cn } from '@/lib/utils';

export function AppShell() {
  const { user, logout } = useAuthContext();
  const location = useLocation();

  const navigation = [
    { name: 'Dashboard', to: '/app/dashboard', icon: LayoutDashboard },
    { name: 'AI Network Generator', to: '/app/architect', icon: Network },
    { name: 'Network Health', to: '/app/health', icon: Activity },
    { name: 'Network Analysis', to: '/app/analysis', icon: BarChart3 },
    { name: 'Settings', to: '/app/settings', icon: Settings },
  ];

  return (
    <div className="flex h-screen w-screen overflow-hidden text-slate-800">
      {/* LEFT SIDEBAR */}
      <aside className="z-30 flex w-72 flex-col gap-8 bg-white/40 p-6 backdrop-blur-2xl border-r border-white/20">
        <div className="flex items-center gap-3 px-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600 shadow-lg shadow-indigo-200">
            <Network className="h-6 w-6 text-white" />
          </div>
          <span className="text-xl font-bold tracking-tight text-slate-800">Maptive</span>
        </div>

        <nav className="flex flex-1 flex-col gap-2">
          {navigation.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) => cn(
                'sidebar-item',
                isActive && 'sidebar-item-active'
              )}
            >
              <item.icon className="h-5 w-5" />
              {item.name}
            </NavLink>
          ))}
        </nav>

        <div className="mt-auto border-t border-slate-200/50 pt-6">
          <button
            onClick={() => logout()}
            className="flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium text-slate-500 transition hover:bg-red-50 hover:text-red-600"
          >
            <LogOut className="h-5 w-5" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* RIGHT MAIN PANEL */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* TOP NAVBAR */}
        <header className="z-20 flex h-20 items-center justify-between border-b border-white/20 bg-white/30 px-8 backdrop-blur-xl">
          <div className="flex w-96 items-center gap-3 rounded-2xl border border-white/40 bg-white/50 px-4 py-2 text-slate-400 focus-within:ring-2 focus-within:ring-indigo-500/20">
            <Search className="h-5 w-5 shrink-0" />
            <input
              type="text"
              placeholder="Search components or logs..."
              className="w-full bg-transparent text-sm text-slate-700 outline-none placeholder:text-slate-400"
            />
          </div>

          <div className="flex items-center gap-6">
            <button className="relative rounded-full p-2 text-slate-500 hover:bg-white/50 hover:text-indigo-600 transition">
              <Bell className="h-5 w-5" />
              <div className="absolute top-2 right-2 h-2 w-2 rounded-full bg-indigo-500 border-2 border-white" />
            </button>
            
            <div className="flex items-center gap-3 py-1 pl-4 border-l border-slate-200">
              <div className="flex flex-col items-end">
                <span className="text-xs font-semibold text-slate-700">{user?.displayName || 'Network Admin'}</span>
                <span className="text-[10px] uppercase tracking-wider text-slate-400">{user?.role}</span>
              </div>
              <div className="h-10 w-10 overflow-hidden rounded-xl bg-indigo-50 border-2 border-white shadow-sm flex items-center justify-center">
                <UserIcon className="h-6 w-6 text-indigo-400" />
              </div>
            </div>
          </div>
        </header>

        {/* CONTENT AREA */}
        <main className="min-h-0 flex-1 overflow-hidden">
          <AnimatePresence mode="wait">
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.25, ease: 'easeOut' }}
              className="h-full w-full"
            >
              <Outlet />
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
}
