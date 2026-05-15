from datetime import timedelta
from typing import Optional

from fastapi import Depends, FastAPI, Header, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field, field_validator

from .db import create_token, execute, fetch_all, fetch_one, hash_password, init_db, read_token, utcnow, verify_password

app = FastAPI(title='LaunchPilot SaaS API')
app.add_middleware(CORSMiddleware, allow_origins=['*'], allow_credentials=True, allow_methods=['*'], allow_headers=['*'])


@app.on_event('startup')
def startup():
    init_db()


def normalize_email(value: str) -> str:
    email = value.strip().lower()
    if '@' not in email or email.startswith('@') or email.endswith('@'):
        raise ValueError('Enter a valid email address')
    return email


class RegisterIn(BaseModel):
    email: str = Field(min_length=3, max_length=254)
    password: str = Field(min_length=8)
    full_name: str = Field(min_length=2)
    company_name: str = Field(min_length=2)

    @field_validator('email')
    @classmethod
    def validate_email(cls, value: str) -> str:
        return normalize_email(value)


class LoginIn(BaseModel):
    email: str = Field(min_length=3, max_length=254)
    password: str

    @field_validator('email')
    @classmethod
    def validate_email(cls, value: str) -> str:
        return normalize_email(value)


class PlanChangeIn(BaseModel):
    plan_id: int


class SettingsIn(BaseModel):
    full_name: str
    company_name: str
    job_title: Optional[str] = None
    timezone: str = 'UTC'
    notifications_enabled: bool = True


class UsageIn(BaseModel):
    feature: str
    quantity: int = Field(gt=0)
    source: str


class TicketIn(BaseModel):
    subject: str
    category: str
    priority: str
    message: str


class TicketUpdateIn(BaseModel):
    status: Optional[str] = None
    response: Optional[str] = None


def serialize(row):
    if row is None:
        return None
    return dict(row)


def current_user(authorization: str = Header(default='')):
    if not authorization.startswith('Bearer '):
        raise HTTPException(status_code=401, detail='Missing bearer token')
    user_id = read_token(authorization.replace('Bearer ', '', 1))
    if not user_id:
        raise HTTPException(status_code=401, detail='Invalid or expired token')
    user = fetch_one('''SELECT u.*, o.name AS company_name FROM users u JOIN organizations o ON o.id=u.organization_id WHERE u.id=%s''', (user_id,))
    if not user:
        raise HTTPException(status_code=401, detail='User not found')
    return user


def require_admin(user=Depends(current_user)):
    if user['role'] != 'admin':
        raise HTTPException(status_code=403, detail='Administrator access required')
    return user


def user_out(user):
    return {
        'id': user['id'], 'email': user['email'], 'full_name': user['full_name'], 'role': user['role'],
        'company_name': user['company_name'], 'job_title': user.get('job_title'), 'timezone': user['timezone'],
        'notifications_enabled': user['notifications_enabled'], 'created_at': user['created_at'].isoformat(),
    }


@app.post('/api/auth/register')
def register(payload: RegisterIn):
    existing = fetch_one('SELECT id FROM users WHERE email=%s', (payload.email.lower(),))
    if existing:
        raise HTTPException(status_code=409, detail='Email is already registered')
    org = execute('INSERT INTO organizations (name) VALUES (%s) RETURNING id', (payload.company_name,))
    plan = fetch_one('SELECT id FROM plans WHERE slug=%s', ('starter',))
    user = execute('''INSERT INTO users (organization_id,email,password_hash,full_name,role) VALUES (%s,%s,%s,%s,%s) RETURNING *''', (org['id'], payload.email.lower(), hash_password(payload.password), payload.full_name, 'admin'))
    execute('INSERT INTO subscriptions (organization_id,plan_id,status,seats_used,current_period_end) VALUES (%s,%s,%s,%s,%s)', (org['id'], plan['id'], 'trialing', 1, utcnow() + timedelta(days=14)))
    execute('INSERT INTO invoices (organization_id,number,amount,status) VALUES (%s,%s,%s,%s)', (org['id'], f'INV-TRIAL-{org["id"]}', 0, 'paid'))
    full_user = fetch_one('SELECT u.*, o.name AS company_name FROM users u JOIN organizations o ON o.id=u.organization_id WHERE u.id=%s', (user['id'],))
    return {'token': create_token(user['id']), 'user': user_out(full_user)}


