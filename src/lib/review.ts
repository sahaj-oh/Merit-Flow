import type { Review, ReviewStatus, User } from "./schema";

export const RATING_MIN = 1;
export const RATING_MAX = 5;

export const RATING_LABELS: Record<number, string> = {
  1: "Unsatisfactory",
  2: "Needs Improvement",
  3: "Meets Expectations",
  4: "Exceeds Expectations",
  5: "Outstanding"
};

export const STATUS_LABELS: Record<ReviewStatus, string> = {
  not_started: "Not started",
  self_submitted: "Self submitted",
  manager_reviewed: "Manager reviewed",
  founder_reviewed: "Founder reviewed",
  finalized: "Finalized"
};

export const STATUS_BADGE: Record<ReviewStatus, string> = {
  not_started: "bg-gray-100 text-gray-700",
  self_submitted: "bg-amber-100 text-amber-800",
  manager_reviewed: "bg-blue-100 text-blue-800",
  founder_reviewed: "bg-purple-100 text-purple-800",
  finalized: "bg-emerald-100 text-emerald-800"
};

export const WEIGHTS = { kra: 0.5, behavioral: 0.3, overall: 0.2 } as const;

export function isValidRating(n: unknown): n is number {
  return typeof n === "number" && Number.isInteger(n) && n >= RATING_MIN && n <= RATING_MAX;
}

type RatingsLike = Pick<
  Review,
  | "kraRating"
  | "behavioralRating"
  | "managerOverallRating"
  | "founderKraRating"
  | "founderBehavioralRating"
  | "founderOverallRating"
>;

export function effectiveRatings(r: RatingsLike) {
  return {
    kra: r.founderKraRating ?? r.kraRating,
    behavioral: r.founderBehavioralRating ?? r.behavioralRating,
    overall: r.founderOverallRating ?? r.managerOverallRating
  };
}

export function calculateFinalRating(r: RatingsLike): number | null {
  const { kra, behavioral, overall } = effectiveRatings(r);
  if (kra == null || behavioral == null || overall == null) return null;
  const raw = WEIGHTS.kra * kra + WEIGHTS.behavioral * behavioral + WEIGHTS.overall * overall;
  return Math.round(raw * 10) / 10;
}

export function isOverridden(r: RatingsLike, key: "kra" | "behavioral" | "overall"): boolean {
  if (key === "kra") return r.founderKraRating != null && r.founderKraRating !== r.kraRating;
  if (key === "behavioral")
    return r.founderBehavioralRating != null && r.founderBehavioralRating !== r.behavioralRating;
  return r.founderOverallRating != null && r.founderOverallRating !== r.managerOverallRating;
}

const allowedTransitions: Record<ReviewStatus, ReviewStatus[]> = {
  not_started: ["self_submitted"],
  self_submitted: ["manager_reviewed"],
  manager_reviewed: ["founder_reviewed"],
  founder_reviewed: ["finalized"],
  finalized: []
};

export function canTransition(from: ReviewStatus, to: ReviewStatus): boolean {
  return allowedTransitions[from].includes(to);
}

/**
 * Decide which actions the current user can take on a given review,
 * given their role and the review's current state.
 */
export function reviewPermissions(currentUser: User, employee: User, review: Review | null) {
  const isSelf = currentUser.id === employee.id;
  const isMyReport = employee.managerId === currentUser.id;
  const isAdmin = currentUser.role === "admin";
  const isManager = currentUser.role === "manager";

  const canView = isAdmin || isSelf || (isManager && isMyReport);

  const status = review?.status ?? "not_started";

  return {
    canView,
    canSubmitSelf: isSelf && status === "not_started",
    canManagerRate:
      (isAdmin || (isManager && isMyReport)) && status === "self_submitted" && !isSelf,
    canFounderReview: isAdmin && status === "manager_reviewed",
    canFinalize: isAdmin && status === "founder_reviewed",
    isLocked: status === "finalized"
  };
}
