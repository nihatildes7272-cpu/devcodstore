import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import AdminNavbar from "@/components/AdminNavbar";

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

const statusTabs = ["pending", "approved", "rejected", "all"] as const;

export default function AdminSellerApplicationsPage() {
  const [applications, setApplications] = useState<SellerApplication[]>([]);
  const [activeStatus, setActiveStatus] =
    useState<(typeof statusTabs)[number]>("pending");
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  async function loadApplications() {
    setLoading(true);
    setMessage("");

    let query = supabase
      .from("seller_applications")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(100);

    if (activeStatus !== "all") {
      query = query.eq("status", activeStatus);
    }

    const { data, error } = await query;

    if (error) {
      setMessage("Başvurular yüklenemedi: " + error.message);
      setApplications([]);
    } else {
      setApplications(data || []);
    }

    setLoading(false);
  }

  useEffect(() => {
    loadApplications();
  }, [activeStatus]);

  async function approveApplication(application: SellerApplication) {
    const note = window.prompt("Admin notu:", "Satıcı başvurusu onaylandı.");

    if (note === null) return;

    const { data: userData } = await supabase.auth.getUser();

    const { error: appError } = await supabase
      .from("seller_applications")
      .update({
        status: "approved",
        admin_note: note,
        reviewed_by: userData.user?.id || null,
        reviewed_at: new Date().toISOString(),
      })
      .eq("id", application.id);

    if (appError) {
      setMessage("Başvuru onaylanamadı: " + appError.message);
      return;
    }

    const { error: profileError } = await supabase
      .from("profiles")
      .update({
        account_type: "seller",
        seller_status: "approved",
        seller_verified_at: new Date().toISOString(),
        seller_rejection_reason: null,
      })
      .eq("id", application.user_id);

    if (profileError) {
      setMessage("Profil satıcı yapılamadı: " + profileError.message);
      return;
    }

    await loadApplications();
  }

  async function rejectApplication(application: SellerApplication) {
    const reason = window.prompt("Red nedeni:", "Başvuru kriterleri karşılamıyor.");

    if (reason === null) return;

    const { data: userData } = await supabase.auth.getUser();

    const { error: appError } = await supabase
      .from("seller_applications")
      .update({
        status: "rejected",
        admin_note: reason,
        reviewed_by: userData.user?.id || null,
        reviewed_at: new Date().toISOString(),
      })
      .eq("id", application.id);

    if (appError) {
      setMessage("Başvuru reddedilemedi: " + appError.message);
      return;
    }

    const { error: profileError } = await supabase
      .from("profiles")
      .update({
        seller_status: "rejected",
        seller_rejection_reason: reason,
      })
      .eq("id", application.user_id);

    if (profileError) {
      setMessage("Profil red durumuna alınamadı: " + profileError.message);
      return;
    }

    await loadApplications();
  }

  function statusClass(status: string) {
    if (status === "approved") {
      return "rounded-full bg-green-500/20 px-4 py-2 text-sm text-green-300";
    }

    if (status === "rejected") {
      return "rounded-full bg-red-500/20 px-4 py-2 text-sm text-red-300";
    }

    return "rounded-full bg-yellow-500/20 px-4 py-2 text-sm text-yellow-300";
  }

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#070A12] text-white">
        Satıcı başvuruları yükleniyor...
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#070A12] text-white">
      <section className="mx-auto max-w-7xl px-6 py-10">
        <AdminNavbar />

        <section className="mb-8 rounded-3xl border border-white/10 bg-white/5 p-8">
          <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="text-4xl font-bold">Satıcı Başvuruları</h1>
              <p className="mt-3 text-gray-400">
                Satıcı olmak isteyen kullanıcıların başvurularını onayla veya reddet.
              </p>
            </div>

            <button
              onClick={loadApplications}
              className="rounded-2xl bg-blue-600 px-5 py-3 text-sm font-semibold hover:bg-blue-500"
            >
              Yenile
            </button>
          </div>
        </section>

        {message && (
          <div className="mb-6 rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-200">
            {message}
          </div>
        )}

        <section className="mb-8 rounded-3xl border border-white/10 bg-white/5 p-3">
          <div className="grid gap-3 md:grid-cols-4">
            {statusTabs.map((status) => (
              <button
                key={status}
                onClick={() => setActiveStatus(status)}
                className={
                  activeStatus === status
                    ? "rounded-2xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white"
                    : "rounded-2xl border border-white/10 px-5 py-3 text-sm font-semibold text-gray-300 hover:bg-white/10"
                }
              >
                {status === "pending"
                  ? "Bekleyen"
                  : status === "approved"
                  ? "Onaylanan"
                  : status === "rejected"
                  ? "Reddedilen"
                  : "Tümü"}
              </button>
            ))}
          </div>
        </section>

        <section className="grid gap-5">
          {applications.map((application) => (
            <div key={application.id} className="rounded-3xl border border-white/10 bg-white/5 p-6">
              <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <div className="flex flex-wrap gap-3">
                    <span className={statusClass(application.status)}>
                      {application.status}
                    </span>
                  </div>

                  <h2 className="mt-4 text-2xl font-bold">{application.full_name}</h2>

                  <div className="mt-3 grid gap-1 text-sm text-gray-400">
                    <p>Telefon: {application.phone || "Yok"}</p>
                    <p>Portfolyo: {application.portfolio_url || "Yok"}</p>
                    <p className="break-all">Kullanıcı ID: {application.user_id}</p>
                  </div>

                  <p className="mt-5 leading-7 text-gray-300">
                    {application.message}
                  </p>

                  {application.admin_note && (
                    <p className="mt-4 text-sm text-gray-500">
                      Admin notu: {application.admin_note}
                    </p>
                  )}
                </div>

                <div className="grid gap-3 lg:min-w-48">
                  {application.status === "pending" && (
                    <>
                      <button
                        onClick={() => approveApplication(application)}
                        className="rounded-2xl bg-green-600 px-4 py-3 text-sm font-semibold hover:bg-green-500"
                      >
                        Onayla
                      </button>

                      <button
                        onClick={() => rejectApplication(application)}
                        className="rounded-2xl bg-red-600 px-4 py-3 text-sm font-semibold hover:bg-red-500"
                      >
                        Reddet
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          ))}

          {applications.length === 0 && (
            <div className="rounded-3xl border border-white/10 bg-white/5 p-8 text-center text-gray-400">
              Başvuru bulunamadı.
            </div>
          )}
        </section>
      </section>
    </main>
  );
}
