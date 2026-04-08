import { Link } from 'react-router-dom';
import { ArrowRight, Sparkles, Activity, ShieldCheck, Database, FileText } from 'lucide-react';
import { GlassCard } from '@/components/ui/GlassCard';
import { firebaseReady } from '@/lib/firebase';

export default function MaptiveDashboard() {
  // const { user } = useAuthContext();
  
  const stats = [
    { name: 'Active Nodes', value: '42', icon: Activity, color: 'text-emerald-600' },
    { name: 'Incidents (24h)', value: '0', icon: ShieldCheck, color: 'text-sky-600' },
    { name: 'Traffic (avg)', value: '1.2 Gbps', icon: Database, color: 'text-indigo-600' },
    { name: 'AI Models', value: 'LLaMA 3.1', icon: Sparkles, color: 'text-amber-600' },
  ];

  return (
    <div className="space-y-8">
      <header>
        <h2 className="text-3xl font-bold tracking-tight text-slate-800">Welcome Back</h2>
        <p className="mt-1 text-slate-500">
          Everything is running smoothly on your digital twin of <span className="font-semibold text-slate-700">Campus A</span>.
        </p>
      </header>

      {/* Stats Grid */}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <GlassCard key={stat.name} className="p-6 border-white/50">
            <div className="flex items-center gap-4">
              <div className={`rounded-xl bg-white/60 p-3 shadow-sm ${stat.color}`}>
                <stat.icon className="h-6 w-6" />
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-slate-400">{stat.name}</p>
                <p className="text-2xl font-bold text-slate-800">{stat.value}</p>
              </div>
            </div>
          </GlassCard>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Call to action: AI Generator */}
        <GlassCard className="p-8 border-indigo-100 flex flex-col justify-between h-full">
          <div>
            <div className="flex items-center gap-2 text-indigo-600 mb-4">
              <Sparkles className="h-6 w-6" />
              <h3 className="text-xl font-bold">AI Network Architect</h3>
            </div>
            <p className="text-slate-600 leading-relaxed">
              Upload a campus blueprint (PDF) or describe your requirements in plain English. 
              Our LLM-powered engine will instantly structuralize your network topology with VLAN groupings and campus zones.
            </p>
          </div>
          <Link
            to="/app/architect"
            className="mt-8 inline-flex items-center justify-center gap-2 rounded-2xl bg-indigo-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-indigo-100 transition hover:bg-indigo-700"
          >
            Start Designing <ArrowRight className="h-4 w-4" />
          </Link>
        </GlassCard>

        {/* Quick View: Recent Files */}
        <GlassCard className="p-8 border-white/50">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2 text-slate-800">
              <FileText className="h-6 w-6 text-slate-400" />
              <h3 className="text-lg font-bold">PDF Blueprints</h3>
            </div>
            <Link to="/app/architect" className="text-xs font-semibold text-indigo-600 hover:underline px-3 py-1 bg-indigo-50 rounded-full transition">View All</Link>
          </div>
          <div className="space-y-4">
            {[
              { name: 'Library_Infrastructure.pdf', date: '2 hours ago' },
              { name: 'North_Campus_Fiber.pdf', date: 'Yesterday' },
              { name: 'Main_Lab_VLANs.pdf', date: 'Mar 24, 2024' },
            ].map((file) => (
              <div key={file.name} className="flex items-center justify-between p-3 rounded-xl border border-slate-100 bg-white/40 transition hover:bg-white/60">
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-lg bg-slate-100 flex items-center justify-center">
                    <FileText className="h-4 w-4 text-slate-500" />
                  </div>
                  <span className="text-sm font-medium text-slate-700">{file.name}</span>
                </div>
                <span className="text-xs text-slate-400">{file.date}</span>
              </div>
            ))}
          </div>
        </GlassCard>
      </div>

      {!firebaseReady && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-xs text-amber-800 flex items-center gap-3">
          <ShieldCheck className="h-5 w-5 text-amber-600" />
          <span>Firebase environment variables are not configured. Currently running in <b>Local Demo Mode</b>. Networking data will be persistent but local until a Vercel/Firebase link is established.</span>
        </div>
      )}
    </div>
  );
}
