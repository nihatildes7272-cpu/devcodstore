import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import SiteNavbar from "@/components/SiteNavbar";
import SellerPanelNav from "@/components/SellerPanelNav";
import { productCategories } from "@/lib/productCategories";
import { productLicenses, getLicenseInfo } from "@/lib/productLicenses";
import { productPreviewTypes, getPreviewInfo } from "@/lib/productPreviewTypes";
import { parseTags, tagsToInput } from "@/lib/tags";

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

  preview_type: string | null;
  preview_note: string | null;

  tags: string[] | null;
};

type GalleryImage = {
  id: string;
  product_id: string;
  image_url: string;
  image_path: string;
  created_at?: string;
};

type StepKey = "basic" | "files" | "gallery" | "license" | "technical";

const maxProductFileSize = 200 * 1024 * 1024;
const maxGalleryImages = 12;

function safeFileName(fileName: string) {
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

function detectFileType(fileName: string) {
  const lower = fileName.toLowerCase();

  if (lower.endsWith(".zip")) return "ZIP Proje Dosyası";
  if (lower.endsWith(".pdf")) return "PDF Doküman";
  if (lower.endsWith(".ppt") || lower.endsWith(".pptx")) return "Ders Slaytı / Sunum";
  if (lower.endsWith(".doc") || lower.endsWith(".docx")) return "Word Dokümanı";
  if (lower.endsWith(".xls") || lower.endsWith(".xlsx")) return "Excel Dosyası";
  if (lower.endsWith(".txt")) return "Metin Dosyası";
  if (lower.endsWith(".csv")) return "CSV Dosyası";
  if (
    lower.endsWith(".png") ||
    lower.endsWith(".jpg") ||
    lower.endsWith(".jpeg") ||
    lower.endsWith(".webp")
  ) {
    return "Görsel Dosyası";
  }
  if (lower.endsWith(".json")) return "JSON Dosyası";

  return "Dijital Dosya";
}

function getStoragePathFromPublicUrl(url: string | null) {
  if (!url) return null;

  const marker = "/product-images/";
  const index = url.indexOf(marker);

  if (index === -1) return null;

  return url.slice(index + marker.length);
}

function formatFileSize(size?: number | null) {
  if (!size) return "Bilinmiyor";

  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  if (size < 1024 * 1024 * 1024) return `${(size / (1024 * 1024)).toFixed(1)} MB`;

  return `${(size / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}

export default function SellerEditProductPage() {
  const router = useRouter();
  const { id } = router.query;

  const [activeStep, setActiveStep] = useState<StepKey>("basic");

  const [user, setUser] = useState<User | null>(null);
  const [product, setProduct] = useState<Product | null>(null);
  const [galleryImages, setGalleryImages] = useState<GalleryImage[]>([]);

  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("Web Site");
  const [price, setPrice] = useState("");
  const [description, setDescription] = useState("");
  const [tagsInput, setTagsInput] = useState("");

  const [zipFile, setZipFile] = useState<File | null>(null);
  const [coverImage, setCoverImage] = useState<File | null>(null);
  const [galleryFiles, setGalleryFiles] = useState<File[]>([]);

  const [licenseType, setLicenseType] = useState("Kişisel Kullanım");
  const [previewType, setPreviewType] = useState("Kapak + Galeri");
  const [previewNote, setPreviewNote] = useState("");

  const [demoUrl, setDemoUrl] = useState("");
  const [techStack, setTechStack] = useState("");
  const [setupNotes, setSetupNotes] = useState("");
  const [requirements, setRequirements] = useState("");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

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
      .maybeSingle();

    if (error || !data) {
      setMessage("Ürün bulunamadı veya yüklenemedi.");
      setProduct(null);
      setLoading(false);
      return;
    }

    const sellerName =
      currentUser.user_metadata?.full_name ||
      currentUser.email ||
      "Bilinmeyen Satıcı";

    const isOwner = data.seller_id === currentUser.id || data.seller === sellerName;

    if (!isOwner) {
      setMessage("Bu ürünü düzenleme yetkin yok.");
      setProduct(null);
      setLoading(false);
      return;
    }

    setProduct(data);
    setTitle(data.title || "");
    setCategory(data.category || "Web Site");
    setPrice(data.price || "");
    setDescription(data.description || "");
    setTagsInput(tagsToInput(data.tags));

    setLicenseType(data.license_type || "Kişisel Kullanım");
    setPreviewType(data.preview_type || "Kapak + Galeri");
    setPreviewNote(data.preview_note || "");

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

  useEffect(() => {
    loadProduct();
  }, [router.isReady, id]);

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

  function validateBeforeSave() {
    if (!title.trim()) return "Ürün adı boş olamaz.";
    if (!price.trim()) return "Fiyat alanı boş olamaz.";
    if (!description.trim()) return "Açıklama alanı boş olamaz.";

    if (zipFile && zipFile.size > maxProductFileSize) {
      return "Ürün dosyası en fazla 200 MB olabilir.";
    }

    if (galleryImages.length + galleryFiles.length > maxGalleryImages) {
      return "Bir üründe en fazla 12 galeri görseli olabilir.";
    }

    return "";
  }

  async function handleUpdate(event: React.FormEvent) {
    event.preventDefault();

    if (!product || !user) {
      setMessage("Ürün veya kullanıcı bilgisi bulunamadı.");
      return;
    }

    const validationMessage = validateBeforeSave();

    if (validationMessage) {
      setMessage(validationMessage);
      return;
    }

    setSaving(true);
    setMessage("");

    let newFilePath = product.file_path;
    let newFileName = product.file_name;
    let newFileType = product.file_type;
    let newFileSize = product.file_size;
    let newImageUrl = product.image_url;

    try {
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
          setMessage("Yeni ürün dosyası yüklenemedi: " + uploadError.message);
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
        const imagePath = `${user.id}/${product.id}/${Date.now()}-${safeFileName(
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

      const selectedLicense = getLicenseInfo(licenseType);
      const selectedPreview = getPreviewInfo(previewType);

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

          preview_type: previewType,
          preview_note: previewNote.trim() || selectedPreview.description,

          tags: parseTags(tagsInput),

          status: "Onay Bekliyor",
          security_status: "Taranmadı",
          security_note:
            "Ürün satıcı tarafından güncellendi. Admin güvenlik incelemesi bekleniyor.",
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
          const imagePath = `${user.id}/${product.id}/gallery/${Date.now()}-${index}-${safeFileName(
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

      router.push("/seller/products");
    } catch (error) {
      setSaving(false);
      setMessage(
        error instanceof Error
          ? "Ürün güncellenirken hata oluştu: " + error.message
          : "Ürün güncellenirken bilinmeyen hata oluştu."
      );
    }
  }

  const steps = [
    { key: "basic", label: "1. Temel Bilgiler" },
    { key: "files", label: "2. Dosyalar ve Kapak" },
    { key: "gallery", label: "3. Galeri" },
    { key: "license", label: "4. Lisans ve Önizleme" },
    { key: "technical", label: "5. Teknik Bilgiler" },
  ] as const;

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#070A12] text-white">
        Ürün bilgileri yükleniyor...
      </main>
    );
  }

  if (!product) {
    return (
      <main className="min-h-screen bg-[#070A12] text-white">
        <section className="mx-auto max-w-5xl px-6 py-10">
          <SiteNavbar />

          <section className="rounded-3xl border border-red-500/20 bg-red-500/10 p-8 text-center">
            <h1 className="text-3xl font-bold">İşlem yapılamadı</h1>
            <p className="mt-4 text-red-200">{message}</p>

            <a
              href="/seller/products"
              className="mt-8 inline-block rounded-2xl bg-white px-5 py-3 font-semibold text-black"
            >
              Ürünlerime Dön
            </a>
          </section>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#070A12] text-white">
      <section className="mx-auto max-w-5xl px-6 py-10">
        <SiteNavbar />

        <section className="mb-8 rounded-3xl border border-white/10 bg-white/5 p-8">
          <h1 className="text-4xl font-bold">Ürün Düzenle</h1>
          <p className="mt-3 text-gray-400">
            Ürünü adım adım düzenle. Kaydedince ürün tekrar admin onayına düşer.
          </p>
        </section>

        <SellerPanelNav />

        {message && (
          <div className="mb-6 rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-200">
            {message}
          </div>
        )}

        <section className="mb-6 rounded-3xl border border-white/10 bg-white/5 p-3">
          <div className="grid gap-3 md:grid-cols-5">
            {steps.map((step) => (
              <button
                key={step.key}
                type="button"
                onClick={() => setActiveStep(step.key)}
                className={
                  activeStep === step.key
                    ? "rounded-2xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white"
                    : "rounded-2xl border border-white/10 px-4 py-3 text-sm font-semibold text-gray-300 hover:bg-white/10"
                }
              >
                {step.label}
              </button>
            ))}
          </div>
        </section>

        <form
          onSubmit={handleUpdate}
          className="grid gap-6 rounded-3xl border border-white/10 bg-white/5 p-6"
        >
          {activeStep === "basic" && (
            <section className="grid gap-5">
              <div>
                <h2 className="text-2xl font-bold">Temel Bilgiler</h2>
                <p className="mt-2 text-sm text-gray-400">
                  Ürünün adını, kategorisini, fiyatını, açıklamasını ve etiketlerini düzenle.
                </p>
              </div>

              <input
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="Ürün adı"
                required
                className="rounded-2xl border border-white/10 bg-black/30 px-4 py-3 outline-none"
              />

              <select
                value={category}
                onChange={(event) => setCategory(event.target.value)}
                className="rounded-2xl border border-white/10 bg-black/30 px-4 py-3 outline-none"
              >
                {productCategories.map((item) => (
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
                placeholder="Ürün açıklaması"
                required
                className="min-h-36 rounded-2xl border border-white/10 bg-black/30 px-4 py-3 outline-none"
              />

              <input
                value={tagsInput}
                onChange={(event) => setTagsInput(event.target.value)}
                placeholder="Etiketler örnek: react, nextjs, pdf, slayt"
                className="rounded-2xl border border-white/10 bg-black/30 px-4 py-3 outline-none"
              />
            </section>
          )}

          {activeStep === "files" && (
            <section className="grid gap-5">
              <div>
                <h2 className="text-2xl font-bold">Dosyalar ve Kapak</h2>
                <p className="mt-2 text-sm text-gray-400">
                  Mevcut dosyaları gör veya yeni ürün dosyası / kapak görseli seç.
                </p>
              </div>

              {product.image_url ? (
                <img
                  src={product.image_url}
                  alt={product.title}
                  className="h-72 w-full rounded-3xl object-cover"
                />
              ) : (
                <div className="flex h-72 w-full items-center justify-center rounded-3xl bg-black/30 text-gray-500">
                  Mevcut kapak görseli yok
                </div>
              )}

              <div className="rounded-2xl border border-white/10 bg-black/30 p-4">
                <p className="text-sm text-gray-400">Mevcut ürün dosyası</p>
                <p className="mt-2 break-all font-semibold">
                  {product.file_name || product.file_path || "Dosya yok"}
                </p>
                <p className="mt-2 text-sm text-gray-400">
                  Tür: {product.file_type || "Dijital Dosya"} • Boyut: {formatFileSize(product.file_size)}
                </p>
              </div>

              <label className="rounded-2xl border border-white/10 bg-black/30 px-4 py-4">
                <p className="mb-2 text-sm text-gray-400">Yeni kapak görseli seç</p>
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/jpg,image/webp"
                  onChange={(event) => setCoverImage(event.target.files?.[0] || null)}
                  className="w-full text-sm text-gray-300"
                />
                {coverImage && (
                  <p className="mt-2 text-xs text-green-300">
                    Seçilen görsel: {coverImage.name}
                  </p>
                )}
              </label>

              <label className="rounded-2xl border border-white/10 bg-black/30 px-4 py-4">
                <p className="mb-2 text-sm text-gray-400">Yeni ürün dosyası seç</p>
                <input
                  type="file"
                  accept=".zip,.pdf,.ppt,.pptx,.doc,.docx,.xls,.xlsx,.txt,.csv,.png,.jpg,.jpeg,.webp,.json,application/zip,application/x-zip-compressed,application/pdf"
                  onChange={(event) => setZipFile(event.target.files?.[0] || null)}
                  className="w-full text-sm text-gray-300"
                />
                {zipFile && (
                  <p className="mt-2 text-xs text-green-300">
                    Seçilen dosya: {zipFile.name} — {detectFileType(zipFile.name)}
                  </p>
                )}
                <p className="mt-2 text-xs text-gray-500">
                  Yeni dosya seçmezsen mevcut ürün dosyası korunur.
                </p>
              </label>
            </section>
          )}

          {activeStep === "gallery" && (
            <section className="grid gap-5">
              <div>
                <h2 className="text-2xl font-bold">Galeri Görselleri</h2>
                <p className="mt-2 text-sm text-gray-400">
                  Ürün detayında gösterilen ek ekran görüntülerini yönet.
                </p>
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                {galleryImages.map((image) => (
                  <div key={image.id} className="rounded-2xl border border-white/10 bg-black/30 p-3">
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

              <label className="rounded-2xl border border-white/10 bg-black/30 px-4 py-4">
                <p className="mb-2 text-sm text-gray-400">Yeni galeri görselleri ekle</p>
                <input
                  type="file"
                  multiple
                  accept="image/png,image/jpeg,image/jpg,image/webp"
                  onChange={(event) => setGalleryFiles(Array.from(event.target.files || []))}
                  className="w-full text-sm text-gray-300"
                />
                {galleryFiles.length > 0 && (
                  <p className="mt-2 text-xs text-green-300">
                    {galleryFiles.length} yeni görsel seçildi.
                  </p>
                )}
              </label>
            </section>
          )}

          {activeStep === "license" && (
            <section className="grid gap-5">
              <div>
                <h2 className="text-2xl font-bold">Lisans ve Önizleme</h2>
                <p className="mt-2 text-sm text-gray-400">
                  Ürünün kullanım hakkını ve satın alma öncesi önizleme bilgisini düzenle.
                </p>
              </div>

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

              <label className="rounded-2xl border border-white/10 bg-black/30 px-4 py-4">
                <p className="mb-2 text-sm text-gray-400">Önizleme tipi</p>
                <select
                  value={previewType}
                  onChange={(event) => setPreviewType(event.target.value)}
                  className="w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 outline-none"
                >
                  {productPreviewTypes.map((item) => (
                    <option key={item.type} value={item.type}>
                      {item.type}
                    </option>
                  ))}
                </select>
                <p className="mt-2 text-xs text-gray-500">
                  {getPreviewInfo(previewType).description}
                </p>
              </label>

              <textarea
                value={previewNote}
                onChange={(event) => setPreviewNote(event.target.value)}
                placeholder="Önizleme açıklaması"
                className="min-h-28 rounded-2xl border border-white/10 bg-black/30 px-4 py-3 outline-none"
              />
            </section>
          )}

          {activeStep === "technical" && (
            <section className="grid gap-5">
              <div>
                <h2 className="text-2xl font-bold">Teknik Bilgiler</h2>
                <p className="mt-2 text-sm text-gray-400">
                  Demo linki, teknoloji bilgisi, gereksinimler ve kurulum notlarını düzenle.
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
                placeholder="Teknolojiler örnek: Next.js, Tailwind, Supabase"
                className="rounded-2xl border border-white/10 bg-black/30 px-4 py-3 outline-none"
              />

              <textarea
                value={requirements}
                onChange={(event) => setRequirements(event.target.value)}
                placeholder="Gereksinimler"
                className="min-h-24 rounded-2xl border border-white/10 bg-black/30 px-4 py-3 outline-none"
              />

              <textarea
                value={setupNotes}
                onChange={(event) => setSetupNotes(event.target.value)}
                placeholder="Kurulum notları"
                className="min-h-32 rounded-2xl border border-white/10 bg-black/30 px-4 py-3 outline-none"
              />
            </section>
          )}

          <div className="flex flex-col gap-3 border-t border-white/10 pt-6 md:flex-row md:items-center md:justify-between">
            <p className="text-sm text-gray-400">
              Kaydedince ürün tekrar admin onayına ve güvenlik incelemesine düşer.
            </p>

            <div className="flex gap-3">
              {activeStep !== "basic" && (
                <button
                  type="button"
                  onClick={() => {
                    const currentIndex = steps.findIndex((step) => step.key === activeStep);
                    setActiveStep(steps[Math.max(0, currentIndex - 1)].key);
                  }}
                  className="rounded-2xl border border-white/15 px-5 py-3 text-sm font-semibold hover:bg-white/10"
                >
                  Geri
                </button>
              )}

              {activeStep !== "technical" ? (
                <button
                  type="button"
                  onClick={() => {
                    const currentIndex = steps.findIndex((step) => step.key === activeStep);
                    setActiveStep(steps[Math.min(steps.length - 1, currentIndex + 1)].key);
                  }}
                  className="rounded-2xl bg-blue-600 px-5 py-3 text-sm font-semibold hover:bg-blue-500"
                >
                  Devam Et
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-2xl bg-green-600 px-5 py-3 text-sm font-semibold hover:bg-green-500 disabled:opacity-60"
                >
                  {saving ? "Kaydediliyor..." : "Değişiklikleri Kaydet"}
                </button>
              )}
            </div>
          </div>
        </form>
      </section>
    </main>
  );
}
