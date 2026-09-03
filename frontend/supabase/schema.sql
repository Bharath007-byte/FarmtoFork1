-- Farm2Fork SIH canonical schema (Supabase PostgreSQL)
-- Apply in SQL Editor when connecting a project. RLS policies must be added per role.

create table if not exists users (
  id uuid primary key default gen_random_uuid(),
  role text not null check (role in ('farmer','consumer','logistics','admin')),
  name text not null,
  email text unique,
  phone text,
  language text default 'en',
  verification_status text default 'pending',
  created_at timestamptz default now()
);

create table if not exists farmers (
  id text primary key,
  user_id uuid references users(id),
  verification_status text,
  region text,
  trust_score int,
  profile jsonb
);

create table if not exists farms (
  id text primary key,
  farmer_id text references farmers(id),
  location text,
  lat double precision,
  lng double precision,
  area numeric,
  soil_type text,
  irrigation_type text
);

create table if not exists crops (
  id uuid primary key default gen_random_uuid(),
  farm_id text references farms(id),
  crop_type text,
  variety text,
  season text,
  planted_date date,
  status text
);

create table if not exists harvests (
  id uuid primary key default gen_random_uuid(),
  crop_id uuid references crops(id),
  quantity numeric,
  harvest_date date,
  quality_status text,
  batch_code text
);

create table if not exists products (
  id text primary key,
  harvest_id uuid references harvests(id),
  farmer_id text,
  name text,
  category text,
  price numeric,
  quantity numeric,
  unit text,
  availability boolean
);

create table if not exists orders (
  id text primary key,
  consumer_id uuid references users(id),
  status text,
  total numeric,
  payment_status text,
  created_at timestamptz default now()
);

create table if not exists order_items (
  id uuid primary key default gen_random_uuid(),
  order_id text references orders(id),
  product_id text,
  quantity numeric,
  unit_price numeric
);

create table if not exists vehicles (
  id text primary key,
  driver_id text,
  vehicle_type text,
  cold_chain_enabled boolean
);

create table if not exists logistics (
  id uuid primary key default gen_random_uuid(),
  order_id text,
  vehicle_id text references vehicles(id),
  route text,
  status text,
  eta timestamptz
);

create table if not exists temperature_logs (
  id uuid primary key default gen_random_uuid(),
  vehicle_id text references vehicles(id),
  recorded_at timestamptz default now(),
  temperature numeric,
  threshold_status text
);

create table if not exists reviews (
  id uuid primary key default gen_random_uuid(),
  product_id text,
  consumer_id uuid,
  rating int,
  review text
);

create table if not exists payments (
  id uuid primary key default gen_random_uuid(),
  order_id text,
  amount numeric,
  provider_reference text,
  status text
);

create table if not exists notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid,
  type text,
  title text,
  message text,
  read_status boolean default false
);

create table if not exists market_prices (
  id uuid primary key default gen_random_uuid(),
  crop text,
  market text,
  day date,
  price numeric,
  unit text
);

create table if not exists weather_data (
  id uuid primary key default gen_random_uuid(),
  location text,
  observed_at timestamptz,
  temperature numeric,
  rainfall numeric,
  humidity numeric,
  forecast jsonb
);

create table if not exists ai_predictions (
  id uuid primary key default gen_random_uuid(),
  ref_type text,
  ref_id text,
  prediction_type text,
  value jsonb,
  confidence numeric,
  created_at timestamptz default now()
);

create table if not exists disease_detections (
  id uuid primary key default gen_random_uuid(),
  crop_id text,
  image_reference text,
  disease text,
  confidence numeric,
  recommendations text
);

create table if not exists demand_forecasts (
  id uuid primary key default gen_random_uuid(),
  product text,
  region text,
  forecast_date date,
  demand_value numeric,
  confidence numeric
);

create table if not exists waste_risk (
  id uuid primary key default gen_random_uuid(),
  product_id text,
  risk_score numeric,
  reason text,
  recommended_action text
);

create table if not exists traceability_events (
  id text primary key,
  listing_id text,
  event_type text,
  occurred_at timestamptz,
  location text,
  metadata jsonb
);
