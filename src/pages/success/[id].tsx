import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { supabase } from "@/lib/supabase";

type Product = {
  id: string;
  title: string;
  price: string;
  seller: string;
};

export default function SuccessPage() {
  const router = useRouter();
  const { id } = router.query;

  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadProduct() {
      if (!router.isReady || !id) return;

      const { data } = await supabase
        .from("products")
        .select("id,title,price,seller")
        .eq("id", String(id))
        .single();

      setProduct(data || null);
      setLoading(false);
    }

    loadProduct();
  }, [router.isReady, id]);

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#070A12] text-white">
        Sipariş bilgisi yükleniyor...
      </main>
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#070A12] px-6 text-white">
      <section className="w-full max-w-xl rounded-3xl border border-white/10 bg-white/5 p-8 text-center shadow-2xl">
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-green-500/20 text-4xl text-green-300">
          ✓
        </div>

        <h1 className="mt-6 text-4xl font-bold">Sipariş Başarılı</h1>

        <p className="mt-4 text-gray-400">
          Siparişin başarıyla oluşturuldu. Ürün hesabına tanımlanacak.
        </p>

        {product && (
          <div className="mt-8 rounded-2xl bg-black/30 p-5 text-left">
            <p className="text-sm text-gray-400">Satın Alınan Ürün</p>
            <h2 className="mt-2 text-2xl font-bold">{product.title}</h2>
            <p className="mt-2 text-sm text-gray-400">Satıcı: {product.seller}</p>

            <div className="mt-5 flex items-center justify-between">
              <span className="text-gray-400">Ödenen Tutar</span>
              <span className="text-2xl font-bold">{product.price}</span>
            </div>
          </div>
        )}

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
    </main>
  );
}
