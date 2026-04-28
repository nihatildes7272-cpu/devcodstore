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
  seller_id: string | null;
  status: string;
  description: string | null;
};

const categories = ["Web Site", "Dashboard", "Frontend", "Mobile UI"];

export default function SellerEditProductPage() {
  const router = useRouter();
  const { id } = router.query;

  const [user, setUser] = useState<User | null>(null);
  const [product, setProduct] = useState<Product | null>(null);

  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("Web Site");
  const [price, setPrice] = useState("");
  const [description, setDescription] = useState("");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    async function loadProduct() {
      if (!router.isReady || !id) return;

      setLoading(true);
      setMessage("");

      const { data: userData } = await supabase.auth.getUser();

      if (!userData.user) {
        router.push("/login");
        return;
      }

      const currentUser = userData.user;
      setUser(currentUser);

      const { data, error } = await supabase
        .from("products")
        .select("*")
        .eq("id", String(id))
        .single();

      if (error || !data) {
        setMessage("Ürün bulunamadı veya yüklenemedi.");
        setLoading(false);
        return;
      }

      const sellerName =
        currentUser.user_metadata?.full_name ||
        currentUser.email ||
        "Bilinmeyen Satıcı";

      const isOwner =
        data.seller_id === currentUser.id || data.seller === sellerName;

      if (!isOwner) {
        setMessage("Bu ürünü düzenleme yetkin yok.");
        setLoading(false);
        return;
      }

      setProduct(data);
      setTitle(data.title);
      setCategory(data.category);
      setPrice(data.price);
      setDescription(data.description || "");

      setLoading(false);
    }

    loadProduct();
  }, [router.isReady, id, router]);

  async function handleUpdate(event: React.FormEvent) {
    event.preventDefault();

    if (!product || !user) {
      setMessage("Ürün veya kullanıcı bilgisi bulunamadı.");
      return;
    }

    setSaving(true);
    setMessage("");

    const { error } = await supabase
      .from("products")
      .update({
        title,
        category,
        price,
        description,
        status: "Onay Bekliyor",
      })
      .eq("id", product.id);

    setSaving(false);

    if (error) {
      setMessage("Ürün güncellenirken hata oluştu: " + error.message);
      return;
    }

    router.push("/seller");
  }

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#070A12] text-white">
        Ürün bilgileri yükleniyor...
      </main>
    );
  }

  if (message && !product) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#070A12] px-6 text-white">
        <section className="w-full max-w-xl rounded-3xl border border-red-500/20 bg-red-500/10 p-8 text-center">
          <h1 className="text-3xl font-bold">İşlem yapılamadı</h1>
          <p className="mt-4 text-red-200">{message}</p>

          <a
            href="/seller"
            className="mt-8 inline-block rounded-2xl bg-white px-5 py-3 font-semibold text-black"
          >
            Satıcı Paneline Dön
          </a>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#070A12] text-white">
      <section className="mx-auto max-w-4xl px-6 py-10">
        <nav className="mb-10 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Ürün Düzenle</h1>
            <p className="text-sm text-gray-400">
              Ürünü güncelle ve tekrar admin onayına gönder
            </p>
          </div>

          <a
            href="/seller"
            className="rounded-2xl bg-white px-5 py-2 text-sm font-semibold text-black"
          >
            Satıcı Paneline Dön
          </a>
        </nav>

        <section className="rounded-3xl border border-white/10 bg-white/5 p-8">
          <h2 className="text-3xl font-bold">Proje Bilgileri</h2>
          <p className="mt-2 text-sm text-gray-400">
            Düzenleme yaptıktan sonra ürün tekrar “Onay Bekliyor” durumuna alınır.
          </p>

          <form onSubmit={handleUpdate} className="mt-8 grid gap-4">
            <input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="Proje adı"
              required
              className="rounded-2xl border border-white/10 bg-black/30 px-4 py-3 outline-none"
            />

            <select
              value={category}
              onChange={(event) => setCategory(event.target.value)}
              className="rounded-2xl border border-white/10 bg-black/30 px-4 py-3 outline-none"
            >
              {categories.map((item) => (
                <option key={item}>{item}</option>
              ))}
            </select>

            <input
              value={price}
              onChange={(event) => setPrice(event.target.value)}
              placeholder="Fiyat örnek: ₺499"
              required
              className="rounded-2xl border border-white/10 bg-black/30 px-4 py-3 outline-none"
            />

            <textarea
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="Proje açıklaması"
              required
              className="min-h-40 rounded-2xl border border-white/10 bg-black/30 px-4 py-3 outline-none"
            />

            <button
              type="submit"
              disabled={saving}
              className="rounded-2xl bg-blue-600 px-5 py-3 font-semibold hover:bg-blue-500 disabled:opacity-60"
            >
              {saving ? "Kaydediliyor..." : "Değişiklikleri Kaydet"}
            </button>
          </form>

          {message && (
            <p className="mt-5 rounded-2xl bg-red-500/10 p-4 text-sm text-red-200">
              {message}
            </p>
          )}
        </section>
      </section>
    </main>
  );
}
