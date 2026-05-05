alter table public.products
  add column if not exists rights_owner_type text default 'own_work',
  add column if not exists rights_declaration text,
  add column if not exists official_content_risk text default 'none',
  add column if not exists official_content_note text,
  add column if not exists rights_confirmed_at timestamptz;
