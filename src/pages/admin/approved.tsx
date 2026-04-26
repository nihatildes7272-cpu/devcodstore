export default function ApprovedPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#070A12] px-6 text-white">
      <section className="w-full max-w-xl rounded-3xl border border-white/10 bg-white/5 p-8 text-center shadow-2xl">
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-green-500/20 text-4xl text-green-300">
          ✓
        </div>

        <h1 className="mt-6 text-4xl font-bold">Proje Onaylandı</h1>

        <p className="mt-4 text-gray-400">
          Satıcının gönderdiği proje başarıyla onaylandı. İleride bu işlem projeyi otomatik olarak ürünler sayfasında yayına alacak.
        </p>

        <div className="mt-8 grid gap-3 sm:grid-cols-2">
          <a
            href="/admin"
            className="rounded-2xl bg-blue-600 px-5 py-3 font-semibold hover:bg-blue-500"
          >
            Admin Panele Dön
          </a>

          <a
            href="/products"
            className="rounded-2xl border border-white/15 px-5 py-3 font-semibold hover:bg-white/10"
          >
            Ürünlere Git
          </a>
        </div>
      </section>
    </main>
  );
}
