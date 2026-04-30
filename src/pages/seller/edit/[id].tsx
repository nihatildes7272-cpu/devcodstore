import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import SiteNavbar from "@/components/SiteNavbar";
import { productCategories } from "@/lib/productCategories";
import { productLicenses, getLicenseInfo } from "@/lib/productLicenses";

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
  file_name: string | null;
  file_type: string | null;
  file_size: number | null;
  image_url: string | null;
  license_type: string | null;
  license_summary: string | null;
  license_allows_commercial: boolean | null;
  license_allows_resale: boolean | null;
  demo_url: string | null;
  tech_stack: string | null;
  setup_notes: string | null;
  requirements: string | null;
};

type GalleryImage = {
  id: string;
  product_id: string;
  image_url: string;
  image_path: string;
  created_at?: string;
};

const categories = productCategories;

function detectFileType(fileName: string) {
  const lower = fileName.toLowerCase();

  if (lower.endsWith(".zip")) return "ZIP Proje Dosyası";
  if (lower.endsWith(".pdf")) return "PDF Doküman";
  if (lower.endsWith(".ppt") || lower.endsWith(".pptx")) return "Ders Slaytı / Sunum";
  if (lower.endsWith(".doc") || lower.endsWith(".docx")) return "Word Dokümanı";
  if (lower.endsWith(".xls") || lower.endsWith(".xlsx")) return "Excel Dosyası";
  if (lower.endsWith(".txt")) return "Metin Dosyası";
  if (lower.endsWith(".csv")) return "CSV Dosyası";
  if (lower.endsWith(".png") || lower.endsWith(".jpg") || lower.endsWith(".jpeg") || lower.endsWith(".webp")) return "Görsel Dosyası";
  if (lower.endsWith(".json")) return "JSON Dosyası";

  return "Dijital Dosya";
}

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

  return cleaned;
}

function safeImageName(fileName: string) {
  return fileName
    .toLowerCase()
    .replaceAll("ı", "i")
    .replaceAll("ğ", "g")
    .replaceAll("ü", "u")
    .replaceAll("ş", "s")
    .replaceAll("ö", "o")
    .replaceAll("ç", "c")
    .replace(/[^a-z0-9.]+/g, "-")
    .replace(/^-|-$/g, "");
}

function getStoragePathFromPublicUrl(url: string | null) {
  if (!url) return null;

  const marker = "/product-images/";
  const index = url.indexOf(marker);

  if (index === -1) return null;

  return url.slice(index + marker.length);
}

