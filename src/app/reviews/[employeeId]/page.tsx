import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { getUserByEmail } from "@/lib/visibility";
import { getReviewByEmployeeId, getUserById } from "@/lib/review-queries";
import {
  RATING_LABELS,
  calculateFinalRating,
  effectiveRatings,
  isOverridden,
  reviewPermissions
} from "@/lib/review";
import {
  finalizeReview,
  submitFounderReview,
  submitManagerRating
} from "@/app/_actions/reviews";
import { StatusBadge } from "@/app/_components/StatusBadge";
import { RatingForm } from "@/app/_components/RatingForm";

export default async function ReviewDetailPage({
  params
}: {
  params: Promise<{ employeeId: string }>;
}) {
  const { employeeId } = await params;
  const session = await auth();
  if (!session?.user?.email) redirect("/login");

  const me = await getUserByEmail(session.user.email);
  if (!me) redirect("/login?error=not_found");

  const employee = await getUserById(employeeId);
  if (!employee) notFound();

  const review = await getReviewByEmployeeId(employeeId);
  const perms = reviewPermissions(me, employee, review);
  if (!perms.canView) notFound();

  const status = review?.status ?? "not_started";
  const provisional = review ? calculateFinalRating(review) : null;
  const eff = review
    ? effectiveRatings(review)
    : { kra: null, behavioral: null, overall: null };

  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <header className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">{employee.fullName}</h1>
          <p className="mt-1 text-sm text-gray-600">
            {employee.jobTitle} · {employee.department ?? "—"}
            {employee.reportingToName && <> · reports to {employee.reportingToName}</>}
          </p>
        </div>
        <StatusBadge status={status} />
      </header>

      {/* Self review (read-only here) */}
      <section className="mb-6 rounded-xl bg-white p-6 shadow-sm ring-1 ring-gray-200">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500">
          Self review
        </h2>
        {review?.selfReviewText ? (
          <p className="mt-3 whitespace-pre-wrap text-sm text-gray-800">
            {review.selfReviewText}
          </p>
        ) : (
          <p className="mt-3 text-sm italic text-gray-500">
            Employee has not submitted a self-review yet.
          </p>
        )}
      </section>

      {/* Manager rating: form when allowed, read-only otherwise */}
      {perms.canManagerRate ? (
        <section className="mb-6 rounded-xl bg-white p-6 shadow-sm ring-1 ring-gray-200">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500">
            Manager rating
          </h2>
          <RatingForm
            mode="manager"
            employeeId={employee.id}
            action={submitManagerRating}
          />
        </section>
      ) : review && (status === "manager_reviewed" ||
          status === "founder_reviewed" ||
          status === "finalized") ? (
        <section className="mb-6 rounded-xl bg-white p-6 shadow-sm ring-1 ring-gray-200">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500">
            Manager rating
          </h2>
          <RatingsTable
            kra={review.kraRating}
            beh={review.behavioralRating}
            ovr={review.managerOverallRating}
          />
          {review.managerComments && (
            <p className="mt-3 whitespace-pre-wrap text-sm text-gray-800">
              {review.managerComments}
            </p>
          )}
        </section>
      ) : null}

      {/* Founder override: form when allowed, read-only otherwise */}
      {perms.canFounderReview ? (
        <section className="mb-6 rounded-xl bg-white p-6 shadow-sm ring-1 ring-gray-200">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500">
            Founder review (override)
          </h2>
          <p className="mt-1 text-xs text-gray-500">
            Leave a field blank to keep the manager rating. Provided values override.
          </p>
          <RatingForm
            mode="founder"
            employeeId={employee.id}
            action={submitFounderReview}
            managerKra={review?.kraRating ?? null}
            managerBehavioral={review?.behavioralRating ?? null}
            managerOverall={review?.managerOverallRating ?? null}
          />
        </section>
      ) : review && (status === "founder_reviewed" || status === "finalized") ? (
        <section className="mb-6 rounded-xl bg-white p-6 shadow-sm ring-1 ring-gray-200">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500">
            Founder review
          </h2>
          <RatingsTable
            kra={eff.kra}
            beh={eff.behavioral}
            ovr={eff.overall}
            kraOverridden={isOverridden(review, "kra")}
            behOverridden={isOverridden(review, "behavioral")}
            ovrOverridden={isOverridden(review, "overall")}
          />
          {review.founderComments && (
            <p className="mt-3 whitespace-pre-wrap text-sm text-gray-800">
              {review.founderComments}
            </p>
          )}
        </section>
      ) : null}

      {/* Final + finalize action */}
      {review && (provisional !== null || review.finalRating !== null) && (
        <section className="mb-6 rounded-xl bg-white p-6 shadow-sm ring-1 ring-gray-200">
          <div className="flex items-baseline justify-between">
            <div>
              <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500">
                Final rating
              </h2>
              <p className="mt-1 text-3xl font-semibold">
                {review.finalRating ?? provisional}
                <span className="ml-2 text-sm font-normal text-gray-500">
                  {status === "finalized" ? "Locked" : "Provisional"}
                </span>
              </p>
            </div>
            {perms.canFinalize && (
              <form action={finalizeReview}>
                <input type="hidden" name="employee_id" value={employee.id} />
                <button
                  type="submit"
                  className="rounded-lg bg-emerald-700 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-800"
                >
                  Finalize
                </button>
              </form>
            )}
          </div>
          <p className="mt-2 text-xs text-gray-500">
            Formula: 0.5 × KRA + 0.3 × Behavioral + 0.2 × Overall
          </p>
        </section>
      )}
    </main>
  );
}

function RatingsTable({
  kra,
  beh,
  ovr,
  kraOverridden,
  behOverridden,
  ovrOverridden
}: {
  kra: number | null;
  beh: number | null;
  ovr: number | null;
  kraOverridden?: boolean;
  behOverridden?: boolean;
  ovrOverridden?: boolean;
}) {
  return (
    <table className="mt-3 w-full text-sm">
      <thead className="text-left text-xs uppercase tracking-wide text-gray-500">
        <tr>
          <th className="py-2">Component</th>
          <th className="py-2">Rating</th>
          <th className="py-2">Label</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-gray-100">
        <Row label="KRA / Goal Performance (50%)" value={kra} overridden={!!kraOverridden} />
        <Row label="Behavioral (30%)" value={beh} overridden={!!behOverridden} />
        <Row label="Overall (20%)" value={ovr} overridden={!!ovrOverridden} />
      </tbody>
    </table>
  );
}

function Row({
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
