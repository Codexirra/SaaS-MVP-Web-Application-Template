import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../lib/api';

export default function SettingsPage() {
  const { user, refreshUser } = useAuth();
  const [form, setForm] = useState({ full_name: '', company_name: '', job_title: '', timezone: 'UTC', notifications_enabled: true });
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (user) setForm({ full_name: user.full_name, company_name: user.company_name, job_title: user.job_title || '', timezone: user.timezone, notifications_enabled: user.notifications_enabled });
  }, [user]);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    await api.updateSettings(form);
    await refreshUser();
    setMessage('Settings saved successfully.');
  };

  return (
    <div className="page-stack">
      {message && <div className="alert success">{message}</div>}
      <section className="card"><h2>Workspace settings</h2><form className="form-grid" onSubmit={submit}><label>Full name<input value={form.full_name} onChange={e => setForm({ ...form, full_name: e.target.value })} required /></label><label>Company<input value={form.company_name} onChange={e => setForm({ ...form, company_name: e.target.value })} required /></label><label>Job title<input value={form.job_title} onChange={e => setForm({ ...form, job_title: e.target.value })} /></label><label>Timezone<select value={form.timezone} onChange={e => setForm({ ...form, timezone: e.target.value })}><option>UTC</option><option>America/New_York</option><option>America/Los_Angeles</option><option>Europe/London</option></select></label><label className="checkbox"><input type="checkbox" checked={form.notifications_enabled} onChange={e => setForm({ ...form, notifications_enabled: e.target.checked })} /> Email product and billing notifications</label><button className="primary">Save settings</button></form></section>
    </div>
  );
}
