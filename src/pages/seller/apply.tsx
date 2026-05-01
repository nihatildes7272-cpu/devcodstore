import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import SiteNavbar from "@/components/SiteNavbar";

type Profile = {
  id: string;
  email: string | null;
  full_name: string | null;
  account_type: string | null;
  seller_status: "not_applied" | "pending" | "approved" | "rejected";
  seller_rejection_reason: string | null;
};

type SellerApplication = {
  id: string;
  user_id: string;
  full_name: string;
  phone: string | null;
  portfolio_url: string | null;
  message: string;
  status: "pending" | "approved" | "rejected";
  admin_note: string | null;
  created_at: string;
};

export default function SellerApplyPage() {
  const router = useRouter();

  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [applications, setApplications] = useState<SellerApplication[]>([]);

  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [portfolioUrl, setPortfolioUrl] = useState("");
  const [applicationMessage, setApplicationMessage] = useState("");

  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [message, setMessage] = useState("");

  async function loadData() {
    setLoading(true);
    setMessage("");

    const { data: userData } = await supabase.auth.getUser();

    if (!userData.user) {
      router.push("/login");
      return;
    }

    setUser(userData.user);

    const { data: profileData, error: profileError } = await supabase
      .from("profiles")
      .select("id,email,full_name,account_type,seller_status,seller_rejection_reason")
      .eq("id", userData.user.id)
      .maybeSingle();

    if (profileError) {
      setMessage("Profil bilgisi yüklenemedi: " + profileError.message);
    }

    setProfile(profileData || null);
    setFullName(profileData?.full_name || userData.user.email || "");

    const { data: appData } = await supabase
      .from("seller_applications")
      .select("*")
      .eq("user_id", userData.user.id)
      .order("created_at", { ascending: false })
      .limit(5);

    setApplications(appData || []);
    setLoading(false);
  }

  useEffect(() => {
    loadData();
  }, []);

  async function submitApplication(event: React.FormEvent) {
    event.preventDefault();

    if (!user) return;

    if (!fullName.trim() || !applicationMessage.trim()) {
      setMessage("Ad soyad ve başvuru açıklaması boş olamaz.");
      return;
    }

    setSending(true);
    setMessage("");

    const { error: appError } = await supabase
      .from("seller_applications")
      .insert({
        user_id: user.id,
        full_name: fullName.trim(),
        phone: phone.trim() || null,
        portfolio_url: portfolioUrl.trim() || null,
        message: applicationMessage.trim(),
        status: "pending",
      });

    if (appError) {
      setMessage("Başvuru gönderilemedi: " + appError.message);
      setSending(false);
      return;
    }

    await supabase
      .from("profiles")
      .update({
        seller_status: "pending",
        seller_rejection_reason: null,
      })
      .eq("id", user.id);

    setSending(false);
    setApplicationMessage("");
    setPhone("");
    setPortfolioUrl("");

    await loadData();
  }

  function statusClass(status: string) {
    if (status === "approved") {
      return "rounded-full bg-green-500/20 px-4 py-2 text-sm text-green-300";
    }

    if (status === "rejected") {
      return "rounded-full bg-red-500/20 px-4 py-2 text-sm text-red-300";
    }

    if (status === "pending") {
      return "rounded-full bg-yellow-500/20 px-4 py-2 text-sm text-yellow-300";
    }

    return "rounded-full bg-gray-500/20 px-4 py-2 text-sm text-gray-300";
  }

  function statusLabel(status?: string | null) {
    if (status === "approved") return "Onaylı Satıcı";
    if (status === "pending") return "Başvuru İncelemede";
    if (status === "rejected") return "Başvuru Reddedildi";
    return "Başvuru Yapılmadı";
  }

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#070A12] text-white">
        Satıcı başvurusu yükleniyor...
      </main>
    );
  }

  const approved = profile?.seller_status === "approved";
  const pending = profile?.seller_status === "pending";

  return (
    <main className="min-h-screen bg-[#070A12] text-white">
      <section className="mx-auto max-w-5xl px-6 py-10">
        <SiteNavbar />

        <section className="mb-8 rounded-3xl border border-white/10 bg-white/5 p-8">
          <h1 className="text-4xl font-bold">Satıcı Başvurusu</h1>
          <p className="mt-3 text-gray-400">
            devcodstore’da ürün satabilmek için admin onaylı satıcı olman gerekir.
          </p>

          <div className="mt-5">
            <span className={statusClass(profile?.seller_status || "not_applied")}>
              {statusLabel(profile?.seller_status)}
            </span>
          </div>
        </section>

        {message && (
          <div className="mb-6 rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-200">
            {message}
          </div>
        )}

        {approved ? (
          <section className="rounded-3xl border border-green-500/20 bg-green-500/10 p-8 text-center">
            <h2 className="text-3xl font-bold">Satıcı hesabın onaylı</h2>
            <p className="mt-3 text-green-200">
              Ürün yükleyebilir ve satıcı panelini kullanabilirsin.
            </p>

            <a
              href="/seller"
              className="mt-8 inline-block rounded-2xl bg-green-600 px-6 py-3 font-semibold hover:bg-green-500"
            >
              Satıcı Paneline Git
            </a>
          </section>
        ) : pending ? (
          <section className="rounded-3xl border border-yellow-500/20 bg-yellow-500/10 p-8 text-center">
            <h2 className="text-3xl font-bold">Başvurun inceleniyor</h2>
            <p className="mt-3 text-yellow-200">
              Admin onayından sonra ürün yükleme hakkın açılacak.
            </p>
          </section>
        ) : (
          <form
            onSubmit={submitApplication}
            className="grid gap-5 rounded-3xl border border-white/10 bg-white/5 p-6"
          >
            <input
              value={fullName}
              onChange={(event) => setFullName(event.target.value)}
              placeholder="Ad soyad / marka adı"
              required
              className="rounded-2xl border border-white/10 bg-black/30 px-4 py-3 outline-none"
            />

            <input
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
              placeholder="Telefon no"
              className="rounded-2xl border border-white/10 bg-black/30 px-4 py-3 outline-none"
            />

            <input
              value={portfolioUrl}
              onChange={(event) => setPortfolioUrl(event.target.value)}
              placeholder="Portfolyo / web sitesi / sosyal medya linki"
              className="rounded-2xl border border-white/10 bg-black/30 px-4 py-3 outline-none"
            />

            <textarea
              value={applicationMessage}
              onChange={(event) => setApplicationMessage(event.target.value)}
              placeholder="Ne tür dijital ürünler satmak istiyorsun? Kısaca açıkla."
              required
              className="min-h-36 rounded-2xl border border-white/10 bg-black/30 px-4 py-3 outline-none"
            />

            {profile?.seller_status === "rejected" && profile.seller_rejection_reason && (
              <div className="rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-200">
                Önceki red nedeni: {profile.seller_rejection_reason}
              </div>
            )}

            <button
              type="submit"
              disabled={sending}
              className="rounded-2xl bg-blue-600 px-5 py-4 font-semibold hover:bg-blue-500 disabled:opacity-60"
            >
              {sending ? "Başvuru gönderiliyor..." : "Başvuruyu Gönder"}
            </button>
          </form>
        )}

        {applications.length > 0 && (
          <section className="mt-10 rounded-3xl border border-white/10 bg-white/5 p-6">
            <h2 className="text-2xl font-bold">Başvuru Geçmişi</h2>

            <div className="mt-6 grid gap-4">
              {applications.map((application) => (
                <div key={application.id} className="rounded-2xl bg-black/30 p-5">
                  <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                    <div>
                      <h3 className="font-bold">{application.full_name}</h3>
                      <p className="mt-2 text-sm leading-6 text-gray-400">
                        {application.message}
                      </p>
                      {application.admin_note && (
                        <p className="mt-2 text-sm text-gray-500">
                          Admin notu: {application.admin_note}
                        </p>
                      )}
                    </div>

                    <span className={statusClass(application.status)}>
                      {application.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}
      </section>
    </main>
  );
}
