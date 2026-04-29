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
  created_at?: string;
};

export default function ProductDetailPage() {
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
        .select("*")
        .eq("id", String(id))
        .single();

      if (error) {
        setMessage("Ürün bilgisi yüklenirken hata oluştu: " + error.message);
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
        Ürün yükleniyor...
      </main>
    );
  }

  if (message) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#070A12] px-6 text-white">
        <section className="w-full max-w-xl rounded-3xl border border-red-500/20 bg-red-500/10 p-8 text-center">
          <h1 className="text-3xl font-bold">Ürün yüklenemedi</h1>
          <p className="mt-4 text-red-200">{message}</p>

          <a
            href="/products"
            className="mt-8 inline-block rounded-2xl bg-white px-5 py-3 font-semibold text-black"
          >
            Ürünlere Dön
          </a>
        </section>
      </main>
    );
  }

  if (!product) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#070A12] px-6 text-white">
        <section className="w-full max-w-xl rounded-3xl border border-white/10 bg-white/5 p-8 text-center">
          <h1 className="text-3xl font-bold">Ürün bulunamadı</h1>
          <p className="mt-4 text-gray-400">
            Bu ürün veritabanında bulunamadı.
          </p>

          <a
            href="/products"
            className="mt-8 inline-block rounded-2xl bg-white px-5 py-3 font-semibold text-black"
          >
            Ürünlere Dön
          </a>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#070A12] text-white">
      <section className="mx-auto max-w-6xl px-6 py-10">
        <SiteNavbar />

        <section className="grid gap-8 md:grid-cols-[1fr_360px]">
          <div className="rounded-3xl border border-white/10 bg-white/5 p-8">
            <span className="rounded-full bg-blue-500/20 px-4 py-2 text-sm text-blue-300">
              {product.category}
            </span>

            <h2 className="mt-6 text-4xl font-bold">{product.title}</h2>

            <p className="mt-4 text-sm text-gray-400">
              Satıcı: {product.seller}
            </p>

            <div className="mt-8 rounded-3xl bg-black/30 p-6">
              <h3 className="text-2xl font-bold">Ürün Açıklaması</h3>

              <p className="mt-4 leading-8 text-gray-300">
                {product.description ||
                  "Bu ürün için henüz açıklama eklenmemiş."}
              </p>
            </div>

            <div className="mt-8 grid gap-4 md:grid-cols-3">
              <div className="rounded-2xl bg-black/30 p-5">
                <p className="text-sm text-gray-400">Durum</p>
                <p className="mt-2 font-bold text-green-300">
                  {product.status}
                </p>
              </div>

              <div className="rounded-2xl bg-black/30 p-5">
                <p className="text-sm text-gray-400">Kategori</p>
                <p className="mt-2 font-bold">{product.category}</p>
              </div>

              <div className="rounded-2xl bg-black/30 p-5">
                <p className="text-sm text-gray-400">Ürün No</p>
                <p className="mt-2 font-bold">#{product.id}</p>
              </div>
            </div>
          </div>

          <aside className="rounded-3xl border border-white/10 bg-white/5 p-8">
            <p className="text-sm text-gray-400">Fiyat</p>
            <h3 className="mt-3 text-5xl font-bold">{product.price}</h3>

            <p className="mt-5 text-sm leading-6 text-gray-400">
              Satın alma sonrası proje dosyası hesabına tanımlanacak. İleride
              gerçek ödeme ve dosya indirme sistemi buraya bağlanacak.
            </p>

            <div className="mt-8 grid gap-3">
              <a
                href={`/cart/${product.id}`}
                className="rounded-2xl bg-blue-600 px-5 py-4 text-center font-semibold hover:bg-blue-500"
              >
                Sepete Ekle
              </a>

              <a
                href={`/checkout/${product.id}`}
                className="rounded-2xl border border-white/15 px-5 py-4 text-center font-semibold hover:bg-white/10"
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
          </aside>
        </section>
      </section>
    </main>
  );
}
