-- Run in Supabase > SQL Editor
create table if not exists company_settings (
  id int primary key default 1 check (id = 1),
  name text not null default 'All American Asphalt LLC',
  address text default '1645 Palm Beach Lakes Blvd Suite 1200, West Palm Beach, FL 33401',
  phone text default '',
  email text default '',
  tax_rate numeric default 0,
  payment_terms text default 'Payment due within 30 days of invoice date.',
  logo_url text,
  price_book jsonb
);
insert into company_settings (id) values (1) on conflict do nothing;

create table if not exists documents (
  id uuid primary key default gen_random_uuid(),
  number text not null,
  invoice_number text,
  type text not null check (type in ('estimate','invoice')),
  -- estimate: draft | converted      invoice: ready | pending | paid
  status text not null,
  client_name text not null default '',
  client_email text default '',
  client_phone text default '',
  client_address text default '',
  job_address text default '',
  line_items jsonb not null default '[]',
  resources jsonb not null default '{"labor":[],"teams":[],"equipment":[]}',
  tax_rate numeric not null default 0,
  notes text default '',
  due_date date,
  source_estimate_id uuid references documents(id),
  sent_at timestamptz,
  paid_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists documents_type_status on documents(type, status);

create table if not exists customers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null default '',
  phone text not null default '',
  address text not null default '',
  created_at timestamptz not null default now()
);

alter table company_settings enable row level security;
alter table documents enable row level security;
alter table customers enable row level security;
create policy "auth all settings" on company_settings for all to authenticated using (true) with check (true);
create policy "auth all documents" on documents for all to authenticated using (true) with check (true);
create policy "auth all customers" on customers for all to authenticated using (true) with check (true);

-- Forgot password: only an email already saved on a created user can request a reset.
create or replace function public.member_can_reset(p_email text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.members
    where lower(email) = lower(trim(p_email))
  );
$$;
revoke all on function public.member_can_reset(text) from public;
grant execute on function public.member_can_reset(text) to anon, authenticated;
-- Then: Supabase > Authentication > Users > Add user (your login). Disable public sign-ups.
