import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getUserByEmail } from "@/lib/visibility";
import { getReviewsForCurrentUser } from "@/lib/review-queries";
import { calculateFinalRating } from "@/lib/review";
import { StatusBadge } from "@/app/_components/StatusBadge";

export default async function TeamReviewsPage() {
  const session = await auth();
  if (!session?.user?.email) redirect("/login");

  const me = await getUserByEmail(session.user.email);
  if (!me) redirect("/login?error=not_found");

  if (me.role === "employee") redirect("/reviews/me");

  const rows = await getReviewsForCurrentUser(me);
  // Drop self from the team list (managers + admins shouldn't review themselves through this UI)
  const list = rows.filter((r) => r.employee.id !== me.id);

  return (
    <main className="mx-auto max-w-7xl px-4 py-8">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold">
          {me.role === "admin" ? "All reviews" : "Team reviews"}
        </h1>
        <p className="mt-1 text-xs text-gray-500">
          {list.length} {list.length === 1 ? "person" : "people"} ·{" "}
          {list.filter((r) => r.status === "finalized").length} finalized
        </p>
      </header>

      <div className="overflow-x-auto rounded-xl bg-white shadow-sm ring-1 ring-gray-200">
        <table className="min-w-full divide-y divide-gray-200 text-sm">
          <thead className="bg-gray-50 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
            <tr>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Title</th>
              {me.role === "admin" && <th className="px-4 py-3">Reports to</th>}
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Final</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {list.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                  No employees in your scope.
                </td>
              </tr>
            ) : (
              list.map((r) => {
                const provisional = calculateFinalRating(r);
                return (
                  <tr key={r.employee.id} className="hover:bg-gray-50">
                    <td className="px-4 py-2.5 font-medium">{r.employee.fullName}</td>
                    <td className="px-4 py-2.5 text-gray-600">{r.employee.jobTitle}</td>
                    {me.role === "admin" && (
                      <td className="px-4 py-2.5 text-gray-600">
                        {r.employee.reportingToName ?? "—"}
                      </td>
                    )}
                    <td className="px-4 py-2.5">
                      <StatusBadge status={r.status} />
                    </td>
                    <td className="px-4 py-2.5 text-gray-700">
                      {r.finalRating ?? provisional ?? "—"}
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      <Link
                        href={`/reviews/${r.employee.id}`}
                        className="text-sm font-medium text-gray-900 hover:underline"
                      >
                        Open →
                      </Link>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </main>
  );
}