export default function SellerEditProductPage() {
  const router = useRouter();
  const { id } = router.query;

  const [user, setUser] = useState<User | null>(null);
  const [product, setProduct] = useState<Product | null>(null);
  const [galleryImages, setGalleryImages] = useState<GalleryImage[]>([]);

  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("Web Site");
  const [price, setPrice] = useState("");
  const [description, setDescription] = useState("");
  const [licenseType, setLicenseType] = useState("Kişisel Kullanım");
  const [demoUrl, setDemoUrl] = useState("");
  const [techStack, setTechStack] = useState("");
  const [setupNotes, setSetupNotes] = useState("");
  const [requirements, setRequirements] = useState("");
  const [zipFile, setZipFile] = useState<File | null>(null);
  const [coverImage, setCoverImage] = useState<File | null>(null);
  const [galleryFiles, setGalleryFiles] = useState<File[]>([]);

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
      setLicenseType(data.license_type || "Kişisel Kullanım");
      setDemoUrl(data.demo_url || "");
      setTechStack(data.tech_stack || "");
      setSetupNotes(data.setup_notes || "");
      setRequirements(data.requirements || "");

      const { data: galleryData } = await supabase
        .from("product_images")
        .select("*")
        .eq("product_id", data.id)
        .order("created_at", { ascending: true });

      setGalleryImages(galleryData || []);

      setLoading(false);
    }

    loadProduct();
  }, [router.isReady, id, router]);

  async function deleteGalleryImage(image: GalleryImage) {
    const confirmed = window.confirm("Bu galeri görselini silmek istiyor musun?");

    if (!confirmed) return;

    await supabase.storage.from("product-images").remove([image.image_path]);

    const { error } = await supabase
      .from("product_images")
      .delete()
      .eq("id", image.id);

    if (error) {
      setMessage("Galeri görseli silinemedi: " + error.message);
      return;
    }

    setGalleryImages((current) => current.filter((item) => item.id !== image.id));
  }

  async function handleUpdate(event: React.FormEvent) {
    event.preventDefault();

    if (!product || !user) {
      setMessage("Ürün veya kullanıcı bilgisi bulunamadı.");
      return;
    }

    setSaving(true);
    setMessage("");

    let newFilePath = product.file_path;
    let newFileName = product.file_name;
    let newFileType = product.file_type;
    let newFileSize = product.file_size;
    let newImageUrl = product.image_url;
    const selectedLicense = getLicenseInfo(licenseType);

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
      newFileName = zipFile.name;
      newFileType = detectFileType(zipFile.name);
      newFileSize = zipFile.size;

      if (product.file_path) {
        await supabase.storage.from("product-files").remove([product.file_path]);
      }
    }

    if (coverImage) {
      const imagePath = `${user.id}/${product.id}/${Date.now()}-${safeImageName(
        coverImage.name
      )}`;

      const { error: imageUploadError } = await supabase.storage
        .from("product-images")
        .upload(imagePath, coverImage, {
          cacheControl: "3600",
          upsert: false,
        });

      if (imageUploadError) {
        setSaving(false);
        setMessage("Yeni kapak görseli yüklenemedi: " + imageUploadError.message);
        return;
      }

      const { data: publicImage } = supabase.storage
        .from("product-images")
        .getPublicUrl(imagePath);

      newImageUrl = publicImage.publicUrl;

      const oldImagePath = getStoragePathFromPublicUrl(product.image_url);

      if (oldImagePath) {
        await supabase.storage.from("product-images").remove([oldImagePath]);
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
        file_name: newFileName,
        file_type: newFileType,
        file_size: newFileSize,
        image_url: newImageUrl,
        license_type: selectedLicense.type,
        license_summary: selectedLicense.summary,
        license_allows_commercial: selectedLicense.allowsCommercial,
        license_allows_resale: selectedLicense.allowsResale,
        demo_url: demoUrl.trim() || null,
        tech_stack: techStack.trim() || null,
        setup_notes: setupNotes.trim() || null,
        requirements: requirements.trim() || null,
        status: "Onay Bekliyor",
      })
      .eq("id", product.id);

    if (error) {
      setSaving(false);
      setMessage("Ürün güncellenirken hata oluştu: " + error.message);
      return;
    }

    if (galleryFiles.length > 0) {
      const galleryRecords = [];

      for (let index = 0; index < galleryFiles.length; index++) {
        const file = galleryFiles[index];
        const imagePath = `${user.id}/${product.id}/gallery/${Date.now()}-${index}-${safeImageName(
          file.name
        )}`;

        const { error: uploadError } = await supabase.storage
          .from("product-images")
          .upload(imagePath, file, {
            cacheControl: "3600",
            upsert: false,
          });

        if (uploadError) {
          setSaving(false);
          setMessage("Galeri görseli yüklenemedi: " + uploadError.message);
          return;
        }

        const { data: publicImage } = supabase.storage
          .from("product-images")
          .getPublicUrl(imagePath);

        galleryRecords.push({
          product_id: product.id,
          image_url: publicImage.publicUrl,
          image_path: imagePath,
        });
      }

      const { error: galleryError } = await supabase
        .from("product_images")
        .insert(galleryRecords);

      if (galleryError) {
        setSaving(false);
        setMessage("Galeri kayıtları oluşturulamadı: " + galleryError.message);
        return;
      }
    }

    setSaving(false);
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
      <section className="mx-auto max-w-5xl px-6 py-10">
        <SiteNavbar />

        <section className="rounded-3xl border border-white/10 bg-white/5 p-8">
          <h1 className="text-3xl font-bold">Ürün Düzenle</h1>
          <p className="mt-2 text-sm text-gray-400">
            Ürün bilgilerini, kapak görselini, ZIP dosyasını ve galeri görsellerini güncelle.
            Kaydedince ürün tekrar admin onayına düşer.
          </p>

          {product?.image_url ? (
            <img
              src={product.image_url}
              alt={product.title}
              className="mt-8 h-72 w-full rounded-3xl object-cover"
            />
          ) : (
            <div className="mt-8 flex h-72 w-full items-center justify-center rounded-3xl bg-black/30 text-gray-500">
              Mevcut kapak görseli yok
            </div>
          )}

          <div className="mt-6 rounded-2xl border border-white/10 bg-black/30 p-4">
            <p className="text-sm text-gray-400">Mevcut ürün dosyası</p>
            <p className="mt-2 break-all font-semibold">
              {product?.file_name || shownFileName(product?.file_path || null)}
            </p>
            <p className="mt-2 text-sm text-gray-400">
              Tür: {product?.file_type || "Dijital Dosya"}
            </p>
          </div>

          <div className="mt-8 rounded-3xl border border-white/10 bg-black/30 p-5">
            <h2 className="text-2xl font-bold">Mevcut Galeri Görselleri</h2>
            <p className="mt-2 text-sm text-gray-400">
              Ürün detayında gösterilecek ek ekran görüntüleri.
            </p>

            <div className="mt-6 grid gap-4 md:grid-cols-3">
              {galleryImages.map((image) => (
                <div key={image.id} className="rounded-2xl border border-white/10 bg-white/5 p-3">
                  <img
                    src={image.image_url}
                    alt="Galeri görseli"
                    className="h-40 w-full rounded-xl object-cover"
                  />

                  <button
                    type="button"
                    onClick={() => deleteGalleryImage(image)}
                    className="mt-3 w-full rounded-xl border border-red-500/30 px-4 py-2 text-sm font-semibold text-red-200 hover:bg-red-500/10"
                  >
                    Görseli Sil
                  </button>
                </div>
              ))}

              {galleryImages.length === 0 && (
                <div className="rounded-2xl border border-white/10 bg-black/30 p-6 text-center text-gray-400 md:col-span-3">
                  Henüz galeri görseli yok.
                </div>
              )}
            </div>
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
              <p className="mb-2 text-sm text-gray-400">Lisans türü</p>

              <select
                value={licenseType}
                onChange={(event) => setLicenseType(event.target.value)}
                className="w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 outline-none"
              >
                {productLicenses.map((license) => (
                  <option key={license.type} value={license.type}>
                    {license.type}
                  </option>
                ))}
              </select>

              <p className="mt-2 text-xs text-gray-500">
                {getLicenseInfo(licenseType).summary}
              </p>
            </label>

            <div className="grid gap-4 rounded-2xl border border-white/10 bg-black/30 p-4">
              <div>
                <h3 className="text-lg font-bold">Teknik Bilgiler</h3>
                <p className="mt-1 text-sm text-gray-400">
                  Canlı demo, teknoloji, gereksinim ve kurulum bilgilerini güncelle.
                </p>
              </div>

              <input
                value={demoUrl}
                onChange={(event) => setDemoUrl(event.target.value)}
                placeholder="Canlı demo linki"
                className="rounded-2xl border border-white/10 bg-black/30 px-4 py-3 outline-none"
              />

              <input
                value={techStack}
                onChange={(event) => setTechStack(event.target.value)}
                placeholder="Teknolojiler örnek: React, Firebase, Tailwind"
                className="rounded-2xl border border-white/10 bg-black/30 px-4 py-3 outline-none"
              />

              <textarea
                value={requirements}
                onChange={(event) => setRequirements(event.target.value)}
                placeholder="Gereksinimler"
                className="min-h-28 rounded-2xl border border-white/10 bg-black/30 px-4 py-3 outline-none"
              />

              <textarea
                value={setupNotes}
                onChange={(event) => setSetupNotes(event.target.value)}
                placeholder="Kurulum notları"
                className="min-h-36 rounded-2xl border border-white/10 bg-black/30 px-4 py-3 outline-none"
              />
            </div>

            <label className="rounded-2xl border border-white/10 bg-black/30 px-4 py-4">
              <p className="mb-2 text-sm text-gray-400">
                Yeni kapak görseli seç
              </p>

              <input
                type="file"
                accept="image/png,image/jpeg,image/jpg,image/webp"
                onChange={(event) => setCoverImage(event.target.files?.[0] || null)}
                className="w-full text-sm text-gray-300"
              />

              <p className="mt-2 text-xs text-gray-500">
                Yeni görsel seçmezsen mevcut kapak görseli korunur.
              </p>
            </label>

            <label className="rounded-2xl border border-white/10 bg-black/30 px-4 py-4">
              <p className="mb-2 text-sm text-gray-400">
                Galeri görselleri ekle
              </p>

              <input
                type="file"
                multiple
                accept="image/png,image/jpeg,image/jpg,image/webp"
                onChange={(event) =>
                  setGalleryFiles(Array.from(event.target.files || []))
                }
                className="w-full text-sm text-gray-300"
              />

              <p className="mt-2 text-xs text-gray-500">
                Birden fazla ekran görüntüsü seçebilirsin. Mevcut galeri korunur,
                seçtiğin yeni görseller eklenir.
              </p>
            </label>

            <label className="rounded-2xl border border-white/10 bg-black/30 px-4 py-4">
              <p className="mb-2 text-sm text-gray-400">
                Yeni ürün dosyası seç
              </p>

              <input
                type="file"
                accept=".zip,.pdf,.ppt,.pptx,.doc,.docx,.xls,.xlsx,.txt,.csv,.png,.jpg,.jpeg,.webp,.json,application/zip,application/x-zip-compressed,application/pdf"
                onChange={(event) => setZipFile(event.target.files?.[0] || null)}
                className="w-full text-sm text-gray-300"
              />

              <p className="mt-2 text-xs text-gray-500">
                Yeni dosya seçmezsen mevcut ürün dosyası korunur.
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
