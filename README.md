# SaaS MVP Web Application

A complete SaaS MVP web application built with **Codexirra**, using a React, Vite, TypeScript frontend, a FastAPI backend, and Postgres database.

This template was generated with [Codexirra](https://codexirra.com), an AI development workspace for building real web applications. Codexirra helps you generate, edit, preview, debug, and refine full-stack web apps from simple prompts.

> Want to build your own SaaS MVP, CRM, dashboard, portal, or admin app?  
> Try Codexirra: [https://codexirra.com](https://codexirra.com)

---

## Built with Codexirra

This project is an example of what can be created using Codexirra.

Codexirra can help generate complete web applications with:

- Frontend pages and components
- Backend API routes
- Database-aware app logic
- Clean SaaS-style UI layouts
- Authentication flows
- Forms, tables, dashboards, filters, and detail pages
- Full project structure
- Editable code and live preview

This SaaS MVP web application is designed as a practical starter template for building subscription-based products with user accounts, billing, admin operations, support tickets, settings, and product usage tracking.

---

## What this app does

This is a complete SaaS MVP web application with user accounts, a protected dashboard, subscription plans, billing, settings, admin operations, support tickets, and product usage tracking.

It uses a modern sidebar SaaS UI with dashboard cards, tables, forms, filters, search, modals, and responsive layouts.

---

## Tech stack

- React
- Vite
- TypeScript
- Python
- FastAPI
- Postgres

---

## Features

- User registration, login, bearer-token sessions, and protected app shell
- Modern sidebar SaaS UI
- Dashboard cards, tables, forms, filters, search, modals, and responsive layout
- Dashboard metrics for MRR, active users, open tickets, subscription health, and monthly usage
- Subscription plan comparison and plan switching
- Billing area with invoices and simulated payment capture
- Product usage summary
- Usage event table with filtering
- Manual usage tracking
- Support ticket creation, filtering, search, and detail view
- Account and workspace settings
- Admin panel with users, revenue, usage by organization, and ticket resolution
- Postgres-backed FastAPI API under `/api/...`
- Database schema initialization
- Seeded plans, demo admin account, invoices, usage events, and sample support ticket
## Frontend

```bash
npm install
npm run dev
```

The frontend API helper normalizes `VITE_API_URL` or `VITE_API_BASE_URL` so calls always target a base ending in `/api`. If no environment variable is set, it uses same-origin `/api` for preview compatibility.

For optional local proxying, set `VITE_API_PROXY_TARGET` before running Vite. No localhost proxy target is hardcoded.

## Backend

```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload
```

Set `DATABASE_URL` to a Postgres connection string before starting the backend. The backend initializes the schema and seeds plans, a demo admin account, invoices, usage events, and a ticket on startup.

Demo admin credentials:

- Email: `admin@launchpilot.test`
- Password: `password123`

## Database

The backend uses `DATABASE_URL` and Postgres-compatible SQL. See `/backend/.env.example` for required environment variables. Do not commit real `.env` secrets.
