# LaunchPilot Backend

FastAPI backend for the LaunchPilot SaaS MVP.

## Stack

- FastAPI
- Pydantic
- psycopg with Postgres
- Bearer-token authentication using signed tokens

## Required environment

Create environment variables in your runtime or copy `/backend/.env.example` for local development only:

- `DATABASE_URL`: Postgres connection string
- `APP_SECRET`: long random secret used to sign session tokens

`python-dotenv` is loaded with `override=False`, so platform-provided preview variables are not overwritten.

## Run

```bash
pip install -r requirements.txt
uvicorn app.main:app --reload
```

The exported FastAPI object is `app` in `backend/app/main.py`.

## API areas

All application routes are mounted under `/api`:

- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/auth/me`
- `GET /api/dashboard`
- `GET /api/plans`
- `GET /api/subscription`
- `POST /api/subscription/change-plan`
- `GET /api/billing`
- `POST /api/billing/invoices/{invoice_id}/pay`
- `GET /api/usage`
- `POST /api/usage/track`
- `GET /api/tickets`
- `POST /api/tickets`
- `PATCH /api/tickets/{ticket_id}`
- `PUT /api/settings`
- `GET /api/admin/summary`

## Seed data

On first startup, the backend creates Starter, Growth, and Scale plans plus a demo admin account:

- Email: `admin@launchpilot.test`
- Password: `password123`
