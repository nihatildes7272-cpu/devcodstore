export default function ContactPage() {
  return (
    <main className="min-h-screen bg-[#070A12] text-white">
      <section className="mx-auto max-w-5xl px-6 py-10">
        <nav className="mb-10 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">devcodstore</h1>
            <p className="text-sm text-gray-400">İletişim ve destek</p>
          </div>

          <a
            href="/"
            className="rounded-2xl bg-white px-5 py-2 text-sm font-semibold text-black"
          >
            Ana Sayfa
          </a>
        </nav>

        <section className="grid gap-8 md:grid-cols-[1fr_360px]">
          <div className="rounded-3xl border border-white/10 bg-white/5 p-8">
            <h2 className="text-4xl font-bold">Bize Ulaş</h2>
            <p className="mt-4 text-gray-400">
              Satıcı başvurusu, proje inceleme, satın alma ve teknik destek için bizimle iletişime geçebilirsin.
            </p>

            <div className="mt-8 grid gap-4">
              <input
                placeholder="Ad Soyad"
                className="rounded-2xl border border-white/10 bg-black/30 px-4 py-3 outline-none"
              />

              <input
                placeholder="E-posta"
                className="rounded-2xl border border-white/10 bg-black/30 px-4 py-3 outline-none"
              />

              <select className="rounded-2xl border border-white/10 bg-black/30 px-4 py-3 outline-none">
                <option>Destek konusu seç</option>
                <option>Satıcı başvurusu</option>
                <option>Satın alma desteği</option>
                <option>Proje inceleme</option>
                <option>Teknik destek</option>
              </select>

              <textarea
                placeholder="Mesajın"
                className="min-h-36 rounded-2xl border border-white/10 bg-black/30 px-4 py-3 outline-none"
              />

              <button className="rounded-2xl bg-blue-600 px-5 py-3 font-semibold hover:bg-blue-500">
                Mesaj Gönder
              </button>
            </div>
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/5 p-8">
            <h3 className="text-2xl font-bold">Destek Bilgileri</h3>

            <div className="mt-6 grid gap-4">
              <div className="rounded-2xl bg-black/30 p-5">
                <p className="text-sm text-gray-400">E-posta</p>
                <p className="mt-2 font-semibold">support@devcodstore.com</p>
              </div>

              <div className="rounded-2xl bg-black/30 p-5">
                <p className="text-sm text-gray-400">Yanıt Süresi</p>
                <p className="mt-2 font-semibold">24 saat içinde</p>
              </div>

              <div className="rounded-2xl bg-black/30 p-5">
                <p className="text-sm text-gray-400">Platform</p>
                <p className="mt-2 font-semibold">Kod ve proje pazarı</p>
              </div>
            </div>
          </div>
        </section>
      </section>
    </main>
  );
}
