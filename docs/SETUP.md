# Setup

See the root [README.md](../README.md) for the full runbook.

Required: Node 20+, Docker (or any PostgreSQL 16).

```
DATABASE_URL=postgresql://postgres:farm2fork@localhost:5432/farm2fork
JWT_SECRET=change-me
```

Optional integrations (architecture is wired; leave empty until you have credentials):

- `RAZORPAY_KEY_ID` / `RAZORPAY_KEY_SECRET` — test mode from Razorpay dashboard
- `CLOUDFLARE_TURNSTILE_SECRET_KEY` / `VITE_CLOUDFLARE_TURNSTILE_SITE_KEY`
- `OTP_PROVIDER_API_KEY`
- `AI_API_KEY`
- `DATA_GOV_API_KEY`

`DEMO_MODE` defaults on when `NODE_ENV` is not production. Demo market rows stay in the same tables with an explicit source label.
