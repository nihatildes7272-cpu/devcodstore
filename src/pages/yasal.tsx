import SiteNavbar from "@/components/SiteNavbar";

const pages = [
  {
    title: "Gizlilik Politikası",
    href: "/gizlilik-politikasi",
    description: "Kullanıcı verilerinin nasıl işlendiğini ve korunduğunu açıklar.",
  },
  {
    title: "Kullanım Şartları",
    href: "/kullanim-sartlari",
    description: "Platform kullanım kuralları, kullanıcı ve satıcı sorumlulukları.",
  },
  {
    title: "İade Politikası",
    href: "/iade-politikasi",
    description: "Dijital ürünlerde iade ve destek süreçlerinin genel çerçevesi.",
  },
  {
    title: "Satıcı Kuralları",
    href: "/satici-kurallari",
    description: "Satıcıların ürün yükleme, açıklama, dosya ve içerik kuralları.",
  },
];

export default function LegalPage() {
  return (
    <main className="min-h-screen bg-[#070A12] text-white">
      <section className="mx-auto max-w-6xl px-6 py-10">
        <SiteNavbar />

        <section className="rounded-3xl border border-white/10 bg-white/5 p-8">
          <h1 className="text-4xl font-bold">Yasal ve Kurumsal Bilgiler</h1>
          <p className="mt-4 max-w-3xl leading-7 text-gray-400">
            devcodstore platformunun kullanım, gizlilik, iade ve satıcı kuralları
            bu bölümde yer alır. Bu metinler ödeme sistemi açılmadan önce
            profesyonel olarak gözden geçirilmelidir.
          </p>

          <div className="mt-8 grid gap-5 md:grid-cols-2">
            {pages.map((page) => (
              <a
                key={page.href}
                href={page.href}
                className="rounded-3xl border border-white/10 bg-black/30 p-6 transition hover:border-blue-500/40 hover:bg-white/10"
              >
                <h2 className="text-2xl font-bold">{page.title}</h2>
                <p className="mt-3 leading-6 text-gray-400">{page.description}</p>
              </a>
            ))}
          </div>
        </section>
      </section>
    </main>
  );
}
