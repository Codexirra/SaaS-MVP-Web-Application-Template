import { AlertCircle, ArrowUpRight, CheckCircle2, Clock, Users } from 'lucide-react';
import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import type { DashboardData } from '../types';

export default function Dashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api.dashboard().then(setData).catch(err => setError(err.message));
  }, []);

  if (error) return <div className="alert error">{error}</div>;
  if (!data) return <div className="grid"><div className="card skeleton" /><div className="card skeleton" /><div className="card skeleton" /></div>;

  const usagePercent = Math.min(100, Math.round((data.usage_this_month / data.usage_limit) * 100));

  return (
    <div className="page-stack">
      <section className="grid cards-4">
        <div className="metric-card"><Users /><span>Active users</span><strong>{data.active_users}</strong><small>Team members in workspace</small></div>
        <div className="metric-card"><ArrowUpRight /><span>MRR</span><strong>${data.mrr.toLocaleString()}</strong><small>Current subscription revenue</small></div>
        <div className="metric-card"><AlertCircle /><span>Open tickets</span><strong>{data.open_tickets}</strong><small>Awaiting support action</small></div>
        <div className="metric-card"><CheckCircle2 /><span>Usage</span><strong>{usagePercent}%</strong><small>{data.usage_this_month.toLocaleString()} / {data.usage_limit.toLocaleString()} events</small></div>
      </section>
      <section className="card highlight">
        <div className="split"><div><h2>{data.subscription.plan_name} plan</h2><p className="muted">Subscription {data.subscription.status}. Renews {new Date(data.subscription.current_period_end).toLocaleDateString()}.</p></div><span className="badge success">Healthy</span></div>
        <div className="progress"><div style={{ width: `${usagePercent}%` }} /></div>
      </section>
      <section className="two-col">
        <div className="card"><h2>Recent usage</h2><table><thead><tr><th>Feature</th><th>Qty</th><th>Source</th><th>Time</th></tr></thead><tbody>{data.recent_usage.map(event => <tr key={event.id}><td>{event.feature}</td><td>{event.quantity}</td><td>{event.source}</td><td>{new Date(event.occurred_at).toLocaleString()}</td></tr>)}</tbody></table></div>
        <div className="card"><h2>Support queue</h2>{data.recent_tickets.length === 0 ? <p className="empty">No recent tickets.</p> : data.recent_tickets.map(ticket => <div className="list-row" key={ticket.id}><Clock size={16} /><div><strong>{ticket.subject}</strong><span>{ticket.priority} · {ticket.status}</span></div></div>)}</div>
      </section>
    </div>
  );
}
