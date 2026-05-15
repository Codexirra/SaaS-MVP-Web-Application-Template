import { Check } from 'lucide-react';
import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import type { Plan, Subscription } from '../types';

export default function Plans() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [busyPlan, setBusyPlan] = useState<number | null>(null);
  const [message, setMessage] = useState('');

  const load = async () => {
    const [planData, subData] = await Promise.all([api.plans(), api.subscription()]);
    setPlans(planData);
    setSubscription(subData);
  };

  useEffect(() => { load(); }, []);

  const changePlan = async (planId: number) => {
    setBusyPlan(planId);
    setMessage('');
    try {
      const updated = await api.changePlan(planId);
      setSubscription(updated);
      setMessage(`Subscription changed to ${updated.plan_name}. A prorated invoice was added to billing.`);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Could not change plan');
    } finally {
      setBusyPlan(null);
    }
  };

  return (
    <div className="page-stack">
      {message && <div className="alert success">{message}</div>}
      <div className="pricing-grid">
        {plans.map(plan => {
          const current = subscription?.plan_id === plan.id;
          return <article key={plan.id} className={`plan-card ${plan.popular ? 'popular' : ''}`}><div className="split"><h2>{plan.name}</h2>{plan.popular && <span className="badge">Popular</span>}</div><p className="price">${plan.price_monthly}<span>/mo</span></p><p className="muted">{plan.seats} seats · {plan.events_limit.toLocaleString()} tracked events</p><ul>{plan.features.map(feature => <li key={feature}><Check size={16} />{feature}</li>)}</ul><button className={current ? 'secondary' : 'primary'} disabled={current || busyPlan === plan.id} onClick={() => changePlan(plan.id)}>{current ? 'Current plan' : busyPlan === plan.id ? 'Updating...' : 'Choose plan'}</button></article>;
        })}
      </div>
    </div>
  );
}
