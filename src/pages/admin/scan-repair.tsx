import { useState } from "react";
import { supabase } from "@/lib/supabase";
import AdminNavbar from "@/components/AdminNavbar";

type RepairResult = {
  fixed_safe_products?: number;
  fixed_manual_products?: number;
  fixed_risky_products?: number;
  fixed_error_products?: number;
  fixed_scan_jobs?: number;
  checked_at?: string;
};

export default function AdminScanRepairPage() {
  const [running, setRunning] = useState(false);
  const [message, setMessage] = useState("");
  const [result, setResult] = useState<RepairResult | null>(null);

  async function runRepair() {
    const confirmed = window.confirm(
      "Tarama sonrası takılı kalan ürün ve job durumları düzeltilecek. Devam edilsin mi?"
    );

    if (!confirmed) return;

    setRunning(true);
    setMessage("");
    setResult(null);

    const { data, error } = await supabase.rpc("reconcile_product_scan_states");

    if (error) {
      setMessage("Repair işlemi başarısız: " + error.message);
      setRunning(false);
      return;
    }

    setResult(data || {});
    setMessage("Repair işlemi tamamlandı.");
    setRunning(false);
  }

  function value(key: keyof RepairResult) {
    const item = result?.[key];

    if (typeof item === "number") return item;

    return 0;
  }

  return (
    <main className="min-h-screen bg-[#070A12] text-white">
      <section className="mx-auto max-w-7xl px-6 py-10">
        <AdminNavbar />

        <section className="mb-8 rounded-3xl border border-white/10 bg-gradient-to-r from-white/10 to-transparent p-8 shadow-xl backdrop-blur-md">
          <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="text-4xl font-black tracking-tight">Tarama Repair Sistemi</h1>
              <p className="mt-3 text-gray-300">
                Güvenli taranmış ama pending_scan/running durumunda takılı kalan ürünleri ve job kayıtlarını düzeltir.
              </p>
            </div>

            <button
              onClick={runRepair}
              disabled={running}
              className="rounded-2xl bg-blue-600 px-8 py-4 text-sm font-bold shadow-lg shadow-blue-600/20 transition hover:bg-blue-500 hover:scale-105 active:scale-95 disabled:opacity-60"
            >
              {running ? "Repair çalışıyor..." : "Repair Çalıştır"}
            </button>
          </div>
        </section>

        {message && (
          <div className="mb-6 rounded-2xl border border-blue-500/20 bg-blue-500/10 p-4 text-sm text-blue-200">
            {message}
          </div>
        )}

        {result && (
          <section className="grid grid-cols-2 gap-4 md:grid-cols-5 md:gap-6">
            <div className="rounded-3xl border border-white/10 bg-gradient-to-br from-white/10 to-transparent p-6 shadow-lg backdrop-blur-sm">
              <p className="text-xs font-bold uppercase tracking-widest text-gray-500">Güvenli Ürün</p>
              <h2 className="mt-3 text-4xl font-black text-green-400">
                {value("fixed_safe_products")}
              </h2>
            </div>

            <div className="rounded-3xl border border-white/10 bg-gradient-to-br from-white/10 to-transparent p-6 shadow-lg backdrop-blur-sm">
              <p className="text-xs font-bold uppercase tracking-widest text-gray-500">Manuel İnceleme</p>
              <h2 className="mt-3 text-4xl font-black text-yellow-400">
                {value("fixed_manual_products")}
              </h2>
            </div>

            <div className="rounded-3xl border border-white/10 bg-gradient-to-br from-white/10 to-transparent p-6 shadow-lg backdrop-blur-sm">
              <p className="text-xs font-bold uppercase tracking-widest text-gray-500">Riskli Ürün</p>
              <h2 className="mt-3 text-4xl font-black text-red-400">
                {value("fixed_risky_products")}
              </h2>
            </div>

            <div className="rounded-3xl border border-white/10 bg-gradient-to-br from-white/10 to-transparent p-6 shadow-lg backdrop-blur-sm">
              <p className="text-xs font-bold uppercase tracking-widest text-gray-500">Tarama Hatası</p>
              <h2 className="mt-3 text-4xl font-black text-blue-400">
                {value("fixed_error_products")}
              </h2>
            </div>

            <div className="rounded-3xl border border-white/10 bg-gradient-to-br from-white/10 to-transparent p-6 shadow-lg backdrop-blur-sm">
              <p className="text-xs font-bold uppercase tracking-widest text-gray-500">Job Düzeltildi</p>
              <h2 className="mt-3 text-4xl font-black text-white">
                {value("fixed_scan_jobs")}
              </h2>
            </div>
          </section>
        )}

        <section className="mt-12 rounded-3xl border border-blue-500/20 bg-gradient-to-br from-blue-500/5 to-transparent p-8 shadow-xl">
          <h2 className="text-2xl font-black tracking-tight text-blue-300">Ne işe yarar?</h2>

          <div className="mt-6 grid gap-4 text-gray-300 text-sm leading-relaxed">
            <p>
              Güvenli taranmış ama <b>pending_scan</b> durumunda kalan ürünleri doğru duruma alır.
            </p>
            <p>
              Güvenli ürünleri satıcı güven puanına göre <b>Yayında</b> veya <b>Onay Bekliyor</b> yapar.
            </p>
            <p>
              <b>Manuel İnceleme</b> olan ürünleri Karantina’ya, <b>Riskli</b> olan ürünleri Reddedildi durumuna alır.
            </p>
            <p>
              Ürün tamamlandığı halde <b>running</b> kalan scan job kayıtlarını completed yapar.
            </p>
          </div>
        </section>
      </section>
    </main>
  );
}
