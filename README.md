# Devcodstore

DevCodStore, Supabase tabanlı dijital ürün mağazası ve tarama/indirme altyapısı içeren bir Next.js projesidir.

## Başlarken

1. Bağımlılıkları yükleyin:

```bash
npm install
```

2. Ortam değişkenlerini ayarlayın:

- `.env.local` dosyası oluşturun
- `.env.example` dosyasını referans alın

3. Geliştirme sunucusunu başlatın:

```bash
npm run dev
```

4. Tarayıcıda açın:

[http://localhost:3000](http://localhost:3000)

## Kullanılan önemli komutlar

- `npm run dev` - geliştirme sunucusunu çalıştırır
- `npm run build` - üretim için derler
- `npm run start` - derlenen uygulamayı başlatır
- `npm run lint` - ESLint kontrolü yapar
- `npm run lint:fix` - ESLint hatalarını otomatik düzeltmeye çalışır

## Ortam Değişkenleri

Aşağıdaki değerler Supabase bağlantısı ve sunucu tarafı işlemler için gereklidir:

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
CRON_SECRET=
```

`NEXT_PUBLIC_*` olarak başlayan anahtarlar istemci tarafı kodda kullanılırken, `SUPABASE_SERVICE_ROLE_KEY` ve `CRON_SECRET` sunucu tarafında güvenli şekilde saklanmalıdır.

## Scanner Worker

`scanner-worker/worker.js` dosyası Supabase depolama ve tarama işleri için bağımsız bir worker süreç olarak çalışabilir. Worker çalıştırmak için:

```bash
cd scanner-worker
npm install
npm run start
```

## Notlar

- Bu proje Next.js `pages` ve `app` dizinlerini birlikte kullanıyor.
- `src/lib/supabase.ts` ve `src/lib/supabaseAdmin.ts` dosyaları Supabase istemci yapılandırmasını yönetir.
- `.env.example` dosyası projenin `.env.local` ortam ayarları için rehber sağlar.
