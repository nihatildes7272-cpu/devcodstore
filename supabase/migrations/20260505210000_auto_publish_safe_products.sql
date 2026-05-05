update public.products
set
  status = 'Yayında',
  auto_publish_decision = true,
  auto_publish_reason = coalesce(
    auto_publish_reason,
    'Güvenli tarama sonucu mevcut olduğu için otomatik yayına alındı.'
  ),
  auto_published_at = coalesce(auto_published_at, now())
where
  security_status = 'Güvenli'
  and status in ('Onay Bekliyor', 'pending_scan')
  and file_path is not null;
