import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { supabase } from "@/lib/supabase";
import SiteNavbar from "@/components/SiteNavbar";
import SellerPanelNav from "@/components/SellerPanelNav";

type Withdrawal = {
  id: string;
  amount: number;
  iban: string;
  status: string;
  created_at: string;
};

export default function SellerDashboard() {
  const router = useRouter();
  const [balance, setBalance] = useState<number>(0);
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Form States
  const [amount, setAmount] = useState("");
  const [iban, setIban] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState({ text: "", type: "" });

  useEffect(() => {
    async function loadDashboard() {
      const { data: userData } = await supabase.auth.getUser();
      
      if (!userData.user) {
        router.push("/login");
        return;
      }
      
      // 1. Satıcının Bakiyesini (Balance) Çek
      const { data: profile } = await supabase
        .from("profiles")
        .select("balance")
        .eq("id", userData.user.id)
        .single();

      if (profile) {
        setBalance(profile.balance || 0);
      }

      // 2. Geçmiş Para Çekme Taleplerini Çek
      const { data: history } = await supabase
        .from("withdrawals")
        .select("*")
        .eq("seller_id", userData.user.id)
        .order("created_at", { ascending: false });

      if (history) {
        setWithdrawals(history);
      }

      setLoading(false);
    }

    loadDashboard();
  }, [router]);

  const handleWithdraw = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setMessage({ text: "", type: "" });

    const withdrawAmount = Number(amount);

    if (withdrawAmount <= 0) {
      setMessage({ text: "Lütfen geçerli bir tutar girin.", type: "error" });
      setSubmitting(false);
      return;
    }

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData.session?.access_token;

      if (!accessToken) {
        throw new Error("Oturum doğrulanamadı. Lütfen tekrar giriş yap.");
      }

      const response = await fetch("/api/seller/withdraw", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          amount: withdrawAmount,
          iban: iban,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "İşlem başarısız.");
      }

      setMessage({ text: "Para çekme talebiniz başarıyla oluşturuldu!", type: "success" });
      setBalance(data.newBalance);
      setAmount("");
      setIban("");

      if (data.withdrawal) {
        setWithdrawals((prev) => [data.withdrawal, ...prev]);
      }

    } catch (error: unknown) {
      setMessage({
        text: error instanceof Error ? error.message : "İşlem başarısız.",
        type: "error",
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <main className="flex min-h-screen items-center justify-center bg-[#070A12] text-white">Yükleniyor...</main>;
  }

  return (
    <main className="min-h-screen bg-[#070A12] text-white">
      <section className="mx-auto max-w-6xl px-6 py-10">
        <SiteNavbar />

        <div className="mb-8 mt-4 rounded-3xl border border-white/10 bg-white/5 p-8">
          <h1 className="text-3xl font-bold">Satıcı Paneli</h1>
          <p className="mt-2 text-gray-400">Kazançlarını görüntüle ve banka hesabına aktar.</p>
        </div>

        <SellerPanelNav />

        <div className="grid gap-8 md:grid-cols-[1fr_400px]">
          {/* Sol Kısım: Bakiye ve Para Çekme Formu */}
          <div className="flex flex-col gap-8">
            <div className="rounded-3xl border border-blue-500/30 bg-gradient-to-br from-blue-600/20 to-transparent p-8">
              <p className="text-sm font-semibold uppercase tracking-wider text-blue-300">Mevcut Bakiye</p>
              <h2 className="mt-2 text-5xl font-black text-white">{balance.toFixed(2)} TL</h2>
            </div>

            <div className="rounded-3xl border border-white/10 bg-white/5 p-8">
              <h3 className="text-2xl font-bold">Para Çek</h3>
              <p className="mt-2 text-sm text-gray-400">Bakiyeni banka hesabına (IBAN) aktarmak için bir talep oluştur.</p>

              {message.text && (
                <div className={`mt-6 rounded-2xl p-4 text-sm font-medium ${message.type === "error" ? "bg-red-500/10 text-red-400 border border-red-500/20" : "bg-green-500/10 text-green-400 border border-green-500/20"}`}>
                  {message.text}
                </div>
              )}

              <form onSubmit={handleWithdraw} className="mt-6 grid gap-5">
                <div>
                  <label className="mb-2 block text-sm text-gray-400">Çekilecek Tutar (TL)</label>
                  <input type="number" min="1" max={balance} step="0.01" required value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="Örn: 150.00" className="w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-white outline-none focus:border-blue-500 transition-colors" />
                </div>
                <div>
                  <label className="mb-2 block text-sm text-gray-400">IBAN Numaran</label>
                  <input type="text" required value={iban} onChange={(e) => setIban(e.target.value)} placeholder="TR..." className="w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-white outline-none focus:border-blue-500 transition-colors" />
                </div>
                <button type="submit" disabled={submitting || balance <= 0} className="mt-2 rounded-2xl bg-blue-600 px-5 py-4 font-semibold text-white transition hover:bg-blue-500 disabled:opacity-50">
                  {submitting ? "İşleniyor..." : "Talebi Gönder"}
                </button>
              </form>
            </div>
          </div>

          {/* Sağ Kısım: Çekim Geçmişi */}
          <div className="rounded-3xl border border-white/10 bg-white/5 p-8">
            <h3 className="text-xl font-bold">İşlem Geçmişi</h3>
            
            <div className="mt-6 flex flex-col gap-4">
              {withdrawals.length === 0 ? (
                <p className="text-sm text-gray-400">Henüz para çekme talebiniz bulunmuyor.</p>
              ) : (
                withdrawals.map((w) => (
                  <div key={w.id} className="flex items-center justify-between rounded-2xl bg-black/20 p-4 border border-white/5">
                    <div>
                      <p className="font-bold">{w.amount.toFixed(2)} TL</p>
                      <p className="mt-1 text-xs text-gray-500">{new Date(w.created_at).toLocaleDateString("tr-TR")}</p>
                    </div>
                    <span className={`rounded-full px-3 py-1 text-xs font-semibold ${w.status === "Bekliyor" ? "bg-yellow-500/20 text-yellow-300" : w.status === "Tamamlandı" ? "bg-green-500/20 text-green-300" : "bg-red-500/20 text-red-300"}`}>
                      {w.status}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>

        </div>
      </section>
    </main>
  );
}
