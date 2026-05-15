import { Activity } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { api } from '../lib/api';
import type { UsageEvent, UsageSummary } from '../types';

export default function Usage() {
  const [events, setEvents] = useState<UsageEvent[]>([]);
  const [summary, setSummary] = useState<UsageSummary[]>([]);
  const [feature, setFeature] = useState('');
  const [form, setForm] = useState({ feature: 'API Calls', quantity: 25, source: 'Manual QA' });

  const load = async () => {
    const query = feature ? `?feature=${encodeURIComponent(feature)}` : '';
    const data = await api.usage(query);
    setEvents(data.events);
    setSummary(data.summary);
  };

  useEffect(() => { load(); }, [feature]);

  const total = useMemo(() => summary.reduce((sum, item) => sum + item.total, 0), [summary]);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    await api.trackUsage(form);
    await load();
  };

  return (
    <div className="page-stack">
      <section className="grid cards-3">{summary.map(item => <div className="metric-card" key={item.feature}><Activity /><span>{item.feature}</span><strong>{item.total.toLocaleString()}</strong><small>{total ? Math.round((item.total / total) * 100) : 0}% of tracked usage</small></div>)}</section>
      <section className="card"><h2>Track product usage</h2><form className="form-grid" onSubmit={submit}><label>Feature<input value={form.feature} onChange={e => setForm({ ...form, feature: e.target.value })} required /></label><label>Quantity<input type="number" min="1" value={form.quantity} onChange={e => setForm({ ...form, quantity: Number(e.target.value) })} required /></label><label>Source<input value={form.source} onChange={e => setForm({ ...form, source: e.target.value })} required /></label><button className="primary">Record usage</button></form></section>
      <section className="card"><div className="split"><h2>Usage events</h2><input className="search" placeholder="Filter by feature" value={feature} onChange={e => setFeature(e.target.value)} /></div><table><thead><tr><th>Feature</th><th>Quantity</th><th>Source</th><th>Occurred</th></tr></thead><tbody>{events.map(event => <tr key={event.id}><td>{event.feature}</td><td>{event.quantity}</td><td>{event.source}</td><td>{new Date(event.occurred_at).toLocaleString()}</td></tr>)}</tbody></table>{events.length === 0 && <p className="empty">No usage events match this filter.</p>}</section>
    </div>
  );
}
