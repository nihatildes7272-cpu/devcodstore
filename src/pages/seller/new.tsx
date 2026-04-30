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

function safeImageName(fileName: string) {
  return safeFileName(fileName);
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

export default function SellerNewProductPage() {
  const router = useRouter();

  const [user, setUser] = useState<User | null>(null);

  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("Web Site");
  const [price, setPrice] = useState("");
  const [description, setDescription] = useState("");

  const [licenseType, setLicenseType] = useState("Kişisel Kullanım");
  const [previewType, setPreviewType] = useState("Kapak + Galeri");
  const [previewNote, setPreviewNote] = useState("");
  const [tagsInput, setTagsInput] = useState("");

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

      setUser(data.user);
      setLoadingUser(false);
    }

    loadUser();
  }, [router]);

  function sellerNameFor(currentUser: User) {
    return (
      currentUser.user_metadata?.full_name ||
      currentUser.email ||
      "Bilinmeyen Satıcı"
    );
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();

    if (!user) {
      setMessage("Ürün eklemek için giriş yapmalısın.");
      return;
    }

    if (!coverImage) {
      setMessage("Lütfen kapak görseli seç.");
      return;
    }

    if (!productFile) {
      setMessage("Lütfen ürün dosyası seç.");
      return;
    }

    setSaving(true);
    setMessage("");

    try {
      const productId = String(Date.now());
      const sellerName = sellerNameFor(user);

      const filePath = `${user.id}/${productId}/${safeFileName(productFile.name)}`;
      const imagePath = `${user.id}/${productId}/${safeImageName(coverImage.name)}`;

      const { error: fileUploadError } = await supabase.storage
        .from("product-files")
        .upload(filePath, productFile, {
          cacheControl: "3600",
          upsert: false,
        });

      if (fileUploadError) {
        setMessage("Ürün dosyası yüklenemedi: " + fileUploadError.message);
        setSaving(false);
        return;
      }

      const { error: imageUploadError } = await supabase.storage
        .from("product-images")
        .upload(imagePath, coverImage, {
          cacheControl: "3600",
          upsert: false,
        });

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
        status: "Onay Bekliyor",
        description,

        file_path: filePath,
        file_name: productFile.name,
        file_type: detectedFileType,
        file_size: productFile.size,

        image_url: publicImage.publicUrl,

        security_status: "Taranmadı",
        security_note:
          "Satıcı tarafından gönderildi. Admin güvenlik incelemesi bekleniyor.",

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

      const { error } = await supabase.from("products").insert(newProduct);

      if (error) {
        setMessage("Ürün eklenirken hata oluştu: " + error.message);
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
            Dijital ürününü, dosyanı, kapak görselini, lisansını ve teknik bilgilerini ekle.
          </p>
        </section>

        <SellerPanelNav />

        {message && (
          <div className="mb-6 rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-200">
            {message}
          </div>
        )}

        <form
          onSubmit={handleSubmit}
          className="grid gap-5 rounded-3xl border border-white/10 bg-white/5 p-6"
        >
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
            className="min-h-24 rounded-2xl border border-white/10 bg-black/30 px-4 py-3 outline-none"
          />

          <section className="grid gap-4 rounded-2xl border border-white/10 bg-black/30 p-4">
            <h2 className="text-xl font-bold">Teknik Bilgiler</h2>

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

          <label className="rounded-2xl border border-white/10 bg-black/30 px-4 py-4">
            <p className="mb-2 text-sm text-gray-400">Kapak görseli</p>
            <input
              type="file"
              accept="image/png,image/jpeg,image/jpg,image/webp"
              onChange={(event) => setCoverImage(event.target.files?.[0] || null)}
              required
              className="w-full text-sm text-gray-300"
            />
          </label>

          <label className="rounded-2xl border border-white/10 bg-black/30 px-4 py-4">
            <p className="mb-2 text-sm text-gray-400">Ürün dosyası</p>
            <input
              type="file"
              accept=".zip,.pdf,.ppt,.pptx,.doc,.docx,.xls,.xlsx,.txt,.csv,.png,.jpg,.jpeg,.webp,.json,application/zip,application/x-zip-compressed,application/pdf"
              onChange={(event) => setProductFile(event.target.files?.[0] || null)}
              required
              className="w-full text-sm text-gray-300"
            />
          </label>

          <button
            type="submit"
            disabled={saving}
            className="rounded-2xl bg-blue-600 px-5 py-4 font-semibold hover:bg-blue-500 disabled:opacity-60"
          >
            {saving ? "Ürün gönderiliyor..." : "Ürünü Admin Onayına Gönder"}
          </button>
        </form>
      </section>
    </main>
  );
}
