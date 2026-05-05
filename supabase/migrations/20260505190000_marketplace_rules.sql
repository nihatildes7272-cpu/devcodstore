alter table public.orders
  add column if not exists gross_amount numeric(12, 2),
  add column if not exists commission_rate numeric(5, 2) default 20,
  add column if not exists commission_amount numeric(12, 2),
  add column if not exists seller_net_amount numeric(12, 2),
  add column if not exists download_limit integer default 5;

create index if not exists product_download_logs_order_id_idx
  on public.product_download_logs(order_id);

create index if not exists product_download_logs_user_product_order_idx
  on public.product_download_logs(user_id, product_id, order_id);
