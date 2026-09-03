# API documentation

Base URL: same origin in Vite (proxy) or `http://localhost:8787`.

Auth: `Authorization: Bearer <JWT>` from `POST /api/auth/login` or `register`.

## Auth

| Method | Path | Notes |
| --- | --- | --- |
| POST | `/api/auth/register` | Farmer requires farmName, district, state, pinCode. Passwords hashed (bcrypt). Turnstile when configured. |
| POST | `/api/auth/login` | |
| GET | `/api/auth/me` | Session validation |
| POST | `/api/auth/forgot-password` | Issues hashed OTP; does not return the code |
| POST | `/api/auth/reset-password` | `{ otpId, code, password }` |

## Farmers

| GET | `/api/farmers/me` | Profile + photo URL |
| PUT | `/api/farmers/me` | |
| POST | `/api/farmers/me/photo` | multipart `photo` |
| GET | `/api/farmers/me/stats` | Earnings from order lines (₹0 if none) |
| GET | `/api/farmers/me/earnings` | |
| GET | `/api/farmers/me/inventory` | |
| GET | `/api/farmers/nearby` | Same district |

## Products

| GET | `/api/products` | Query `q`, `category`, `organic`, `sort` |
| GET | `/api/products/categories` | |
| GET | `/api/products/mine` | Farmer only |
| GET | `/api/products/:id` | |
| POST | `/api/products` | Farmer multipart |
| PUT | `/api/products/:id` | Owner only (403 otherwise) |
| POST | `/api/products/:id/deactivate` | |

## Commerce

| GET/POST | `/api/cart` | Inventory checked; qty ≤ 0 deletes line |
| POST | `/api/orders` | Transactional stock decrement; `ONLINE` or `COD` |
| POST | `/api/orders/:id/cod-verify` | |
| GET | `/api/orders` | Role-scoped |
| POST | `/api/orders/:id/status` | Farmer/logistics/admin |
| POST | `/api/payments/create` | Razorpay order (503 if keys missing) |
| POST | `/api/payments/verify` | HMAC signature required |
| POST | `/api/payments/webhook` | Signature header |
| GET/POST | `/api/addresses` | |
| POST | `/api/reviews` | After DELIVERED |

## Market & AI

| GET | `/api/market-prices` | Includes disclaimer |
| GET | `/api/market-prices/history` | |
| GET | `/api/market-prices/prediction` | OLS; refuses n < 7 |
| GET | `/api/ai/price-prediction` | 307 → prediction |
| POST | `/api/market-prices/ingest` | Admin + DATA_GOV_API_KEY |
| POST | `/api/market-prices/alerts` | Farmer |

## Ops

| GET | `/api/logistics/slots?date=` | `available` false when full |
| POST | `/api/logistics/book` | Capacity transaction |
| GET | `/api/logistics/bookings` | |
| POST | `/api/logistics/bookings/:id/cancel` | Frees capacity |
| POST/GET | `/api/collaborations` | |
| POST | `/api/collaborations/:id/respond` | |
| GET | `/api/notifications` | |

## Health / admin

| GET | `/api/health` | `{ server, database, marketData }` from real checks |
| GET | `/api/admin/overview` | ADMIN |

Errors: 401, 403, 404, 409, 422, 500 with `{ error, code }`.
