import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import SiteNavbar from "@/components/SiteNavbar";
import SellerPanelNav from "@/components/SellerPanelNav";
import { productCategories } from "@/lib/productCategories";
import { productLicenses, getLicenseInfo } from "@/lib/productLicenses";
import { productPreviewTypes, getPreviewInfo } from "@/lib/productPreviewTypes";
import { parseTags } from "@/lib/tags";
import { ensureSellerProfile } from "@/lib/sellerAccess";

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

const maxProductFileSize = 200 * 1024 * 1024;

function withTimeout<T>(
  promise: PromiseLike<T>,
  ms: number,
  message: string
): Promise<T> {
  return Promise.race([
    promise as Promise<T>,
    new Promise<T>((_, reject) => {
      setTimeout(() => reject(new Error(message)), ms);
    }),
  ]);
}

function detectFileType(fileName: string) {
  const lower = fileName.toLowerCase();

  if (lower.endsWith(".zip")) return "ZIP Proje Dosyası";
  if (lower.endsWith(".rar") || lower.endsWith(".7z") || lower.endsWith(".tar") || lower.endsWith(".gz")) {
    return "Arşiv Dosyası";
  }
  if (lower.endsWith(".pdf")) return "PDF Doküman";
  if (lower.endsWith(".ppt") || lower.endsWith(".pptx")) return "Ders Slaytı / Sunum";
  if (lower.endsWith(".doc") || lower.endsWith(".docx")) return "Word Dokümanı";
  if (lower.endsWith(".xls") || lower.endsWith(".xlsx")) return "Excel Dosyası";
  if (lower.endsWith(".txt")) return "Metin Dosyası";
  if (lower.endsWith(".csv")) return "CSV Dosyası";
  if (lower.endsWith(".png") || lower.endsWith(".jpg") || lower.endsWith(".jpeg") || lower.endsWith(".webp")) {
    return "Görsel Dosyası";
  }
  if (lower.endsWith(".json")) return "JSON Dosyası";
  if ([".exe", ".dll", ".bat", ".cmd", ".ps1", ".apk", ".jar"].some((ext) => lower.endsWith(ext))) {
    return "Yüksek Riskli Dosya";
  }

  return "Dijital Dosya";
}

