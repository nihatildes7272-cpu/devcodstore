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
  status: string;
  description: string | null;
  file_path: string | null;
};

export default function CartPage() {
  const router = useRouter();
  const { id } = router.query;

  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  useEffect(() => {
    async function loadProduct() {
      if (!router.isReady || !id) return;

      setLoading(true);
      setMessage("");

      const { data, error } = await supabase
        .from("products")
        .select("id,title,category,price,seller,status,description,file_path")
        .eq("id", String(id))
        .maybeSingle();

      if (error) {
        setMessage("Sepet ürünü yüklenirken hata oluştu: " + error.message);
        setProduct(null);
      } else if (!data) {
        setMessage("Bu ürün veritabanında bulunamadı.");
        setProduct(null);
      } else {
        setProduct(data);
      }

      setLoading(false);
    }

    loadProduct();
  }, [router.isReady, id]);

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#070A12] text-white">
        Sepet yükleniyor...
      </main>
    );
  }

  if (!product) {
    return (
      <main className="min-h-screen bg-[#070A12] text-white">
        <section className="mx-auto max-w-7xl px-6 py-10">
          <SiteNavbar />

          <div className="flex min-h-[60vh] items-center justify-center">
            <section className="w-full max-w-xl rounded-3xl border border-red-500/20 bg-red-500/10 p-8 text-center">
              <h1 className="text-3xl font-bold">Ürün Bulunamadı</h1>
              <p className="mt-4 text-red-200">{message}</p>

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

        <section className="grid gap-8 rounded-3xl border border-white/10 bg-white/5 p-8 lg:grid-cols-[1fr_380px]">
          <div>
            <span className="rounded-full bg-blue-500/20 px-4 py-2 text-sm text-blue-300">
              {product.category}
            </span>

            <h1 className="mt-6 text-4xl font-bold">Sepetim</h1>
            <p className="mt-3 text-gray-400">
              Satın almak üzere olduğun ürünü kontrol et.
            </p>

            <div className="mt-8 rounded-3xl bg-black/30 p-6">
              <h2 className="text-2xl font-bold">{product.title}</h2>

              <p className="mt-2 text-sm text-gray-400">
                Satıcı: {product.seller}
              </p>

              {product.description && (
                <p className="mt-4 leading-7 text-gray-300">
                  {product.description}
                </p>
              )}

              <div className="mt-6 grid gap-4 md:grid-cols-3">
                <div className="rounded-2xl border border-white/10 p-4">
                  <p className="text-sm text-gray-400">Durum</p>
                  <p className="mt-2 font-bold text-green-300">{product.status}</p>
                </div>

                <div className="rounded-2xl border border-white/10 p-4">
                  <p className="text-sm text-gray-400">Dosya</p>
                  <p className={product.file_path ? "mt-2 font-bold text-green-300" : "mt-2 font-bold text-yellow-300"}>
                    {product.file_path ? "Hazır" : "Dosya yok"}
                  </p>
                </div>

                <div className="rounded-2xl border border-white/10 p-4">
                  <p className="text-sm text-gray-400">Ürün No</p>
                  <p className="mt-2 break-all font-bold">#{product.id}</p>
                </div>
              </div>
            </div>
          </div>

          <aside className="h-fit rounded-3xl border border-white/10 bg-black/30 p-6">
            <h2 className="text-2xl font-bold">Sipariş Özeti</h2>

            <div className="mt-6 grid gap-4">
              <div className="flex items-center justify-between rounded-2xl border border-white/10 p-4">
                <span className="text-gray-400">Ürün</span>
                <span className="font-semibold">1 adet</span>
              </div>

              <div className="flex items-center justify-between rounded-2xl border border-white/10 p-4">
                <span className="text-gray-400">Toplam</span>
                <span className="text-3xl font-bold">{product.price}</span>
              </div>
            </div>

            <div className="mt-8 grid gap-3">
              <a
                href={`/checkout/${product.id}`}
                className="rounded-2xl bg-blue-600 px-5 py-4 text-center font-semibold hover:bg-blue-500"
              >
                Ödemeye Geç
              </a>

              <a
                href={`/product/${product.id}`}
                className="rounded-2xl border border-white/15 px-5 py-4 text-center font-semibold hover:bg-white/10"
              >
                Ürüne Dön
              </a>

              <a
                href="/products"
                className="rounded-2xl border border-white/15 px-5 py-4 text-center font-semibold hover:bg-white/10"
              >
                Alışverişe Devam Et
              </a>
            </div>
          </aside>
        </section>
      </section>
    </main>
  );
}
