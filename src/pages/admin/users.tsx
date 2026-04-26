const users = [
  {
    id: "USR-001",
    name: "Nihat İldeş",
    email: "nihat@example.com",
    purchases: 2,
    spent: "₺2.398",
    status: "Aktif",
  },
  {
    id: "USR-002",
    name: "Ahmet Yılmaz",
    email: "ahmet@example.com",
    purchases: 1,
    spent: "₺899",
    status: "Aktif",
  },
  {
    id: "USR-003",
    name: "Mehmet Kaya",
    email: "mehmet@example.com",
    purchases: 0,
    spent: "₺0",
    status: "Yeni Kullanıcı",
  },
];

export default function AdminUsersPage() {
  return (
    <main className="min-h-screen bg-[#070A12] text-white">
      <section className="mx-auto max-w-7xl px-6 py-10">
        <nav className="mb-10 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Admin Kullanıcılar</h1>
            <p className="text-sm text-gray-400">
              devcodstore kullanıcı hesaplarını yönet
            </p>
          </div>

          <a
            href="/admin"
            className="rounded-2xl bg-white px-5 py-2 text-sm font-semibold text-black"
          >
            Admin Panele Dön
          </a>
        </nav>

        <section className="grid gap-6 md:grid-cols-3">
          <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
            <p className="text-sm text-gray-400">Toplam Kullanıcı</p>
            <h2 className="mt-3 text-4xl font-bold">3</h2>
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
            <p className="text-sm text-gray-400">Aktif Kullanıcı</p>
            <h2 className="mt-3 text-4xl font-bold text-green-300">2</h2>
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
            <p className="text-sm text-gray-400">Yeni Kullanıcı</p>
            <h2 className="mt-3 text-4xl font-bold text-blue-300">1</h2>
          </div>
        </section>

        <section className="mt-10 rounded-3xl border border-white/10 bg-white/5 p-6">
          <h2 className="text-2xl font-bold">Kullanıcı Listesi</h2>

          <div className="mt-6 grid gap-4">
            {users.map((user) => (
              <div
                key={user.id}
                className="flex flex-col gap-4 rounded-2xl bg-black/30 p-5 md:flex-row md:items-center md:justify-between"
              >
                <div>
                  <h3 className="font-semibold">{user.name}</h3>
                  <p className="mt-1 text-sm text-gray-400">
                    Kullanıcı No: {user.id}
                  </p>
                  <p className="mt-1 text-sm text-gray-400">
                    E-posta: {user.email}
                  </p>
                </div>

                <div className="grid gap-2 md:text-right">
                  <p className="text-sm text-gray-400">
                    Satın alma: {user.purchases}
                  </p>
                  <p className="text-lg font-bold">{user.spent}</p>

                  <span
                    className={
                      user.status === "Aktif"
                        ? "w-fit rounded-full bg-green-500/20 px-4 py-2 text-sm text-green-300 md:ml-auto"
                        : "w-fit rounded-full bg-blue-500/20 px-4 py-2 text-sm text-blue-300 md:ml-auto"
                    }
                  >
                    {user.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </section>
      </section>
    </main>
  );
}
