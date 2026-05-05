import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import type { User } from "@supabase/supabase-js";
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
};

export default function CheckoutPage() {
  const router = useRouter();
  const { id } = router.query;

  const [user, setUser] = useState<User | null>(null);
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [iframeUrl, setIframeUrl] = useState("");

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

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData.session?.access_token;

      if (!accessToken) {
        throw new Error("Oturum doğrulanamadı. Lütfen tekrar giriş yap.");
      }

      const response = await fetch("/api/payment/checkout", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          productIds: [product.id],
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Ödeme işlemi başlatılamadı.");
      }

      if (data.paymentUrl) {
        setIframeUrl(data.paymentUrl);
        setSaving(false);
        return;
      }

      setSaving(false);
      router.push(`/success/${product.id}`);
    } catch (error) {
      setSaving(false);
      setMessage(
        error instanceof Error
          ? error.message
          : "Sipariş oluşturulurken bilinmeyen bir hata oluştu."
      );
    }
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
        <SiteNavbar />

        {message && (
          <div className="mb-6 rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-200">
            {message}
          </div>
        )}

        {iframeUrl ? (
          <section className="rounded-3xl border border-white/10 bg-white/5 p-4 text-center h-[650px] w-full">
            <iframe
              src={iframeUrl}
              id="iyzicoiframe"
              style={{ width: "100%", height: "100%", border: "none" }}
            ></iframe>
          </section>
        ) : (
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
                iyzico Checkout Form ile güvenli 3D Secure ödeme altyapısı aktiftir.
              </p>

              <div className="mt-6 grid gap-4">
                <input
                  placeholder="Ad Soyad"
                  value={user?.user_metadata?.full_name || ""}
                  readOnly
                  className="rounded-2xl border border-white/10 bg-black/30 px-4 py-3 outline-none opacity-50 cursor-not-allowed"
                />

                <input
                  placeholder="E-posta Adresi"
                  value={user?.email || ""}
                  readOnly
                  className="rounded-2xl border border-white/10 bg-black/30 px-4 py-3 outline-none opacity-50 cursor-not-allowed"
                />

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
        )}
      </section>
    </main>
  );
}
