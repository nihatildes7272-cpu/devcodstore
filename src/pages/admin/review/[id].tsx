import { useRouter } from "next/router";

const projects = [
  {
    id: "1",
    title: "Modern E-Ticaret Sitesi",
    seller: "NCS Studio",
    category: "Web Site",
    price: "₺1.499",
    status: "Onay Bekliyor",
    description:
      "Hazır yönetim paneli, ürün listeleme, sepet yapısı ve modern arayüz içeren e-ticaret web sitesi paketi.",
  },
  {
    id: "2",
    title: "Portfolio Scripti",
    seller: "DevCraft",
    category: "Frontend",
    price: "₺499",
    status: "İnceleniyor",
    description:
      "Yazılımcılar ve freelancerlar için hazırlanmış kişisel portfolio sistemi.",
  },
];

export default function AdminReviewPage() {
  const router = useRouter();
  const { id } = router.query;

  const project = projects.find((item) => item.id === id);

  if (!router.isReady) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#070A12] text-white">
        Yükleniyor...
      </main>
    );
  }

  if (!project) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#070A12] text-white">
        <div className="text-center">
          <h1 className="text-3xl font-bold">Proje bulunamadı</h1>
          <a
            href="/admin"
            className="mt-6 inline-block rounded-2xl bg-white px-5 py-3 text-black"
          >
            Admin panele dön
          </a>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#070A12] text-white">
      <section className="mx-auto max-w-6xl px-6 py-10">
        <nav className="mb-10 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Admin İnceleme</h1>
            <p className="text-sm text-gray-400">Satıcı projesini kontrol et</p>
          </div>

          <a
            href="/admin"
            className="rounded-2xl bg-white px-5 py-2 text-sm font-semibold text-black"
          >
            Admin Panele Dön
          </a>
        </nav>

        <section className="grid gap-8 md:grid-cols-[1fr_360px]">
          <div className="rounded-3xl border border-white/10 bg-white/5 p-8">
            <span className="rounded-full bg-yellow-500/20 px-4 py-2 text-sm text-yellow-300">
              {project.status}
            </span>

            <h2 className="mt-6 text-4xl font-bold">{project.title}</h2>

            <div className="mt-6 grid gap-4">
              <div className="rounded-2xl bg-black/30 p-5">
                <p className="text-sm text-gray-400">Satıcı</p>
                <p className="mt-2 text-xl font-bold">{project.seller}</p>
              </div>

              <div className="rounded-2xl bg-black/30 p-5">
                <p className="text-sm text-gray-400">Kategori</p>
                <p className="mt-2 text-xl font-bold">{project.category}</p>
              </div>

              <div className="rounded-2xl bg-black/30 p-5">
                <p className="text-sm text-gray-400">Fiyat</p>
                <p className="mt-2 text-xl font-bold">{project.price}</p>
              </div>
            </div>

            <div className="mt-6 rounded-2xl bg-black/30 p-5">
              <p className="text-sm text-gray-400">Açıklama</p>
              <p className="mt-3 leading-7 text-gray-300">{project.description}</p>
            </div>
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/5 p-8">
            <h3 className="text-2xl font-bold">Admin Kararı</h3>
            <p className="mt-2 text-sm text-gray-400">
              Şimdilik tasarım akışı. İleride bu butonlar veritabanındaki proje durumunu değiştirecek.
            </p>

            <div className="mt-6 grid gap-3">
              <a
                href="/admin/approved"
                className="rounded-2xl bg-green-600 px-5 py-4 text-center font-semibold hover:bg-green-500"
              >
                Projeyi Onayla
              </a>

              <a
                href="/admin/rejected"
                className="rounded-2xl bg-red-600 px-5 py-4 text-center font-semibold hover:bg-red-500"
              >
                Projeyi Reddet
              </a>

              <a
                href="/admin"
                className="rounded-2xl border border-white/15 px-5 py-4 text-center font-semibold hover:bg-white/10"
              >
                Daha Sonra İncele
              </a>
            </div>
          </div>
        </section>
      </section>
    </main>
  );
}
