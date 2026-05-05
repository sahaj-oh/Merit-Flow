import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getUserByEmail } from "@/lib/visibility";
import { managerComparison, ratingDistribution } from "@/lib/review-queries";
import { RATING_LABELS } from "@/lib/review";

export default async function AdminDashboardPage() {
  const session = await auth();
  if (!session?.user?.email) redirect("/login");

  const me = await getUserByEmail(session.user.email);
  if (!me) redirect("/login?error=not_found");
  if (me.role !== "admin") redirect("/reviews/me");

  const [dist, byManager] = await Promise.all([ratingDistribution(), managerComparison()]);

  const distMap = new Map(dist.map((d) => [d.bucket, d.count]));
  const buckets = ["1", "2", "3", "4", "5", "unrated"] as const;
  const totalRated = dist
    .filter((d) => d.bucket !== "unrated")
    .reduce((s, d) => s + d.count, 0);
  const maxBucket = Math.max(1, ...buckets.map((b) => distMap.get(b) ?? 0));

  return (
    <main className="mx-auto max-w-7xl px-4 py-8">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold">Calibration dashboard</h1>
        <p className="mt-1 text-xs text-gray-500">
          {totalRated} {totalRated === 1 ? "review" : "reviews"} with a final rating
        </p>
      </header>

      <section className="mb-8 rounded-xl bg-white p-6 shadow-sm ring-1 ring-gray-200">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500">
          Rating distribution
        </h2>
        <div className="mt-4 space-y-2">
          {buckets.map((b) => {
            const count = distMap.get(b) ?? 0;
            const pct = totalRated && b !== "unrated" ? (count / totalRated) * 100 : 0;
            const widthPct = (count / maxBucket) * 100;
            const label = b === "unrated" ? "Unrated" : `${b} — ${RATING_LABELS[Number(b)]}`;
            return (
              <div key={b} className="flex items-center gap-3 text-sm">
                <div className="w-56 shrink-0 text-gray-700">{label}</div>
                <div className="relative h-6 flex-1 rounded bg-gray-100">
                  <div
                    className={`h-6 rounded ${b === "unrated" ? "bg-gray-300" : "bg-emerald-500"}`}
                    style={{ width: `${widthPct}%` }}
                  />
                </div>
                <div className="w-24 shrink-0 text-right text-gray-700 tabular-nums">
                  {count}
                  {b !== "unrated" && totalRated > 0 && (
                    <span className="ml-1 text-xs text-gray-500">({pct.toFixed(0)}%)</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <section className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-gray-200">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500">
          Manager-wise comparison
        </h2>
        <p className="mt-1 text-xs text-gray-500">
          Average final rating per direct-report set. Use to flag bias (consistently high or low scores).
        </p>
        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="text-left text-xs font-medium uppercase tracking-wide text-gray-500">
              <tr>
                <th className="py-2">Manager</th>
                <th className="py-2">Direct reports rated</th>
                <th className="py-2">Avg final rating</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {byManager.length === 0 ? (
                <tr>
                  <td colSpan={3} className="py-6 text-center text-gray-500">
                    No managers with reviewed reports yet.
                  </td>
                </tr>
              ) : (
                byManager.map((m) => (
                  <tr key={m.managerId}>
                    <td className="py-2.5 font-medium">{m.managerName}</td>
                    <td className="py-2.5 text-gray-700">{m.reviewCount}</td>
                    <td className="py-2.5 text-gray-700">
                      {m.avgFinal != null ? m.avgFinal.toFixed(2) : "—"}
                      {m.avgFinal != null && m.avgFinal >= 4.5 && (
                        <span className="ml-2 inline-flex rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-medium uppercase text-amber-800">
                          Skewed high
                        </span>
                      )}
                      {m.avgFinal != null && m.avgFinal > 0 && m.avgFinal <= 2 && (
                        <span className="ml-2 inline-flex rounded-full bg-rose-100 px-2 py-0.5 text-[10px] font-medium uppercase text-rose-800">
                          Skewed low
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
