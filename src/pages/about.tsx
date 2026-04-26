export default function AboutPage() {
  return (
    <main className="min-h-screen bg-[#070A12] text-white">
      <section className="mx-auto max-w-5xl px-6 py-10">
        <nav className="mb-10 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">devcodstore</h1>
            <p className="text-sm text-gray-400">Platform hakkında</p>
          </div>

          <a
            href="/"
            className="rounded-2xl bg-white px-5 py-2 text-sm font-semibold text-black"
          >
            Ana Sayfa
          </a>
        </nav>

        <section className="rounded-3xl border border-white/10 bg-white/5 p-8">
          <h2 className="text-4xl font-bold">devcodstore Nedir?</h2>

          <p className="mt-6 text-lg leading-8 text-gray-300">
            devcodstore; geliştiricilerin hazır web sitesi, admin panel, mobil arayüz,
            frontend paketleri ve yazılım projelerini listeleyip satabileceği modern
            bir kod pazarıdır.
          </p>

          <p className="mt-5 text-lg leading-8 text-gray-300">
            Amacımız; yazılımcıların emek verdiği projeleri güvenli, düzenli ve
            profesyonel bir ortamda alıcılarla buluşturmaktır.
          </p>

          <div className="mt-10 grid gap-6 md:grid-cols-3">
            <div className="rounded-3xl bg-black/30 p-6">
              <h3 className="text-xl font-bold">Geliştirici Odaklı</h3>
              <p className="mt-3 text-sm leading-6 text-gray-400">
                Satıcılar kendi projelerini yükler, fiyatlandırır ve satışlarını takip eder.
              </p>
            </div>

            <div className="rounded-3xl bg-black/30 p-6">
              <h3 className="text-xl font-bold">Alıcı İçin Kolay</h3>
              <p className="mt-3 text-sm leading-6 text-gray-400">
                Kullanıcılar ihtiyaçlarına uygun hazır projeleri arayıp satın alabilir.
              </p>
            </div>

            <div className="rounded-3xl bg-black/30 p-6">
              <h3 className="text-xl font-bold">Güvenli Akış</h3>
              <p className="mt-3 text-sm leading-6 text-gray-400">
                Satın alınan dosyalar kullanıcının hesabına tanımlanır.
              </p>
            </div>
          </div>
        </section>
      </section>
    </main>
  );
}
