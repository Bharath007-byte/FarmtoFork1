# Farm2Fork — SIH runbook

## What exists today
Vite + React marketplace with harvest catalog, localStorage auth (SHA-256), farmer/consumer/logistics/admin roles, OSM live location, and SIH desks (FarmAI, digital twin, command center, fleet, waste, map, traceability).

## Data store
**Current source of truth:** browser `localStorage` (`f2f-accounts`, `f2f-session`, `f2f-cart`, `f2f-sih-db`). There is **no live Supabase project** in this repo yet. `frontend/supabase/schema.sql` is the canonical table layout to paste into Supabase SQL Editor when you create one.

**Images:** marketplace photos are Unsplash URLs in the harvest catalog. Crop scans in FarmAI stay as data URLs on the device (not uploaded).

## AI services
All adapters live in `frontend/src/ai/engine.ts`. **No cloud model key is required.** Outputs are heuristics labeled `AI Prediction` / `Estimated` / `Simulated`. Optional later: point the same functions at an Edge Function without changing UI.

## Demo logins (seeded on first page load)
| Role | Email | Password |
| --- | --- | --- |
| Farmer | farmer@farm2fork.demo | FarmDemo@123 |
| Consumer | consumer@farm2fork.demo | ShopDemo@123 |
| Logistics | logistics@farm2fork.demo | FleetDemo@123 |
| Admin | admin@farm2fork.demo | AdminDemo@123 |

## Run
```bash
cd frontend
npm install
npm test
npm run dev
```
Open the URL Vite prints (often http://localhost:5189/ if 5173 is busy).

## Seed / reset demo ops data
In DevTools: `localStorage.removeItem('f2f-sih-db')` then reload.

## Live vs simulated
| Surface | Origin |
| --- | --- |
| OSM map tiles, device GPS, Notification API, speech (Chrome/Safari) | Live |
| Harvest prices/catalog | Listed catalog (not a government feed) |
| Farm pins, vehicles, temperature, traces, waste leftover, 7-day price path | Simulated / AI Prediction |
| Checkout | Creates a local order; no payment provider |

## SIH demo path
Home → farmer login → Digital twin → FarmAI photo → Advisory/price → Shop → product trace → cart order → logistics jobs (cold alert on V-13) → admin command center → map → waste desk.

## Future hardware
Telematics, mandi APIs, weather APIs, and Supabase Auth/Storage. Put only `VITE_SUPABASE_ANON_KEY` in the client. Never ship `service_role`.