@app.post('/api/auth/login')
def login(payload: LoginIn):
    user = fetch_one('SELECT u.*, o.name AS company_name FROM users u JOIN organizations o ON o.id=u.organization_id WHERE u.email=%s', (payload.email.lower(),))
    if not user or not verify_password(payload.password, user['password_hash']):
        raise HTTPException(status_code=401, detail='Invalid email or password')
    return {'token': create_token(user['id']), 'user': user_out(user)}


@app.get('/api/auth/me')
def me(user=Depends(current_user)):
    return user_out(user)


@app.get('/api/plans')
def plans():
    return fetch_all('SELECT * FROM plans ORDER BY price_monthly')


def subscription_for(org_id: int):
    sub = fetch_one('''SELECT s.*, p.name AS plan_name FROM subscriptions s JOIN plans p ON p.id=s.plan_id WHERE s.organization_id=%s''', (org_id,))
    if not sub:
        raise HTTPException(status_code=404, detail='Subscription not found')
    sub['current_period_end'] = sub['current_period_end'].isoformat()
    return sub


@app.get('/api/subscription')
def get_subscription(user=Depends(current_user)):
    return subscription_for(user['organization_id'])


@app.post('/api/subscription/change-plan')
def change_plan(payload: PlanChangeIn, user=Depends(current_user)):
    plan = fetch_one('SELECT * FROM plans WHERE id=%s', (payload.plan_id,))
    if not plan:
        raise HTTPException(status_code=404, detail='Plan not found')
    execute('UPDATE subscriptions SET plan_id=%s, status=%s, current_period_end=%s WHERE organization_id=%s', (payload.plan_id, 'active', utcnow() + timedelta(days=30), user['organization_id']))
    execute('INSERT INTO invoices (organization_id,number,amount,status) VALUES (%s,%s,%s,%s)', (user['organization_id'], f'INV-PLAN-{int(utcnow().timestamp())}', plan['price_monthly'], 'open'))
    return subscription_for(user['organization_id'])


@app.get('/api/dashboard')
def dashboard(user=Depends(current_user)):
    sub = subscription_for(user['organization_id'])
    plan = fetch_one('SELECT * FROM plans WHERE id=%s', (sub['plan_id'],))
    open_tickets = fetch_one("SELECT COUNT(*) AS count FROM support_tickets WHERE organization_id=%s AND status!='resolved'", (user['organization_id'],))['count']
    usage = fetch_one("SELECT COALESCE(SUM(quantity),0) AS total FROM usage_events WHERE organization_id=%s AND occurred_at >= date_trunc('month', now())", (user['organization_id'],))['total']
    recent_usage = fetch_all('SELECT * FROM usage_events WHERE organization_id=%s ORDER BY occurred_at DESC LIMIT 5', (user['organization_id'],))
    recent_tickets = fetch_all('SELECT * FROM support_tickets WHERE organization_id=%s ORDER BY updated_at DESC LIMIT 5', (user['organization_id'],))
    return {'active_users': sub['seats_used'], 'mrr': plan['price_monthly'], 'open_tickets': open_tickets, 'usage_this_month': usage, 'usage_limit': plan['events_limit'], 'subscription': sub, 'recent_usage': recent_usage, 'recent_tickets': recent_tickets}


@app.get('/api/billing')
def billing(user=Depends(current_user)):
    invoices = fetch_all('SELECT * FROM invoices WHERE organization_id=%s ORDER BY issued_at DESC', (user['organization_id'],))
    return {'subscription': subscription_for(user['organization_id']), 'invoices': invoices}


@app.post('/api/billing/invoices/{invoice_id}/pay')
def pay_invoice(invoice_id: int, user=Depends(current_user)):
    invoice = execute("UPDATE invoices SET status='paid', paid_at=now() WHERE id=%s AND organization_id=%s RETURNING *", (invoice_id, user['organization_id']))
    if not invoice:
        raise HTTPException(status_code=404, detail='Invoice not found')
    return invoice


