import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";

const categories = ["Web Site", "Dashboard", "Frontend", "Mobile UI"];

export default function SellerPage() {
  const router = useRouter();

  const [user, setUser] = useState<User | null>(null);
  const [loadingUser, setLoadingUser] = useState(true);

  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("Web Site");
  const [price, setPrice] = useState("");
  const [description, setDescription] = useState("");

  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    async function checkUser() {
      const { data } = await supabase.auth.getUser();

      if (!data.user) {
        router.push("/login");
        return;
      }

      setUser(data.user);
      setLoadingUser(false);
    }

    checkUser();
  }, [router]);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    setMessage("");

    if (!user) {
      setMessage("Ürün eklemek için giriş yapmalısın.");
      setSaving(false);
      return;
    }

    const sellerName =
      user.user_metadata?.full_name ||
      user.email ||
      "Bilinmeyen Satıcı";

    const newProduct = {
      id: String(Date.now()),
      title,
      category,
      price,
      seller: sellerName,
      status: "Onay Bekliyor",
      description,
    };

    const { error } = await supabase.from("products").insert(newProduct);

    setSaving(false);

    if (error) {
      setMessage("Ürün eklenirken hata oluştu: " + error.message);
      return;
    }

    setTitle("");
    setCategory("Web Site");
    setPrice("");
    setDescription("");

    router.push("/seller/success");
  }

  if (loadingUser) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#070A12] text-white">
        Satıcı paneli yükleniyor...
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#070A12] text-white">
      <section className="mx-auto max-w-7xl px-6 py-10">
        <nav className="mb-10 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">devcodstore Satıcı Paneli</h1>
            <p className="text-sm text-gray-400">
              Projeni yükle, admin onayına gönder
            </p>
          </div>

          <div className="flex gap-3">
            <a
              href="/"
              className="rounded-2xl border border-white/15 px-5 py-2 text-sm font-semibold"
            >
              Ana Sayfa
            </a>

            <a
              href="/products"
              className="rounded-2xl bg-white px-5 py-2 text-sm font-semibold text-black"
            >
              Ürünler
            </a>
          </div>
        </nav>

        <section className="grid gap-6 md:grid-cols-3">
          <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
            <p className="text-sm text-gray-400">Satıcı</p>
            <h2 className="mt-3 break-all text-2xl font-bold">
              {user?.user_metadata?.full_name || user?.email}
            </h2>
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
            <p className="text-sm text-gray-400">Yeni Ürün Durumu</p>
            <h2 className="mt-3 text-3xl font-bold text-yellow-300">
              Onay Bekliyor
            </h2>
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
            <p className="text-sm text-gray-400">Yayın Sistemi</p>
            <h2 className="mt-3 text-3xl font-bold text-green-300">
              Aktif
            </h2>
          </div>
        </section>

        <section className="mt-10 grid gap-8 md:grid-cols-[1fr_420px]">
          <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
            <h2 className="text-2xl font-bold">Yeni Proje Yükle</h2>
            <p className="mt-2 text-sm text-gray-400">
              Bu formdan eklenen ürün Supabase products tablosuna kaydolur.
            </p>

            <form onSubmit={handleSubmit} className="mt-6 grid gap-4">
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
                className="min-h-36 rounded-2xl border border-white/10 bg-black/30 px-4 py-3 outline-none"
              />

              <button
                type="submit"
                disabled={saving}
                className="rounded-2xl bg-blue-600 px-5 py-3 font-semibold hover:bg-blue-500 disabled:opacity-60"
              >
                {saving ? "Gönderiliyor..." : "Projeyi Gönder"}
              </button>
            </form>

            {message && (
              <p className="mt-5 rounded-2xl bg-red-500/10 p-4 text-sm text-red-200">
                {message}
              </p>
            )}
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
            <h2 className="text-2xl font-bold">Bilgilendirme</h2>

            <div className="mt-6 grid gap-4">
              <div className="rounded-2xl bg-black/30 p-5">
                <h3 className="font-semibold">1. Ürünü gönder</h3>
                <p className="mt-2 text-sm leading-6 text-gray-400">
                  Ürün veritabanına “Onay Bekliyor” durumuyla kaydedilir.
                </p>
              </div>

              <div className="rounded-2xl bg-black/30 p-5">
                <h3 className="font-semibold">2. Admin inceler</h3>
                <p className="mt-2 text-sm leading-6 text-gray-400">
                  İleride admin onaylayınca ürün “Yayında” durumuna geçecek.
                </p>
              </div>

              <div className="rounded-2xl bg-black/30 p-5">
                <h3 className="font-semibold">3. Ürün listede görünür</h3>
                <p className="mt-2 text-sm leading-6 text-gray-400">
                  Şu an gönderilen ürün products sayfasında görünebilir.
                </p>
              </div>
            </div>
          </div>
        </section>
      </section>
    </main>
  );
}
