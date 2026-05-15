import { MessageSquarePlus } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { api } from '../lib/api';
import type { Ticket } from '../types';

export default function Tickets() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [status, setStatus] = useState('');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Ticket | null>(null);
  const [form, setForm] = useState({ subject: '', category: 'Billing', priority: 'medium', message: '' });

  const load = async () => setTickets(await api.tickets(status ? `?status=${status}` : ''));
  useEffect(() => { load(); }, [status]);

  const filtered = useMemo(() => tickets.filter(ticket => ticket.subject.toLowerCase().includes(search.toLowerCase()) || ticket.message.toLowerCase().includes(search.toLowerCase())), [tickets, search]);

  const create = async (event: React.FormEvent) => {
    event.preventDefault();
    const ticket = await api.createTicket(form);
    setTickets([ticket, ...tickets]);
    setForm({ subject: '', category: 'Billing', priority: 'medium', message: '' });
  };

  return (
    <div className="page-stack">
      <section className="card"><h2><MessageSquarePlus size={20} /> New support ticket</h2><form className="form-grid" onSubmit={create}><label>Subject<input value={form.subject} onChange={e => setForm({ ...form, subject: e.target.value })} required /></label><label>Category<select value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}><option>Billing</option><option>Technical</option><option>Account</option><option>Product feedback</option></select></label><label>Priority<select value={form.priority} onChange={e => setForm({ ...form, priority: e.target.value })}><option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option></select></label><label className="wide">Message<textarea value={form.message} onChange={e => setForm({ ...form, message: e.target.value })} required /></label><button className="primary">Create ticket</button></form></section>
      <section className="card"><div className="toolbar"><input className="search" placeholder="Search tickets" value={search} onChange={e => setSearch(e.target.value)} /><select value={status} onChange={e => setStatus(e.target.value)}><option value="">All statuses</option><option value="open">Open</option><option value="pending">Pending</option><option value="resolved">Resolved</option></select></div><table><thead><tr><th>Subject</th><th>Category</th><th>Priority</th><th>Status</th><th>Updated</th></tr></thead><tbody>{filtered.map(ticket => <tr key={ticket.id} onClick={() => setSelected(ticket)} className="clickable"><td>{ticket.subject}</td><td>{ticket.category}</td><td>{ticket.priority}</td><td><span className="badge">{ticket.status}</span></td><td>{new Date(ticket.updated_at).toLocaleDateString()}</td></tr>)}</tbody></table>{filtered.length === 0 && <p className="empty">No tickets found.</p>}</section>
      {selected && <div className="modal-backdrop" onClick={() => setSelected(null)}><div className="modal" onClick={e => e.stopPropagation()}><h2>{selected.subject}</h2><p className="muted">{selected.category} · {selected.priority} priority · {selected.status}</p><p>{selected.message}</p>{selected.response && <div className="alert success"><strong>Support response:</strong> {selected.response}</div>}<button className="secondary" onClick={() => setSelected(null)}>Close</button></div></div>}
    </div>
  );
}
