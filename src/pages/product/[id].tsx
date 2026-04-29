import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { supabase } from "@/lib/supabase";
import SiteNavbar from "@/components/SiteNavbar";

type Product = {
  id: string;
  title: string;
  category: string;
  price: string;
  seller: string;
  seller_id: string | null;
  status: string;
  description: string | null;
  file_path: string | null;
  created_at?: string;
};

export default function ProductDetailPage() {
  const router = useRouter();
  const { id } = router.query;

  const [product, setProduct] = useState<Product | null>(null);
  const [relatedProducts, setRelatedProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  useEffect(() => {
    async function loadProduct() {
      if (!router.isReady || !id) return;

      setLoading(true);
      setMessage("");

      const { data, error } = await supabase
        .from("products")
        .select("*")
        .eq("id", String(id))
        .single();

      if (error || !data) {
        setMessage("Ürün bilgisi yüklenirken hata oluştu.");
        setProduct(null);
        setLoading(false);
        return;
      }

      setProduct(data);

      const { data: relatedData } = await supabase
        .from("products")
        .select("*")
        .eq("status", "Yayında")
        .eq("category", data.category)
        .neq("id", data.id)
        .limit(3);

      setRelatedProducts(relatedData || []);
      setLoading(false);
    }

    loadProduct();
  }, [router.isReady, id]);

  function addToCart(productId: string) {
    try {
      const rawCart = localStorage.getItem("devcodstore_cart");
      const cartItems = rawCart ? JSON.parse(rawCart) : [];

      const safeCartItems = Array.isArray(cartItems) ? cartItems : [];

      if (!safeCartItems.includes(productId)) {
        safeCartItems.push(productId);
      }

      localStorage.setItem("devcodstore_cart", JSON.stringify(safeCartItems));
      window.dispatchEvent(new Event("devcodstore-cart-updated"));
      router.push("/cart");
    } catch {
      alert("Sepete eklenirken hata oluştu.");
    }
  }

  function formatDate(date?: string) {
    if (!date) return "Tarih yok";

    return new Date(date).toLocaleDateString("tr-TR", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    });
  }

  function fileName(path: string | null) {
    if (!path) return "ZIP dosyası yok";
    return path.split("/").pop() || "proje-dosyasi.zip";
  }

  function statusClass(status: string) {
    if (status === "Yayında") {
      return "rounded-full bg-green-500/20 px-4 py-2 text-sm text-green-300";
    }

    if (status === "Onay Bekliyor") {
      return "rounded-full bg-yellow-500/20 px-4 py-2 text-sm text-yellow-300";
    }

    if (status === "Reddedildi") {
      return "rounded-full bg-red-500/20 px-4 py-2 text-sm text-red-300";
    }

    return "rounded-full bg-gray-500/20 px-4 py-2 text-sm text-gray-300";
  }

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#070A12] text-white">
        Ürün yükleniyor...
      </main>
    );
  }

  if (message || !product) {
    return (
      <main className="min-h-screen bg-[#070A12] text-white">
        <section className="mx-auto max-w-7xl px-6 py-10">
          <SiteNavbar />

          <div className="flex min-h-[60vh] items-center justify-center">
            <section className="w-full max-w-xl rounded-3xl border border-red-500/20 bg-red-500/10 p-8 text-center">
              <h1 className="text-3xl font-bold">Ürün bulunamadı</h1>
              <p className="mt-4 text-red-200">
                {message || "Bu ürün veritabanında bulunamadı."}
              </p>

              <a
                href="/products"
                className="mt-8 inline-block rounded-2xl bg-white px-5 py-3 font-semibold text-black"
              >
                Ürünlere Dön
              </a>
            </section>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#070A12] text-white">
      <section className="mx-auto max-w-7xl px-6 py-10">
        <SiteNavbar />

        <section className="mb-8 rounded-3xl border border-white/10 bg-white/5 p-6">
          <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
            <div>
              <div className="flex flex-wrap gap-3">
                <span className="rounded-full bg-blue-500/20 px-4 py-2 text-sm text-blue-300">
                  {product.category}
                </span>

                <span className={statusClass(product.status)}>
                  {product.status}
                </span>
              </div>

              <h1 className="mt-6 max-w-4xl text-4xl font-bold leading-tight md:text-5xl">
                {product.title}
              </h1>

              <p className="mt-4 text-gray-400">
                Satıcı: <span className="font-semibold text-white">{product.seller}</span>
              </p>
            </div>

            <div className="rounded-3xl border border-white/10 bg-black/30 p-6 md:min-w-72">
              <p className="text-sm text-gray-400">Fiyat</p>
              <h2 className="mt-2 text-5xl font-bold">{product.price}</h2>

              <p className="mt-4 text-sm leading-6 text-gray-400">
                Satın alma sonrası ürün “Dosyalarım” sayfana tanımlanır.
              </p>
            </div>
          </div>
        </section>

        <section className="grid gap-8 lg:grid-cols-[1fr_380px]">
          <div className="grid gap-8">
            <div className="rounded-3xl border border-white/10 bg-white/5 p-8">
              <h2 className="text-2xl font-bold">Ürün Açıklaması</h2>

              <p className="mt-5 leading-8 text-gray-300">
                {product.description || "Bu ürün için henüz açıklama eklenmemiş."}
              </p>
            </div>

            <div className="rounded-3xl border border-white/10 bg-white/5 p-8">
              <h2 className="text-2xl font-bold">Ürün Bilgileri</h2>

              <div className="mt-6 grid gap-4 md:grid-cols-2">
                <div className="rounded-2xl bg-black/30 p-5">
                  <p className="text-sm text-gray-400">Ürün No</p>
                  <p className="mt-2 break-all font-bold">#{product.id}</p>
                </div>

                <div className="rounded-2xl bg-black/30 p-5">
                  <p className="text-sm text-gray-400">Kategori</p>
                  <p className="mt-2 font-bold">{product.category}</p>
                </div>

                <div className="rounded-2xl bg-black/30 p-5">
                  <p className="text-sm text-gray-400">Yayın Durumu</p>
                  <p className="mt-2 font-bold">{product.status}</p>
                </div>

                <div className="rounded-2xl bg-black/30 p-5">
                  <p className="text-sm text-gray-400">Eklenme Tarihi</p>
                  <p className="mt-2 font-bold">{formatDate(product.created_at)}</p>
                </div>

                <div className="rounded-2xl bg-black/30 p-5 md:col-span-2">
                  <p className="text-sm text-gray-400">Dosya Durumu</p>
                  <p className="mt-2 break-all font-bold">
                    {product.file_path ? "ZIP dosyası hazır" : "Henüz ZIP dosyası yok"}
                  </p>
                  <p className="mt-2 text-sm text-gray-500">
                    {fileName(product.file_path)}
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-3xl border border-white/10 bg-white/5 p-8">
              <h2 className="text-2xl font-bold">Satın Alma Güvencesi</h2>

              <div className="mt-6 grid gap-4 md:grid-cols-3">
                <div className="rounded-2xl bg-black/30 p-5">
                  <h3 className="font-bold text-green-300">Erişim Kontrolü</h3>
                  <p className="mt-2 text-sm leading-6 text-gray-400">
                    Dosya indirme sadece satın alan kullanıcıya açılır.
                  </p>
                </div>

                <div className="rounded-2xl bg-black/30 p-5">
                  <h3 className="font-bold text-blue-300">Admin Onayı</h3>
                  <p className="mt-2 text-sm leading-6 text-gray-400">
                    Yayındaki ürünler admin kontrolünden geçer.
                  </p>
                </div>

                <div className="rounded-2xl bg-black/30 p-5">
                  <h3 className="font-bold text-purple-300">Dijital Teslimat</h3>
                  <p className="mt-2 text-sm leading-6 text-gray-400">
                    Satın alma sonrası Dosyalarım bölümünden erişim sağlanır.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <aside className="h-fit rounded-3xl border border-white/10 bg-white/5 p-8">
            <p className="text-sm text-gray-400">Toplam Tutar</p>
            <h3 className="mt-3 text-5xl font-bold">{product.price}</h3>

            <div className="mt-6 rounded-2xl bg-black/30 p-5">
              <p className="text-sm text-gray-400">Satıcı</p>
              <p className="mt-2 font-bold">{product.seller}</p>

              <p className="mt-4 text-sm text-gray-400">Dosya</p>
              <p className={product.file_path ? "mt-2 font-bold text-green-300" : "mt-2 font-bold text-yellow-300"}>
                {product.file_path ? "Hazır" : "Bekleniyor"}
              </p>
            </div>

            <div className="mt-8 grid gap-3">
              <button
                type="button"
                onClick={() => addToCart(product.id)}
                className="rounded-2xl bg-blue-600 px-5 py-4 text-center font-semibold hover:bg-blue-500"
              >
                Sepete Ekle
              </button>

              <a
                href={`/checkout/${product.id}`}
                className="rounded-2xl bg-white px-5 py-4 text-center font-semibold text-black hover:bg-gray-200"
              >
                Hemen Satın Al
              </a>

              <a
                href="/products"
                className="rounded-2xl border border-white/15 px-5 py-4 text-center font-semibold hover:bg-white/10"
              >
                Ürünlere Dön
              </a>
            </div>

            <p className="mt-5 text-center text-xs leading-5 text-gray-500">
              Gerçek ödeme entegrasyonu PayTR onayından sonra bağlanacak.
            </p>
          </aside>
        </section>

        <section className="mt-10 rounded-3xl border border-white/10 bg-white/5 p-8">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-2xl font-bold">Benzer Ürünler</h2>
              <p className="mt-2 text-sm text-gray-400">
                Aynı kategorideki diğer yayındaki ürünler
              </p>
            </div>

            <a href="/products" className="text-sm text-gray-400 hover:text-white">
              Tümünü gör
            </a>
          </div>

          <div className="mt-6 grid gap-6 md:grid-cols-3">
            {relatedProducts.map((item) => (
              <div
                key={item.id}
                className="rounded-3xl border border-white/10 bg-black/30 p-6"
              >
                <span className="rounded-full bg-blue-500/20 px-3 py-1 text-sm text-blue-300">
                  {item.category}
                </span>

                <h3 className="mt-5 text-xl font-bold">{item.title}</h3>

                <p className="mt-2 text-sm text-gray-400">
                  Satıcı: {item.seller}
                </p>

                <div className="mt-6 flex items-center justify-between">
                  <p className="text-2xl font-bold">{item.price}</p>

                  <a
                    href={`/product/${item.id}`}
                    className="rounded-2xl bg-white px-4 py-2 text-sm font-semibold text-black"
                  >
                    İncele
                  </a>
                </div>
              </div>
            ))}

            {relatedProducts.length === 0 && (
              <div className="rounded-3xl border border-white/10 bg-black/30 p-6 text-gray-400 md:col-span-3">
                Bu kategoride başka yayındaki ürün yok.
              </div>
            )}
          </div>
        </section>
      </section>
    </main>
  );
}
