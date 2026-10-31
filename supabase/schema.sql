-- CX Copiloto AI — schema mínimo (dados exclusivamente fictícios)
create extension if not exists pgcrypto;

create table if not exists orders (
  id text primary key,
  persona_name text not null,
  status text not null,            -- preparing | out_for_delivery | delivered | cancelled
  restaurant text not null,
  items jsonb not null,            -- [{name, qty, price}]
  total numeric(10,2) not null,
  placed_at timestamptz not null,
  eta timestamptz,
  delivered_at timestamptz,
  payment_charges jsonb not null,  -- [{amount, at}]
  refund_status text not null default 'none' -- none | requested | in_review | approved | paid
);

create table if not exists conversations (
  id uuid primary key default gen_random_uuid(),
  order_id text not null references orders(id),
  status text not null default 'open', -- open | ai_resolved | escalated | closed
  created_at timestamptz not null default now()
);

create table if not exists messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references conversations(id) on delete cascade,
  role text not null check (role in ('customer','ai','agent')),
  content text not null,
  created_at timestamptz not null default now()
);

create table if not exists agent_decisions (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references conversations(id) on delete cascade,
  message_id uuid references messages(id) on delete set null,
  stage text not null check (stage in ('rule','triage','reply','validator')),
  intent text,
  urgency text,
  needs_human boolean,
  confidence numeric,
  reason text,
  kb_ids text[],
  model text,
  latency_ms int,
  created_at timestamptz not null default now()
);

create table if not exists tickets (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references conversations(id) on delete cascade,
  order_id text not null references orders(id),
  priority text not null check (priority in ('critical','high','medium','low')),
  intent text,
  reason text not null,
  summary text not null,
  status text not null default 'open' check (status in ('open','assigned','closed')),
  assignee text,
  resolution_note text,
  created_at timestamptz not null default now(),
  assigned_at timestamptz,
  closed_at timestamptz
);

create table if not exists ticket_events (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null references tickets(id) on delete cascade,
  type text not null,              -- created | assigned | closed | note
  payload jsonb,
  created_at timestamptz not null default now()
);

create table if not exists webhook_log (
  id uuid primary key default gen_random_uuid(),
  event text not null,
  status_code int,
  error text,
  created_at timestamptz not null default now()
);

create index if not exists tickets_status_priority on tickets (status, priority, created_at);
create index if not exists messages_conv on messages (conversation_id, created_at);

-- Acesso apenas pelo servidor (service role). Sem políticas = anon/authenticated bloqueados.
alter table orders enable row level security;
alter table conversations enable row level security;
alter table messages enable row level security;
alter table agent_decisions enable row level security;
alter table tickets enable row level security;
alter table ticket_events enable row level security;
alter table webhook_log enable row level security;

-- Como "Automatically expose new tables" fica desligado, libera acesso só ao servidor (service_role).
grant usage on schema public to service_role;
grant all on all tables in schema public to service_role;
alter default privileges in schema public grant all on tables to service_role;
