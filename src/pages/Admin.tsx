import { ShieldCheck } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { api } from '../lib/api';
import type { AdminSummary, Ticket } from '../types';

export default function Admin() {
  const [data, setData] = useState<AdminSummary | null>(null);
  const [query, setQuery] = useState('');
  const [response, setResponse] = useState('Thanks for reaching out. Our team reviewed this and updated your workspace.');

  const load = async () => setData(await api.admin());
  useEffect(() => { load().catch(() => setData(null)); }, []);

  const users = useMemo(() => data?.users.filter(user => `${user.email} ${user.company_name}`.toLowerCase().includes(query.toLowerCase())) || [], [data, query]);

  const resolve = async (ticket: Ticket) => {
    await api.updateTicket(ticket.id, { status: 'resolved', response });
    await load();
  };

  if (!data) return <div className="alert error">Admin access is available to workspace administrators.</div>;

  return (
    <div className="page-stack">
      <section className="grid cards-4"><div className="metric-card"><ShieldCheck /><span>Total users</span><strong>{data.metrics.total_users}</strong></div><div className="metric-card"><ShieldCheck /><span>Open tickets</span><strong>{data.metrics.open_tickets}</strong></div><div className="metric-card"><ShieldCheck /><span>Revenue</span><strong>${data.metrics.monthly_revenue}</strong></div><div className="metric-card"><ShieldCheck /><span>Total usage</span><strong>{data.metrics.total_usage}</strong></div></section>
      <section className="card"><div className="split"><h2>User management</h2><input className="search" placeholder="Search users or companies" value={query} onChange={e => setQuery(e.target.value)} /></div><table><thead><tr><th>Name</th><th>Email</th><th>Company</th><th>Role</th><th>Joined</th></tr></thead><tbody>{users.map(user => <tr key={user.id}><td>{user.full_name}</td><td>{user.email}</td><td>{user.company_name}</td><td><span className="badge">{user.role}</span></td><td>{new Date(user.created_at).toLocaleDateString()}</td></tr>)}</tbody></table></section>
      <section className="two-col"><div className="card"><h2>Usage by organization</h2>{data.usage_by_org.map(row => <div className="list-row" key={row.company_name}><strong>{row.company_name}</strong><span>{row.total.toLocaleString()} events</span></div>)}</div><div className="card"><h2>Support operations</h2><textarea value={response} onChange={e => setResponse(e.target.value)} />{data.tickets.map(ticket => <div className="list-row" key={ticket.id}><div><strong>{ticket.subject}</strong><span>{ticket.status} · {ticket.priority}</span></div>{ticket.status !== 'resolved' && <button className="secondary" onClick={() => resolve(ticket)}>Resolve</button>}</div>)}</div></section>
    </div>
  );
}
