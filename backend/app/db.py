import base64
import hashlib
import hmac
import json
import os
import secrets
from contextlib import contextmanager
from datetime import datetime, timedelta, timezone
from typing import Any, Iterable

from dotenv import load_dotenv
import psycopg
from psycopg.rows import dict_row

load_dotenv(override=False)

DATABASE_URL = os.getenv('DATABASE_URL')
APP_SECRET = os.getenv('APP_SECRET', 'dev-only-change-me')


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


def get_conn():
    if not DATABASE_URL:
        raise RuntimeError('DATABASE_URL is required for LaunchPilot backend')
    return psycopg.connect(DATABASE_URL, row_factory=dict_row)


@contextmanager
def db_cursor(commit: bool = False):
    conn = get_conn()
    try:
        with conn.cursor() as cur:
            yield cur
        if commit:
            conn.commit()
    finally:
        conn.close()


def fetch_one(query: str, params: Iterable[Any] = ()): 
    with db_cursor() as cur:
        cur.execute(query, tuple(params))
        return cur.fetchone()


def fetch_all(query: str, params: Iterable[Any] = ()): 
    with db_cursor() as cur:
        cur.execute(query, tuple(params))
        return cur.fetchall()


def execute(query: str, params: Iterable[Any] = ()): 
    with db_cursor(commit=True) as cur:
        cur.execute(query, tuple(params))
        try:
            return cur.fetchone()
        except psycopg.ProgrammingError:
            return None


def hash_password(password: str) -> str:
    salt = secrets.token_hex(16)
    digest = hashlib.pbkdf2_hmac('sha256', password.encode(), salt.encode(), 120_000).hex()
    return f'{salt}${digest}'


def verify_password(password: str, stored: str) -> bool:
    salt, digest = stored.split('$', 1)
    candidate = hashlib.pbkdf2_hmac('sha256', password.encode(), salt.encode(), 120_000).hex()
    return hmac.compare_digest(candidate, digest)


def create_token(user_id: int) -> str:
    payload = {'sub': user_id, 'exp': int((utcnow() + timedelta(days=7)).timestamp())}
    raw = base64.urlsafe_b64encode(json.dumps(payload).encode()).decode().rstrip('=')
    sig = hmac.new(APP_SECRET.encode(), raw.encode(), hashlib.sha256).hexdigest()
    return f'{raw}.{sig}'


def read_token(token: str) -> int | None:
    try:
        raw, sig = token.split('.', 1)
        expected = hmac.new(APP_SECRET.encode(), raw.encode(), hashlib.sha256).hexdigest()
        if not hmac.compare_digest(sig, expected):
            return None
        padded = raw + '=' * (-len(raw) % 4)
        payload = json.loads(base64.urlsafe_b64decode(padded.encode()).decode())
        if payload.get('exp', 0) < int(utcnow().timestamp()):
            return None
        return int(payload['sub'])
    except Exception:
        return None


