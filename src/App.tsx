import { BarChart3, CreditCard, Gauge, HelpCircle, LayoutDashboard, LogOut, Settings, Shield, Sparkles } from 'lucide-react';
import { AuthProvider, useAuth } from './context/AuthContext';
import Admin from './pages/Admin';
import Billing from './pages/Billing';
import Dashboard from './pages/Dashboard';
import Plans from './pages/Plans';
import SettingsPage from './pages/Settings';
import Tickets from './pages/Tickets';
import Usage from './pages/Usage';

type View = 'dashboard' | 'plans' | 'billing' | 'usage' | 'tickets' | 'settings' | 'admin';

const nav = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'plans', label: 'Plans', icon: Sparkles },
  { id: 'billing', label: 'Billing', icon: CreditCard },
  { id: 'usage', label: 'Usage', icon: BarChart3 },
  { id: 'tickets', label: 'Support', icon: HelpCircle },
  { id: 'settings', label: 'Settings', icon: Settings },
] as const;

function AuthScreen() {
  const { login, register } = useAuth();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [form, setForm] = useState({ email: 'admin@launchpilot.test', password: 'password123', full_name: 'Avery Admin', company_name: 'LaunchPilot' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    setBusy(true);
    try {
      if (mode === 'login') await login(form.email, form.password);
      else await register(form);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Authentication failed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="auth-page">
      <section className="auth-hero">
        <div className="brand-mark"><Gauge size={28} /></div>
        <h1>LaunchPilot</h1>
        <p>Run subscriptions, support, billing, and product usage from one modern SaaS command center.</p>
        <div className="hero-card"><strong>Demo admin</strong><span>admin@launchpilot.test / password123</span></div>
      </section>
      <form className="auth-card" onSubmit={submit}>
        <h2>{mode === 'login' ? 'Welcome back' : 'Create your workspace'}</h2>
        <p className="muted">Secure account access for your SaaS team.</p>
        {mode === 'register' && <><label>Full name<input value={form.full_name} onChange={e => setForm({ ...form, full_name: e.target.value })} required /></label><label>Company<input value={form.company_name} onChange={e => setForm({ ...form, company_name: e.target.value })} required /></label></>}
        <label>Email<input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} required /></label>
        <label>Password<input type="password" value={form.password} minLength={8} onChange={e => setForm({ ...form, password: e.target.value })} required /></label>
        {error && <div className="alert error">{error}</div>}
        <button className="primary" disabled={busy}>{busy ? 'Working...' : mode === 'login' ? 'Sign in' : 'Create account'}</button>
        <button type="button" className="link-button" onClick={() => setMode(mode === 'login' ? 'register' : 'login')}>{mode === 'login' ? 'Need an account? Register' : 'Already registered? Sign in'}</button>
      </form>
    </main>
  );
}

function Shell() {
  const { user, logout } = useAuth();
  const [view, setView] = useState<View>('dashboard');
  const ViewComponent = { dashboard: Dashboard, plans: Plans, billing: Billing, usage: Usage, tickets: Tickets, settings: SettingsPage, admin: Admin }[view];

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="logo"><Gauge /><span>LaunchPilot</span></div>
        <nav>
          {nav.map(item => <button key={item.id} className={view === item.id ? 'active' : ''} onClick={() => setView(item.id as View)}><item.icon size={18} />{item.label}</button>)}
          {user?.role === 'admin' && <button className={view === 'admin' ? 'active' : ''} onClick={() => setView('admin')}><Shield size={18} />Admin</button>}
        </nav>
        <div className="sidebar-footer">
          <div><strong>{user?.full_name}</strong><span>{user?.company_name}</span></div>
          <button className="ghost icon-row" onClick={logout}><LogOut size={16} /> Sign out</button>
        </div>
      </aside>
      <section className="main-panel">
        <header className="topbar"><div><p className="eyebrow">SaaS MVP Console</p><h1>{view[0].toUpperCase() + view.slice(1)}</h1></div><div className="avatar">{user?.full_name.split(' ').map(p => p[0]).join('').slice(0, 2)}</div></header>
        <ViewComponent />
      </section>
    </div>
  );
}

function AppContent() {
  const { user, loading } = useAuth();
  if (loading) return <div className="center-screen"><div className="spinner" />Loading LaunchPilot...</div>;
  return user ? <Shell /> : <AuthScreen />;
}

import { useState } from 'react';

export default function App() {
  return <AuthProvider><AppContent /></AuthProvider>;
}
