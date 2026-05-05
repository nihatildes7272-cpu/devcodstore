import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import AdminNavbar from "@/components/AdminNavbar";

type Withdrawal = {
  id: string;
  seller_id: string;
  amount: number;
  iban: string;
  status: string;
  created_at: string;
};

type Profile = {
  id: string;
  full_name: string | null;
  email: string | null;
  balance: number;
};

export default function AdminWithdrawalsPage() {
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  async function loadData() {
    setLoading(true);
    setMessage("");

    const { data: wData, error: wError } = await supabase
      .from("withdrawals")
      .select("*")
      .order("created_at", { ascending: false });

    if (wError) {
      setMessage("Talepler yüklenemedi: " + wError.message);
      setLoading(false);
      return;
    }

    const wList = wData || [];
    setWithdrawals(wList);

    const sellerIds = Array.from(new Set(wList.map((w) => w.seller_id)));
    
    if (sellerIds.length > 0) {
      const { data: pData } = await supabase
        .from("profiles")
        .select("id, full_name, email, balance")
        .in("id", sellerIds);
        
      setProfiles(pData || []);
    }

    setLoading(false);
  }

  useEffect(() => {
    loadData();
  }, []);

  async function approveWithdrawal(w: Withdrawal) {
    const confirmed = window.confirm(`${w.amount} TL tutarındaki talebi ödendi olarak işaretlemek istiyor musun?`);
    if (!confirmed) return;

    const { error } = await supabase
      .from("withdrawals")
      .update({ status: "Tamamlandı" })
      .eq("id", w.id);

    if (error) {
      setMessage("Onaylanırken hata oluştu: " + error.message);
      return;
    }
    await loadData();
  }

  async function rejectWithdrawal(w: Withdrawal) {
    const confirmed = window.confirm("Bu talebi reddedip parayı satıcının bakiyesine iade etmek istiyor musun?");
    if (!confirmed) return;

    const sellerProfile = profiles.find((p) => p.id === w.seller_id);
    if (!sellerProfile) {
      setMessage("Satıcı profili bulunamadığı için işlem iptal edildi.");
      return;
    }

    // Parayı bakiyeye geri yükle
    const newBalance = (Number(sellerProfile.balance) || 0) + Number(w.amount);
    
    await supabase.from("profiles").update({ balance: newBalance }).eq("id", w.seller_id);
    await supabase.from("withdrawals").update({ status: "Reddedildi" }).eq("id", w.id);

    await loadData();
  }

  function getSeller(sellerId: string) {
    return profiles.find((p) => p.id === sellerId) || { full_name: "Bilinmiyor", email: "Yok" };
  }

  if (loading) return <main className="flex min-h-screen items-center justify-center bg-[#070A12] text-white">Yükleniyor...</main>;

  const pendingCount = withdrawals.filter(w => w.status === "Bekliyor").length;

  return (
    <main className="min-h-screen bg-[#070A12] text-white">
      <section className="mx-auto max-w-7xl px-6 py-10">
        <AdminNavbar />

        <section className="mb-8 rounded-3xl border border-white/10 bg-gradient-to-r from-white/10 to-transparent p-8 shadow-xl backdrop-blur-md">
          <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="text-4xl font-black tracking-tight">Para Çekme Talepleri</h1>
              <p className="mt-3 text-gray-300">Satıcıların IBAN&apos;larına istedikleri bakiye çekim taleplerini yönet.</p>
            </div>
            <button onClick={loadData} className="rounded-2xl bg-blue-600 px-6 py-3 text-sm font-bold shadow-lg transition hover:bg-blue-500">Yenile</button>
          </div>
        </section>

        {message && (
          <div className="mb-6 rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-200">
            {message}
          </div>
        )}

        <div className="mb-8 rounded-3xl border border-white/10 bg-white/5 p-6 shadow-lg backdrop-blur-sm">
           <p className="text-xs font-bold uppercase tracking-widest text-gray-500">Bekleyen Talep Sayısı</p>
           <h2 className="mt-3 text-4xl font-black text-yellow-400">{pendingCount}</h2>
        </div>

        <section className="grid gap-5">
          {withdrawals.map((w) => {
            const seller = getSeller(w.seller_id);
            
            return (
              <div key={w.id} className="group rounded-3xl border border-white/5 bg-white/5 p-6 transition hover:bg-white/[0.08]">
                <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <div className="flex flex-wrap gap-3">
                      <span className={`rounded-full px-4 py-2 text-sm font-bold ${w.status === "Bekliyor" ? "bg-yellow-500/20 text-yellow-300" : w.status === "Tamamlandı" ? "bg-green-500/20 text-green-300" : "bg-red-500/20 text-red-300"}`}>
                        {w.status}
                      </span>
                    </div>
                    <h2 className="mt-4 text-2xl font-black text-white">{w.amount.toFixed(2)} TL</h2>
                    <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-1 text-sm text-gray-500">
                      <p>👤 Satıcı: {seller.full_name || seller.email}</p>
                      <p>📧 {seller.email}</p>
                      <p>💳 IBAN: <span className="font-mono text-gray-300">{w.iban}</span></p>
                      <p>🕒 {new Date(w.created_at).toLocaleDateString("tr-TR")}</p>
                    </div>
                  </div>

                  {w.status === "Bekliyor" && (
                    <div className="grid gap-3 lg:min-w-48">
                      <button
                        onClick={() => approveWithdrawal(w)}
                        className="rounded-2xl bg-green-600 px-4 py-3 text-sm font-bold shadow-lg transition hover:bg-green-500 hover:scale-105"
                      >
                        Ödendi Olarak İşaretle
                      </button>
                      <button
                        onClick={() => rejectWithdrawal(w)}
                        className="rounded-2xl bg-red-600 px-4 py-3 text-sm font-bold shadow-lg transition hover:bg-red-500 hover:scale-105"
                      >
                        Reddet (İade Et)
                      </button>
                      <p className="mt-2 text-xs text-gray-400 text-center">
                        Ödemeyi bankadan yaptıktan sonra &quot;Ödendi&quot; butonuna basınız.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            );
          })}

          {withdrawals.length === 0 && (
            <div className="rounded-3xl border border-white/10 bg-black/30 p-8 text-center text-gray-400">
              Hiç para çekme talebi bulunmuyor.
            </div>
          )}
        </section>
      </section>
    </main>
  );
}
