import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";

type Product = {
  id: string;
  title: string;
  category: string;
  price: string;
  seller: string;
  status: string;
  description: string | null;
};

export default function CheckoutPage() {
  const router = useRouter();
  const { id } = router.query;

  const [user, setUser] = useState<User | null>(null);
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    async function loadCheckout() {
      if (!router.isReady || !id) return;

      setLoading(true);
      setMessage("");

      const { data: userData } = await supabase.auth.getUser();

      if (!userData.user) {
        router.push("/login");
        return;
      }

      setUser(userData.user);

      const { data, error } = await supabase
        .from("products")
        .select("*")
        .eq("id", String(id))
        .single();

      if (error || !data) {
        setMessage("Ürün bilgisi yüklenemedi.");
        setProduct(null);
      } else {
        setProduct(data);
      }

      setLoading(false);
    }

    loadCheckout();
  }, [router.isReady, id, router]);

  async function completeOrder() {
    if (!user || !product) {
      setMessage("Kullanıcı veya ürün bilgisi eksik.");
      return;
    }

    setSaving(true);
    setMessage("");

    const { error } = await supabase.from("orders").insert({
      user_id: user.id,
      product_id: product.id,
      product_title: product.title,
      price: product.price,
      seller: product.seller,
      status: "Tamamlandı",
    });

    setSaving(false);

    if (error) {
      setMessage("Sipariş oluşturulamadı: " + error.message);
      return;
    }

    router.push(`/success/${product.id}`);
  }

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#070A12] text-white">
        Checkout yükleniyor...
      </main>
    );
  }

  if (!product) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#070A12] px-6 text-white">
        <section className="w-full max-w-xl rounded-3xl border border-red-500/20 bg-red-500/10 p-8 text-center">
          <h1 className="text-3xl font-bold">Ürün bulunamadı</h1>
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

  return (
    <main className="min-h-screen bg-[#070A12] text-white">
      <section className="mx-auto max-w-5xl px-6 py-10">
        <nav className="mb-10 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">devcodstore Checkout</h1>
            <p className="text-sm text-gray-400">
              Siparişini kontrol et ve tamamla
            </p>
          </div>

          <a
            href={`/product/${product.id}`}
            className="rounded-2xl bg-white px-5 py-2 text-sm font-semibold text-black"
          >
            Ürüne Dön
          </a>
        </nav>

        {message && (
          <div className="mb-6 rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-200">
            {message}
          </div>
        )}

        <section className="grid gap-8 md:grid-cols-2">
          <div className="rounded-3xl border border-white/10 bg-white/5 p-8">
            <h2 className="text-3xl font-bold">Sipariş Özeti</h2>

            <div className="mt-6 rounded-2xl bg-black/30 p-5">
              <p className="text-sm text-gray-400">Ürün</p>
              <h3 className="mt-2 text-2xl font-bold">{product.title}</h3>
              <p className="mt-2 text-sm text-gray-400">
                Satıcı: {product.seller}
              </p>
              <p className="mt-2 text-sm text-gray-400">
                Kategori: {product.category}
              </p>
            </div>

            <div className="mt-6 flex items-center justify-between rounded-2xl bg-black/30 p-5">
              <span className="text-gray-400">Toplam Tutar</span>
              <span className="text-3xl font-bold">{product.price}</span>
            </div>
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/5 p-8">
            <h2 className="text-3xl font-bold">Ödeme Bilgileri</h2>
            <p className="mt-2 text-sm text-gray-400">
              Şimdilik demo ödeme ekranı. Butona basınca orders tablosuna gerçek sipariş kaydı oluşur.
            </p>

            <div className="mt-6 grid gap-4">
              <input
                placeholder="Kart üzerindeki isim"
                className="rounded-2xl border border-white/10 bg-black/30 px-4 py-3 outline-none"
              />

              <input
                placeholder="Kart numarası"
                className="rounded-2xl border border-white/10 bg-black/30 px-4 py-3 outline-none"
              />

              <div className="grid grid-cols-2 gap-4">
                <input
                  placeholder="AA/YY"
                  className="rounded-2xl border border-white/10 bg-black/30 px-4 py-3 outline-none"
                />

                <input
                  placeholder="CVV"
                  className="rounded-2xl border border-white/10 bg-black/30 px-4 py-3 outline-none"
                />
              </div>

              <button
                onClick={completeOrder}
                disabled={saving}
                className="mt-2 rounded-2xl bg-blue-600 px-5 py-4 font-semibold hover:bg-blue-500 disabled:opacity-60"
              >
                {saving ? "Sipariş oluşturuluyor..." : "Ödemeyi Tamamla"}
              </button>
            </div>
          </div>
        </section>
      </section>
    </main>
  );
}