def init_db():
    schema = '''
    CREATE TABLE IF NOT EXISTS organizations (id SERIAL PRIMARY KEY, name TEXT NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT now());
    CREATE TABLE IF NOT EXISTS users (id SERIAL PRIMARY KEY, organization_id INTEGER REFERENCES organizations(id), email TEXT UNIQUE NOT NULL, password_hash TEXT NOT NULL, full_name TEXT NOT NULL, role TEXT NOT NULL DEFAULT 'member', job_title TEXT, timezone TEXT NOT NULL DEFAULT 'UTC', notifications_enabled BOOLEAN NOT NULL DEFAULT TRUE, created_at TIMESTAMPTZ NOT NULL DEFAULT now());
    CREATE TABLE IF NOT EXISTS plans (id SERIAL PRIMARY KEY, name TEXT NOT NULL, slug TEXT UNIQUE NOT NULL, price_monthly INTEGER NOT NULL, seats INTEGER NOT NULL, events_limit INTEGER NOT NULL, features JSONB NOT NULL, popular BOOLEAN NOT NULL DEFAULT FALSE);
    CREATE TABLE IF NOT EXISTS subscriptions (id SERIAL PRIMARY KEY, organization_id INTEGER UNIQUE REFERENCES organizations(id), plan_id INTEGER REFERENCES plans(id), status TEXT NOT NULL, seats_used INTEGER NOT NULL DEFAULT 1, current_period_end TIMESTAMPTZ NOT NULL);
    CREATE TABLE IF NOT EXISTS invoices (id SERIAL PRIMARY KEY, organization_id INTEGER REFERENCES organizations(id), number TEXT NOT NULL, amount INTEGER NOT NULL, status TEXT NOT NULL, issued_at TIMESTAMPTZ NOT NULL DEFAULT now(), paid_at TIMESTAMPTZ);
    CREATE TABLE IF NOT EXISTS usage_events (id SERIAL PRIMARY KEY, organization_id INTEGER REFERENCES organizations(id), feature TEXT NOT NULL, quantity INTEGER NOT NULL, source TEXT NOT NULL, occurred_at TIMESTAMPTZ NOT NULL DEFAULT now());
    CREATE TABLE IF NOT EXISTS support_tickets (id SERIAL PRIMARY KEY, organization_id INTEGER REFERENCES organizations(id), user_id INTEGER REFERENCES users(id), subject TEXT NOT NULL, category TEXT NOT NULL, priority TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'open', message TEXT NOT NULL, response TEXT, created_at TIMESTAMPTZ NOT NULL DEFAULT now(), updated_at TIMESTAMPTZ NOT NULL DEFAULT now());
    '''
    with db_cursor(commit=True) as cur:
        cur.execute(schema)
        cur.execute('SELECT COUNT(*) AS count FROM plans')
        if cur.fetchone()['count'] == 0:
            plans = [
                ('Starter', 'starter', 29, 3, 10000, ['Core dashboard', 'Email support', 'Usage tracking'], False),
                ('Growth', 'growth', 99, 10, 100000, ['Advanced analytics', 'Priority support', 'Billing automation', 'Admin panel'], True),
                ('Scale', 'scale', 249, 50, 1000000, ['Dedicated success manager', 'SAML-ready controls', 'Custom limits', 'Premium support'], False),
            ]
            for plan in plans:
                cur.execute('INSERT INTO plans (name, slug, price_monthly, seats, events_limit, features, popular) VALUES (%s,%s,%s,%s,%s,%s,%s)', (*plan[:5], json.dumps(plan[5]), plan[6]))
        cur.execute('SELECT id FROM users WHERE email=%s', ('admin@launchpilot.test',))
        if not cur.fetchone():
            cur.execute('INSERT INTO organizations (name) VALUES (%s) RETURNING id', ('LaunchPilot',))
            org_id = cur.fetchone()['id']
            cur.execute('SELECT id FROM plans WHERE slug=%s', ('growth',))
            plan_id = cur.fetchone()['id']
            cur.execute('INSERT INTO users (organization_id,email,password_hash,full_name,role,job_title) VALUES (%s,%s,%s,%s,%s,%s)', (org_id, 'admin@launchpilot.test', hash_password('password123'), 'Avery Admin', 'admin', 'Founder'))
            cur.execute('INSERT INTO subscriptions (organization_id, plan_id, status, seats_used, current_period_end) VALUES (%s,%s,%s,%s,%s)', (org_id, plan_id, 'active', 4, utcnow() + timedelta(days=23)))
            for i, amount in enumerate([99, 99, 99], start=1):
                cur.execute('INSERT INTO invoices (organization_id, number, amount, status, issued_at, paid_at) VALUES (%s,%s,%s,%s,%s,%s)', (org_id, f'INV-2024-00{i}', amount, 'paid' if i < 3 else 'open', utcnow() - timedelta(days=30 * (3 - i)), utcnow() - timedelta(days=30 * (3 - i) - 1) if i < 3 else None))
            usage = [('API Calls', 5400, 'Production API'), ('Reports', 320, 'Analytics worker'), ('Automations', 1200, 'Workflow engine'), ('API Calls', 870, 'Staging API')]
            for row in usage:
                cur.execute('INSERT INTO usage_events (organization_id, feature, quantity, source) VALUES (%s,%s,%s,%s)', (org_id, *row))
            cur.execute('SELECT id FROM users WHERE email=%s', ('admin@launchpilot.test',))
            user_id = cur.fetchone()['id']
            cur.execute('INSERT INTO support_tickets (organization_id,user_id,subject,category,priority,status,message) VALUES (%s,%s,%s,%s,%s,%s,%s)', (org_id, user_id, 'Question about Growth plan invoice', 'Billing', 'medium', 'open', 'Can you confirm whether the latest invoice includes the seat change?'))