export default function SellerNewProductPage() {
  const router = useRouter();

  const [user, setUser] = useState<User | null>(null);
  const [activeStep, setActiveStep] = useState<"basic" | "files" | "license" | "technical">("basic");

  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("Web Site");
  const [price, setPrice] = useState("");
  const [description, setDescription] = useState("");
  const [tagsInput, setTagsInput] = useState("");

  const [licenseType, setLicenseType] = useState("Kişisel Kullanım");
  const [previewType, setPreviewType] = useState("Kapak + Galeri");
  const [previewNote, setPreviewNote] = useState("");

  const [demoUrl, setDemoUrl] = useState("");
  const [techStack, setTechStack] = useState("");
  const [requirements, setRequirements] = useState("");
  const [setupNotes, setSetupNotes] = useState("");

  const [coverImage, setCoverImage] = useState<File | null>(null);
  const [productFile, setProductFile] = useState<File | null>(null);

  const [loadingUser, setLoadingUser] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    async function loadUser() {
      const { data } = await supabase.auth.getUser();

      if (!data.user) {
        router.push("/login");
        return;
      }

      const { error: sellerError } = await ensureSellerProfile(data.user.id);

      if (sellerError) {
        setMessage(sellerError);
      }

      setUser(data.user);
      setLoadingUser(false);
    }

    loadUser();
  }, [router]);

  function sellerNameFor(currentUser: User) {
    return currentUser.user_metadata?.full_name || currentUser.email || "Bilinmeyen Satıcı";
  }

  function validateBeforeSubmit() {
    if (!title.trim()) return "Ürün adı boş olamaz.";
    if (!price.trim()) return "Fiyat alanı boş olamaz.";
    if (!description.trim()) return "Açıklama alanı boş olamaz.";
    if (!coverImage) return "Lütfen kapak görseli seç.";
    if (!productFile) return "Lütfen ürün dosyası seç.";

    if (productFile.size > maxProductFileSize) {
      return "Ürün dosyası en fazla 200 MB olabilir.";
    }

    return "";
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();

    if (!user) {
      setMessage("Ürün eklemek için giriş yapmalısın.");
      return;
    }

    const validationMessage = validateBeforeSubmit();

    if (validationMessage) {
      setMessage(validationMessage);
      return;
    }

    if (!coverImage || !productFile) return;

    setSaving(true);
    setMessage("");

    try {
      const productId = String(Date.now());
      const sellerName = sellerNameFor(user);

      const filePath = `${user.id}/${productId}/${safeFileName(productFile.name)}`;
      const imagePath = `${user.id}/${productId}/${safeFileName(coverImage.name)}`;

      const { error: fileUploadError } = await withTimeout(
        supabase.storage
          .from("product-quarantine")
          .upload(filePath, productFile, {
            cacheControl: "3600",
            upsert: false,
          }),
        120000,
        "Ürün dosyası yükleme 120 saniye içinde tamamlanmadı."
      );

      if (fileUploadError) {
        setMessage("Ürün dosyası yüklenemedi: " + fileUploadError.message);
        setSaving(false);
        return;
      }

      const { error: imageUploadError } = await withTimeout(
        supabase.storage
          .from("product-images")
          .upload(imagePath, coverImage, {
            cacheControl: "3600",
            upsert: false,
          }),
        60000,
        "Kapak görseli yükleme 60 saniye içinde tamamlanmadı."
      );

      if (imageUploadError) {
        setMessage("Kapak görseli yüklenemedi: " + imageUploadError.message);
        setSaving(false);
        return;
      }

      const { data: publicImage } = supabase.storage
        .from("product-images")
        .getPublicUrl(imagePath);

      const selectedLicense = getLicenseInfo(licenseType);
      const selectedPreview = getPreviewInfo(previewType);
      const detectedFileType = detectFileType(productFile.name);

      const newProduct = {
        id: productId,
        title,
        category,
        price,
        seller: sellerName,
        seller_id: user.id,
        status: "pending_scan",
        description,

        file_path: null,
        quarantine_file_path: filePath,
        quarantine_bucket: "product-quarantine",
        approved_file_path: null,
        approved_bucket: "product-files",
        file_name: productFile.name,
        file_type: detectedFileType,
        file_size: productFile.size,

        image_url: publicImage.publicUrl,

        security_status: "Taranıyor",
        security_note:
          "Dosya karantinaya alındı. Otomatik güçlü güvenlik taraması bekleniyor.",
        strong_scan_status: "queued",

        license_type: selectedLicense.type,
        license_summary: selectedLicense.summary,
        license_allows_commercial: selectedLicense.allowsCommercial,
        license_allows_resale: selectedLicense.allowsResale,

        demo_url: demoUrl.trim() || null,
        tech_stack: techStack.trim() || null,
        requirements: requirements.trim() || null,
        setup_notes: setupNotes.trim() || null,

        preview_type: previewType,
        preview_note: previewNote.trim() || selectedPreview.description,

        tags: parseTags(tagsInput),
      };

      const { error } = await withTimeout(
        supabase.from("products").insert(newProduct),
        30000,
        "Ürün kaydı 30 saniye içinde oluşturulamadı."
      );

      if (error) {
        setMessage("Ürün eklenirken hata oluştu: " + error.message);
        setSaving(false);
        return;
      }

      const { error: scanJobError } = await withTimeout(
        supabase.from("security_scan_jobs").insert({
          product_id: productId,
          requested_by: user.id,
          status: "queued",
          scan_type: "full",
          priority: 5,
          retry_count: 0,
          max_retries: 3,
          next_retry_at: null,
          last_error: null,
          report: {
            message: "Yeni ürün dosyası product-quarantine bucket içine alındı. Güçlü tarama bekleniyor.",
          },
        }),
        30000,
        "Tarama kuyruğu 30 saniye içinde oluşturulamadı."
      );

      if (scanJobError) {
        setMessage("Ürün eklendi fakat tarama kuyruğu oluşturulamadı: " + scanJobError.message);
        setSaving(false);
        return;
      }

      router.push("/seller/products");
    } catch (error) {
      setMessage(
        error instanceof Error
          ? "Ürün eklenirken hata oluştu: " + error.message
          : "Ürün eklenirken bilinmeyen hata oluştu."
      );
      setSaving(false);
    }
  }

  const steps = [
    { key: "basic", label: "1. Temel Bilgiler" },
    { key: "files", label: "2. Dosyalar" },
    { key: "license", label: "3. Lisans ve Önizleme" },
    { key: "technical", label: "4. Teknik Bilgiler" },
  ] as const;

  if (loadingUser) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#070A12] text-white">
        Satıcı bilgisi yükleniyor...
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#070A12] text-white">
      <section className="mx-auto max-w-5xl px-6 py-10">
        <SiteNavbar />

        <section className="mb-8 rounded-3xl border border-white/10 bg-white/5 p-8">
          <h1 className="text-4xl font-bold">Yeni Ürün Yükle</h1>
          <p className="mt-3 text-gray-400">
            Ürün bilgilerini adım adım ekle. Güvenli dosyalar taramadan sonra otomatik yayına alınır.
          </p>
        </section>

        <SellerPanelNav />

        {message && (
          <div className="mb-6 rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-200">
            {message}
          </div>
        )}

        <section className="mb-6 rounded-3xl border border-white/10 bg-white/5 p-3">
          <div className="grid gap-3 md:grid-cols-4">
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
          onSubmit={handleSubmit}
          className="grid gap-6 rounded-3xl border border-white/10 bg-white/5 p-6"
        >
          {activeStep === "basic" && (
            <section className="grid gap-5">
              <div>
                <h2 className="text-2xl font-bold">Temel Bilgiler</h2>
                <p className="mt-2 text-sm text-gray-400">
                  Ürünün adı, kategorisi, fiyatı, açıklaması ve etiketleri.
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
                <h2 className="text-2xl font-bold">Dosyalar</h2>
                <p className="mt-2 text-sm text-gray-400">
                  Kapak görseli ve satılacak ürün dosyasını seç. Tüm dosya türleri kabul edilir; yüksek riskli dosyalar admin incelemesine düşer.
                </p>
              </div>

              <label className="rounded-2xl border border-white/10 bg-black/30 px-4 py-4">
                <p className="mb-2 text-sm text-gray-400">Kapak görseli</p>
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/jpg,image/webp"
                  onChange={(event) => setCoverImage(event.target.files?.[0] || null)}
                  required
                  className="w-full text-sm text-gray-300"
                />
                {coverImage && (
                  <p className="mt-2 text-xs text-green-300">
                    Seçilen görsel: {coverImage.name}
                  </p>
                )}
              </label>

              <label className="rounded-2xl border border-white/10 bg-black/30 px-4 py-4">
                <p className="mb-2 text-sm text-gray-400">Ürün dosyası</p>
                <input
                  type="file"
                  onChange={(event) => setProductFile(event.target.files?.[0] || null)}
                  required
                  className="w-full text-sm text-gray-300"
                />
                {productFile && (
                  <p className="mt-2 text-xs text-green-300">
                    Seçilen dosya: {productFile.name} — {detectFileType(productFile.name)}
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
                  Kullanım hakkı ve satın alma öncesi ürünün nasıl tanıtılacağını belirle.
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
                  Kod projeleri için demo, teknoloji ve kurulum bilgilerini ekleyebilirsin.
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
            <div className="text-sm text-gray-400">
              Eksik zorunlu alanlar varsa sistem uyarı verecek.
            </div>

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
                  {saving ? "Ürün gönderiliyor..." : "Ürünü Admin Onayına Gönder"}
                </button>
              )}
            </div>
          </div>
        </form>
      </section>
    </main>
  );
}
