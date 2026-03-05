-- ============================================
-- SplitViaje — Schema completo para Supabase
-- ============================================
-- Ejecutar en: Supabase Dashboard → SQL Editor → New Query → Pegar todo → Run

-- 1. TABLAS
-- ============================================

-- Grupos de viaje
create table groups (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  destination text not null default '',
  start_date date,
  end_date date,
  invite_code text unique not null,
  created_at timestamptz default now()
);

-- Índice para buscar grupo por código de invitación rápidamente
create index idx_groups_invite_code on groups (invite_code);

-- Miembros de cada grupo
create table members (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references groups (id) on delete cascade,
  name text not null,
  avatar_color text not null default '#2563eb',
  created_at timestamptz default now(),
  unique (group_id, name)
);

create index idx_members_group_id on members (group_id);

-- Gastos
create table expenses (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references groups (id) on delete cascade,
  description text not null,
  amount integer not null, -- en centavos (ej: $1500 = 150000)
  paid_by uuid not null references members (id) on delete cascade,
  category text not null default 'otro'
    check (category in ('comida', 'super', 'nafta', 'alquiler', 'salida', 'otro')),
  created_at timestamptz default now()
);

create index idx_expenses_group_id on expenses (group_id);
create index idx_expenses_paid_by on expenses (paid_by);

-- División de cada gasto entre miembros
create table expense_splits (
  id uuid primary key default gen_random_uuid(),
  expense_id uuid not null references expenses (id) on delete cascade,
  member_id uuid not null references members (id) on delete cascade,
  amount integer not null -- en centavos
);

create index idx_expense_splits_expense_id on expense_splits (expense_id);
create index idx_expense_splits_member_id on expense_splits (member_id);

-- 2. ROW LEVEL SECURITY — Todo público (sin auth)
-- ============================================

alter table groups enable row level security;
alter table members enable row level security;
alter table expenses enable row level security;
alter table expense_splits enable row level security;

-- groups
create policy "groups_select" on groups for select using (true);
create policy "groups_insert" on groups for insert with check (true);
create policy "groups_update" on groups for update using (true);
create policy "groups_delete" on groups for delete using (true);

-- members
create policy "members_select" on members for select using (true);
create policy "members_insert" on members for insert with check (true);
create policy "members_update" on members for update using (true);
create policy "members_delete" on members for delete using (true);

-- expenses
create policy "expenses_select" on expenses for select using (true);
create policy "expenses_insert" on expenses for insert with check (true);
create policy "expenses_update" on expenses for update using (true);
create policy "expenses_delete" on expenses for delete using (true);

-- expense_splits
create policy "expense_splits_select" on expense_splits for select using (true);
create policy "expense_splits_insert" on expense_splits for insert with check (true);
create policy "expense_splits_update" on expense_splits for update using (true);
create policy "expense_splits_delete" on expense_splits for delete using (true);

-- 3. REALTIME
-- ============================================
-- Habilitar realtime en las tablas que necesitan actualizaciones en vivo

alter publication supabase_realtime add table expenses;
alter publication supabase_realtime add table expense_splits;
alter publication supabase_realtime add table members;
