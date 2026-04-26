export default function SellerSuccessPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#070A12] px-6 text-white">
      <section className="w-full max-w-xl rounded-3xl border border-white/10 bg-white/5 p-8 text-center shadow-2xl">
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-blue-500/20 text-4xl text-blue-300">
          ✓
        </div>

        <h1 className="mt-6 text-4xl font-bold">Proje Gönderildi</h1>

        <p className="mt-4 text-gray-400">
          Projen admin onayına gönderildi. Onaylandıktan sonra devcodstore ürünler
          sayfasında yayınlanacak.
        </p>

        <div className="mt-8 rounded-2xl bg-black/30 p-5 text-left">
          <p className="text-sm text-gray-400">Durum</p>
          <h2 className="mt-2 text-2xl font-bold text-yellow-300">Onay Bekliyor</h2>
          <p className="mt-3 text-sm leading-6 text-gray-400">
            İleride burada gerçek veritabanı ve dosya yükleme sistemi olacak.
            Şimdilik akış tasarımını kuruyoruz.
          </p>
        </div>

        <div className="mt-8 grid gap-3 sm:grid-cols-2">
          <a
            href="/seller"
            className="rounded-2xl bg-blue-600 px-5 py-3 font-semibold hover:bg-blue-500"
          >
            Satıcı Paneline Dön
          </a>

          <a
            href="/admin"
            className="rounded-2xl border border-white/15 px-5 py-3 font-semibold hover:bg-white/10"
          >
            Admin Panel
          </a>
        </div>
      </section>
    </main>
  );
}
