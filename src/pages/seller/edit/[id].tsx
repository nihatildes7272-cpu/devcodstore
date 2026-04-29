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
  file_path: string | null;
};

const categories = ["Web Site", "Dashboard", "Frontend", "Mobile UI"];

function safeFileName(fileName: string) {
  const cleaned = fileName
    .toLowerCase()
    .replaceAll("ı", "i")
    .replaceAll("ğ", "g")
    .replaceAll("ü", "u")
    .replaceAll("ş", "s")
    .replaceAll("ö", "o")
    .replaceAll("ç", "c")
    .replace(/[^a-z0-9.]+/g, "-")
    .replace(/^-|-$/g, "");

  return cleaned.endsWith(".zip") ? cleaned : `${cleaned}.zip`;
}

export default function SellerEditProductPage() {
  const router = useRouter();
  const { id } = router.query;

  const [user, setUser] = useState<User | null>(null);
  const [product, setProduct] = useState<Product | null>(null);

  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("Web Site");
  const [price, setPrice] = useState("");
  const [description, setDescription] = useState("");
  const [zipFile, setZipFile] = useState<File | null>(null);

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

    let newFilePath = product.file_path;

    if (zipFile) {
      const filePath = `${user.id}/${product.id}/${Date.now()}-${safeFileName(zipFile.name)}`;

      const { error: uploadError } = await supabase.storage
        .from("product-files")
        .upload(filePath, zipFile, {
          cacheControl: "3600",
          upsert: false,
        });

      if (uploadError) {
        setSaving(false);
        setMessage("Yeni ZIP dosyası yüklenemedi: " + uploadError.message);
        return;
      }

      newFilePath = filePath;

      if (product.file_path) {
        await supabase.storage.from("product-files").remove([product.file_path]);
      }
    }

    const { error } = await supabase
      .from("products")
      .update({
        title,
        category,
        price,
        description,
        file_path: newFilePath,
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

  function shownFileName(path: string | null) {
    if (!path) return "Dosya yok";
    return path.split("/").pop() || "proje-dosyasi.zip";
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
              Ürünü ve ZIP dosyasını güncelle, tekrar admin onayına gönder
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

          <div className="mt-6 rounded-2xl border border-white/10 bg-black/30 p-4">
            <p className="text-sm text-gray-400">Mevcut ZIP dosyası</p>
            <p className="mt-2 break-all font-semibold">
              {shownFileName(product?.file_path || null)}
            </p>
          </div>

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

            <label className="rounded-2xl border border-white/10 bg-black/30 px-4 py-4">
              <p className="mb-2 text-sm text-gray-400">
                Yeni ZIP dosyası seç
              </p>

              <input
                type="file"
                accept=".zip,application/zip,application/x-zip-compressed"
                onChange={(event) => setZipFile(event.target.files?.[0] || null)}
                className="w-full text-sm text-gray-300"
              />

              <p className="mt-2 text-xs text-gray-500">
                Yeni dosya seçmezsen mevcut ZIP dosyası korunur.
              </p>
            </label>

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
