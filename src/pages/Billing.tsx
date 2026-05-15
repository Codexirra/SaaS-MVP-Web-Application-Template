import { CreditCard, ReceiptText } from 'lucide-react';
import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import type { Invoice, Subscription } from '../types';

export default function Billing() {
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [status, setStatus] = useState('');

  const load = async () => {
    const data = await api.billing();
    setSubscription(data.subscription);
    setInvoices(data.invoices);
  };

  useEffect(() => { load(); }, []);

  const pay = async (id: number) => {
    setStatus('Processing payment through the simulated billing provider...');
    try {
      const paid = await api.payInvoice(id);
      setInvoices(items => items.map(item => item.id === id ? paid : item));
      setStatus('Payment captured and invoice marked paid.');
    } catch (err) {
      setStatus(err instanceof Error ? err.message : 'Payment failed');
    }
  };

  return (
    <div className="page-stack">
      {subscription && <section className="card"><div className="split"><div><h2>Billing overview</h2><p className="muted">{subscription.plan_name} · {subscription.status} · Renewal {new Date(subscription.current_period_end).toLocaleDateString()}</p></div><CreditCard /></div><div className="form-grid"><label>Card on file<input value="Visa ending in 4242" readOnly /></label><label>Billing email<input value="billing@company.example" readOnly /></label></div></section>}
      {status && <div className="alert success">{status}</div>}
      <section className="card"><h2><ReceiptText size={20} /> Invoices</h2><table><thead><tr><th>Number</th><th>Issued</th><th>Amount</th><th>Status</th><th></th></tr></thead><tbody>{invoices.map(invoice => <tr key={invoice.id}><td>{invoice.number}</td><td>{new Date(invoice.issued_at).toLocaleDateString()}</td><td>${invoice.amount}</td><td><span className={`badge ${invoice.status === 'paid' ? 'success' : 'warning'}`}>{invoice.status}</span></td><td>{invoice.status !== 'paid' && <button className="secondary" onClick={() => pay(invoice.id)}>Pay now</button>}</td></tr>)}</tbody></table></section>
    </div>
  );
}
