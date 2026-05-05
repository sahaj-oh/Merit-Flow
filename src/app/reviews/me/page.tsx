import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getOrCreateReview, getUserById } from "@/lib/review-queries";
import { getUserByEmail } from "@/lib/visibility";
import {
  RATING_LABELS,
  calculateFinalRating,
  effectiveRatings,
  isOverridden,
  reviewPermissions
} from "@/lib/review";
import { submitSelfReview } from "@/app/_actions/reviews";
import { StatusBadge } from "@/app/_components/StatusBadge";

export default async function MyReviewPage() {
  const session = await auth();
  if (!session?.user?.email) redirect("/login");

  const me = await getUserByEmail(session.user.email);
  if (!me) redirect("/login?error=not_found");

  const review = await getOrCreateReview(me.id);
  const perms = reviewPermissions(me, me, review);

  const manager = me.managerId ? await getUserById(me.managerId) : null;
  const finalRating = calculateFinalRating(review);
  const eff = effectiveRatings(review);

  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <header className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">My review</h1>
          <p className="mt-1 text-sm text-gray-600">
            {me.fullName} · {me.jobTitle}
            {manager && <> · reports to {manager.fullName}</>}
          </p>
        </div>
        <StatusBadge status={review.status} />
      </header>

      {/* Self review section */}
      <section className="mb-6 rounded-xl bg-white p-6 shadow-sm ring-1 ring-gray-200">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500">
          Self review
        </h2>

        {perms.canSubmitSelf ? (
          <form action={submitSelfReview} className="mt-3">
            <textarea
              name="self_review_text"
              required
              minLength={20}
              maxLength={4000}
              rows={8}
              placeholder="Reflect on your contributions, strengths, and areas you want to grow this cycle…"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-gray-900 focus:outline-none"
            />
            <div className="mt-3 flex items-center justify-between">
              <p className="text-xs text-gray-500">
                Min 20 characters. You cannot edit after submitting.
              </p>
              <button
                type="submit"
                className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800"
              >
                Submit self review
              </button>
            </div>
          </form>
        ) : (
          <div className="mt-3">
            {review.selfReviewText ? (
              <p className="whitespace-pre-wrap text-sm text-gray-800">{review.selfReviewText}</p>
            ) : (
              <p className="text-sm italic text-gray-500">Not yet submitted.</p>
            )}
            {review.selfSubmittedAt && (
              <p className="mt-2 text-xs text-gray-500">
                Submitted on {new Date(review.selfSubmittedAt).toLocaleString("en-IN")}
              </p>
            )}
          </div>
        )}
      </section>

      {/* Manager + founder ratings, only after manager has reviewed */}
      {(review.status === "manager_reviewed" ||
        review.status === "founder_reviewed" ||
        review.status === "finalized") && (
        <section className="mb-6 rounded-xl bg-white p-6 shadow-sm ring-1 ring-gray-200">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500">
            Ratings
          </h2>

          <table className="mt-3 w-full text-sm">
            <thead className="text-left text-xs uppercase tracking-wide text-gray-500">
              <tr>
                <th className="py-2">Component</th>
                <th className="py-2">Rating</th>
                <th className="py-2">Label</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              <RatingRow
                label="KRA / Goal Performance (50%)"
                value={eff.kra}
                overridden={isOverridden(review, "kra")}
              />
              <RatingRow
                label="Behavioral (30%)"
                value={eff.behavioral}
                overridden={isOverridden(review, "behavioral")}
              />
              <RatingRow
                label="Manager Overall (20%)"
                value={eff.overall}
                overridden={isOverridden(review, "overall")}
              />
              <tr>
                <td className="py-2 font-semibold">Final</td>
                <td className="py-2 font-semibold">{finalRating ?? "—"}</td>
                <td className="py-2 text-gray-500">
                  {review.status === "finalized" ? "Locked" : "Provisional"}
                </td>
              </tr>
            </tbody>
          </table>

          {review.managerComments && (
            <div className="mt-4">
              <p className="text-xs font-medium text-gray-500">Manager comments</p>
              <p className="mt-1 whitespace-pre-wrap text-sm text-gray-800">
                {review.managerComments}
              </p>
            </div>
          )}
          {review.founderComments && (
            <div className="mt-4">
              <p className="text-xs font-medium text-gray-500">Founder comments</p>
              <p className="mt-1 whitespace-pre-wrap text-sm text-gray-800">
                {review.founderComments}
              </p>
            </div>
          )}
        </section>
      )}
    </main>
  );
}

function RatingRow({
  label,
  value,
  overridden
}: {
  label: string;
  value: number | null;
  overridden: boolean;
}) {
  return (
    <tr>
      <td className="py-2">{label}</td>
      <td className="py-2 font-medium">
        {value ?? "—"}
        {overridden && (
          <span className="ml-2 inline-flex rounded-full bg-purple-100 px-2 py-0.5 text-[10px] font-medium uppercase text-purple-800">
            Overridden
          </span>
        )}
      </td>
      <td className="py-2 text-gray-600">{value ? RATING_LABELS[value] : "—"}</td>
    </tr>
  );
}