@app.get('/api/usage')
def usage(feature: str = Query(default=''), user=Depends(current_user)):
    like = f'%{feature}%'
    events = fetch_all('SELECT * FROM usage_events WHERE organization_id=%s AND feature ILIKE %s ORDER BY occurred_at DESC LIMIT 100', (user['organization_id'], like))
    summary = fetch_all('SELECT feature, SUM(quantity)::int AS total FROM usage_events WHERE organization_id=%s GROUP BY feature ORDER BY total DESC', (user['organization_id'],))
    return {'events': events, 'summary': summary}


@app.post('/api/usage/track')
def track_usage(payload: UsageIn, user=Depends(current_user)):
    return execute('INSERT INTO usage_events (organization_id,feature,quantity,source) VALUES (%s,%s,%s,%s) RETURNING *', (user['organization_id'], payload.feature, payload.quantity, payload.source))


@app.get('/api/tickets')
def tickets(status: str = Query(default=''), user=Depends(current_user)):
    if status:
        return fetch_all('SELECT * FROM support_tickets WHERE organization_id=%s AND status=%s ORDER BY updated_at DESC', (user['organization_id'], status))
    return fetch_all('SELECT * FROM support_tickets WHERE organization_id=%s ORDER BY updated_at DESC', (user['organization_id'],))


@app.post('/api/tickets')
def create_ticket(payload: TicketIn, user=Depends(current_user)):
    return execute('''INSERT INTO support_tickets (organization_id,user_id,subject,category,priority,message) VALUES (%s,%s,%s,%s,%s,%s) RETURNING *''', (user['organization_id'], user['id'], payload.subject, payload.category, payload.priority, payload.message))


@app.patch('/api/tickets/{ticket_id}')
def update_ticket(ticket_id: int, payload: TicketUpdateIn, user=Depends(current_user)):
    ticket = fetch_one('SELECT * FROM support_tickets WHERE id=%s', (ticket_id,))
    if not ticket:
        raise HTTPException(status_code=404, detail='Ticket not found')
    if user['role'] != 'admin' and ticket['organization_id'] != user['organization_id']:
        raise HTTPException(status_code=403, detail='Cannot update this ticket')
    return execute('UPDATE support_tickets SET status=COALESCE(%s,status), response=COALESCE(%s,response), updated_at=now() WHERE id=%s RETURNING *', (payload.status, payload.response, ticket_id))


@app.put('/api/settings')
def settings(payload: SettingsIn, user=Depends(current_user)):
    execute('UPDATE organizations SET name=%s WHERE id=%s', (payload.company_name, user['organization_id']))
    updated = execute('UPDATE users SET full_name=%s, job_title=%s, timezone=%s, notifications_enabled=%s WHERE id=%s RETURNING *', (payload.full_name, payload.job_title, payload.timezone, payload.notifications_enabled, user['id']))
    updated['company_name'] = payload.company_name
    return user_out(updated)


@app.get('/api/admin/summary')
def admin_summary(user=Depends(require_admin)):
    users = fetch_all('SELECT u.*, o.name AS company_name FROM users u JOIN organizations o ON o.id=u.organization_id ORDER BY u.created_at DESC LIMIT 100')
    tickets = fetch_all('SELECT * FROM support_tickets ORDER BY updated_at DESC LIMIT 25')
    usage_by_org = fetch_all('SELECT o.name AS company_name, COALESCE(SUM(ue.quantity),0)::int AS total FROM organizations o LEFT JOIN usage_events ue ON ue.organization_id=o.id GROUP BY o.name ORDER BY total DESC')
    total_users = fetch_one('SELECT COUNT(*) AS count FROM users')['count']
    open_tickets = fetch_one("SELECT COUNT(*) AS count FROM support_tickets WHERE status!='resolved'")['count']
    monthly_revenue = fetch_one('SELECT COALESCE(SUM(p.price_monthly),0)::int AS total FROM subscriptions s JOIN plans p ON p.id=s.plan_id WHERE s.status IN (%s,%s)', ('active', 'trialing'))['total']
    total_usage = fetch_one('SELECT COALESCE(SUM(quantity),0)::int AS total FROM usage_events')['total']
    return {'users': [user_out(row) for row in users], 'tickets': tickets, 'usage_by_org': usage_by_org, 'metrics': {'total_users': total_users, 'open_tickets': open_tickets, 'monthly_revenue': monthly_revenue, 'total_usage': total_usage}}
