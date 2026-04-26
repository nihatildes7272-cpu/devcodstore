import { useRouter } from "next/router";

const files = [
  {
    id: "1",
    title: "Modern E-Ticaret Sitesi",
    fileName: "modern-eticaret-paketi.zip",
    size: "42 MB",
  },
  {
    id: "2",
    title: "Admin Panel Paketi",
    fileName: "admin-panel-paketi.zip",
    size: "18 MB",
  },
];

export default function DownloadPage() {
  const router = useRouter();
  const { id } = router.query;

  const file = files.find((item) => item.id === id);

  if (!router.isReady) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#070A12] text-white">
        Yükleniyor...
      </main>
    );
  }

  if (!file) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#070A12] text-white">
        <div className="text-center">
          <h1 className="text-3xl font-bold">Dosya bulunamadı</h1>
          <a
            href="/library"
            className="mt-6 inline-block rounded-2xl bg-white px-5 py-3 text-black"
          >
            Dosyalarıma dön
          </a>
        </div>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#070A12] px-6 text-white">
      <section className="w-full max-w-xl rounded-3xl border border-white/10 bg-white/5 p-8 shadow-2xl">
        <div className="text-center">
          <h1 className="text-4xl font-bold">Dosya İndirme</h1>
          <p className="mt-3 text-gray-400">
            Satın aldığın proje dosyasını buradan indirebilirsin.
          </p>
        </div>

        <div className="mt-8 rounded-3xl bg-black/30 p-6">
          <p className="text-sm text-gray-400">Ürün</p>
          <h2 className="mt-2 text-2xl font-bold">{file.title}</h2>

          <div className="mt-6 grid gap-4">
            <div className="flex items-center justify-between rounded-2xl border border-white/10 p-4">
              <span className="text-gray-400">Dosya adı</span>
              <span className="font-semibold">{file.fileName}</span>
            </div>

            <div className="flex items-center justify-between rounded-2xl border border-white/10 p-4">
              <span className="text-gray-400">Boyut</span>
              <span className="font-semibold">{file.size}</span>
            </div>
          </div>
        </div>

        <button className="mt-8 w-full rounded-2xl bg-blue-600 px-6 py-4 font-semibold hover:bg-blue-500">
          ZIP Dosyasını İndir
        </button>

        <p className="mt-4 text-center text-sm text-gray-500">
          Şimdilik tasarım ekranı. İleride gerçek dosya indirme sistemi bağlanacak.
        </p>

        <div className="mt-6 text-center">
          <a href="/library" className="text-sm text-gray-400 hover:text-white">
            Dosyalarıma dön
          </a>
        </div>
      </section>
    </main>
  );
}
