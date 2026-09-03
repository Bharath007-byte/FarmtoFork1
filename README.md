# Farm2Fork

Direct farmer-to-consumer marketplace. The UI keeps the existing cream/sage Farm2Fork identity. Dynamic numbers (earnings, orders, inventory, market prices) come from PostgreSQL via the Express API — not hardcoded ₹12,000 tiles.

## Run locally

1. **Install dependencies**

```bash
cd server && npm install
cd ../frontend && npm install
```

2. **Configure environment**

Copy `.env.example` to `server/.env` and `frontend/.env` (optional). Never put `RAZORPAY_KEY_SECRET` or `CLOUDFLARE_TURNSTILE_SECRET_KEY` in frontend files.

3. **Start PostgreSQL**

```bash
docker compose up -d db
# or, if Postgres is installed with Homebrew:
# brew services start postgresql@16
```

4. **Migrate + seed (development data only)**

```bash
cd server
npx prisma db push
npm run db:seed
```

Seed users have **zero products and zero orders**. Dashboard earnings start at **₹0**. Tomato price history is labeled **Demo Market Dataset**, not live government data.

5. **Start backend** (port 8787)

```bash
cd server && npm run dev
```

6. **Start frontend** (Vite proxies `/api` to 8787)

```bash
cd frontend && npm run dev
```

7. **Cloudflare Turnstile** — set `CLOUDFLARE_TURNSTILE_SECRET_KEY` and `VITE_CLOUDFLARE_TURNSTILE_SITE_KEY`. In development, if the secret is unset, server verification is skipped (not production).

8. **Razorpay** — use official test keys in `RAZORPAY_KEY_ID` / `RAZORPAY_KEY_SECRET`. Checkout still verifies HMAC on the server. Without keys, `/api/payments/create` returns 503 (no fake success button).

9. **OTP** — set `OTP_PROVIDER_API_KEY` (Fast2SMS). If unset, codes are printed on the **server console** only.

10. **AI** — price range is OLS on stored `PriceHistory` (`AI_API_KEY` optional for later LLM copy). Insufficient points → exact message: insufficient historical data.

11. **Government market ingest** — set `DATA_GOV_API_KEY` then `POST /api/market-prices/ingest` as admin. Otherwise the UI must show Demo Market Dataset.

12. **Judge demo**

- Farmer `farmer@farm2fork.demo` / `FarmDemo@123` → dashboard ₹0.
- Add produce (Sell Produce).
- Consumer `consumer@farm2fork.demo` / `ShopDemo@123` → shop → cart → checkout (Razorpay test or COD OTP from server log).
- Farmer dashboard updates (Socket.IO events).
- Market / AI pages read stored history.
- Logistics: pick date + non-full slot.
- Collaborations: second farmer `farmer2@farm2fork.demo` / `FarmDemo@123` in the same district.

## Tests

```bash
cd server && npm test
cd frontend && npm run build
```
