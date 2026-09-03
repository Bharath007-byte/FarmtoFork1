# Data architecture

```
Browser (React / Vite)
    → HTTP JSON + Socket.IO
Express API (`server/`, default :8787)
    → Prisma
PostgreSQL (`farm2fork` database)
```

## Where records live

| Concern | Tables |
| --- | --- |
| Farmer / consumer profiles | `User`, `FarmerProfile` |
| Products & stock | `Product`, `ProductCategory`, `Inventory`, `ProductPriceLog` |
| Cart / checkout | `CartItem`, `Address`, `Order`, `OrderItem` |
| Payments | `Payment` (Razorpay ids + signature after verify) |
| Logistics | `DeliverySlot`, `LogisticsBooking` |
| Collaboration | `FarmerCollaboration` |
| OTP / password reset | `OtpVerification` (hashed code), `PasswordReset` |
| Notifications / alerts | `Notification`, `PriceAlert` |
| Market & AI | `MarketPrice`, `PriceHistory`, `AIPricePrediction` |
| Reviews | `Review` |

## Inspect during development

```bash
cd server
npx prisma studio
# or
psql postgresql://postgres:farm2fork@localhost:5432/farm2fork
```

Docker: `docker compose up -d db` (see repo `docker-compose.yml`).

## Demo vs live market rows

`source` and `liveFeed` are stored on every market row. Seed rows use `Demo Market Dataset` and `liveFeed=false`. Agmarknet ingest (when `DATA_GOV_API_KEY` works) stores `data.gov.in Agmarknet` and `liveFeed=true`. The UI must not say “Live” unless `liveFeed` is true.
