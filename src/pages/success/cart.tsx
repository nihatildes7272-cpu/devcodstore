import SiteNavbar from "@/components/SiteNavbar";

export default function CartSuccessPage() {
  return (
    <main className="min-h-screen bg-[#070A12] text-white">
      <section className="mx-auto max-w-7xl px-6 py-10">
        <SiteNavbar />

        <div className="flex min-h-[60vh] items-center justify-center">
          <section className="w-full max-w-xl rounded-3xl border border-white/10 bg-white/5 p-8 text-center shadow-2xl">
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-green-500/20 text-4xl text-green-300">
              ✓
            </div>

            <h1 className="mt-6 text-4xl font-bold">Sepet Siparişi Başarılı</h1>

            <p className="mt-4 text-gray-400">
              Sepetindeki ürünler için sipariş kayıtları oluşturuldu. Satın aldığın ürünlere Dosyalarım sayfasından erişebilirsin.
            </p>

            <div className="mt-8 grid gap-3 sm:grid-cols-2">
              <a
                href="/library"
                className="rounded-2xl bg-blue-600 px-5 py-3 font-semibold hover:bg-blue-500"
              >
                Dosyalarım
              </a>

              <a
                href="/products"
                className="rounded-2xl border border-white/15 px-5 py-3 font-semibold hover:bg-white/10"
              >
                Alışverişe Devam Et
              </a>
            </div>
          </section>
        </div>
      </section>
    </main>
  );
}
