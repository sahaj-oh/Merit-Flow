"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { reviews } from "@/lib/schema";
import { getOrCreateReview, getReviewByEmployeeId, getUserById } from "@/lib/review-queries";
import { getUserByEmail } from "@/lib/visibility";
import {
  calculateFinalRating,
  canTransition,
  isValidRating,
  reviewPermissions
} from "@/lib/review";

const CYCLE = "current";

async function requireUser() {
  const session = await auth();
  if (!session?.user?.email) throw new Error("Not authenticated");
  const user = await getUserByEmail(session.user.email);
  if (!user) throw new Error("Not authorized — user not in employee list");
  return user;
}

function num(v: FormDataEntryValue | null): number | null {
  if (v == null || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function str(v: FormDataEntryValue | null): string | null {
  if (v == null) return null;
  const s = String(v).trim();
  return s.length === 0 ? null : s;
}

export async function submitSelfReview(formData: FormData) {
  const me = await requireUser();
  const text = str(formData.get("self_review_text"));
  if (!text || text.length < 20) throw new Error("Self review must be at least 20 characters");

  const review = await getOrCreateReview(me.id);
  const perms = reviewPermissions(me, me, review);
  if (!perms.canSubmitSelf) throw new Error("Cannot submit self-review at this stage");
  if (!canTransition(review.status, "self_submitted")) throw new Error("Invalid transition");

  await db
    .update(reviews)
    .set({
      selfReviewText: text,
      selfSubmittedAt: new Date(),
      status: "self_submitted",
      updatedAt: new Date()
    })
    .where(and(eq(reviews.employeeId, me.id), eq(reviews.cycle, CYCLE)));

  revalidatePath("/reviews/me");
  revalidatePath("/reviews/team");
}

export async function submitManagerRating(formData: FormData) {
  const me = await requireUser();
  const employeeId = str(formData.get("employee_id"));
  if (!employeeId) throw new Error("employee_id required");

  const employee = await getUserById(employeeId);
  if (!employee) throw new Error("Employee not found");

  const review = await getReviewByEmployeeId(employeeId);
  if (!review) throw new Error("Review not started yet — employee has not submitted self-review");

  const perms = reviewPermissions(me, employee, review);
  if (!perms.canManagerRate)
    throw new Error("Forbidden — you cannot rate this employee at this stage");

  const kra = num(formData.get("kra_rating"));
  const beh = num(formData.get("behavioral_rating"));
  const ovr = num(formData.get("manager_overall_rating"));
  const comments = str(formData.get("manager_comments"));

  if (!isValidRating(kra) || !isValidRating(beh) || !isValidRating(ovr)) {
    throw new Error("All three ratings (KRA, Behavioral, Overall) must be integers 1–5");
  }
  if (!canTransition(review.status, "manager_reviewed")) throw new Error("Invalid transition");

  await db
    .update(reviews)
    .set({
      kraRating: kra,
      behavioralRating: beh,
      managerOverallRating: ovr,
      managerComments: comments,
      managerReviewedAt: new Date(),
      managerReviewedBy: me.id,
      status: "manager_reviewed",
      updatedAt: new Date()
    })
    .where(and(eq(reviews.employeeId, employeeId), eq(reviews.cycle, CYCLE)));

  revalidatePath("/reviews/team");
  revalidatePath(`/reviews/${employeeId}`);
}

export async function submitFounderReview(formData: FormData) {
  const me = await requireUser();
  if (me.role !== "admin") throw new Error("Forbidden — admin only");

  const employeeId = str(formData.get("employee_id"));
  if (!employeeId) throw new Error("employee_id required");

  const employee = await getUserById(employeeId);
  if (!employee) throw new Error("Employee not found");

  const review = await getReviewByEmployeeId(employeeId);
  if (!review) throw new Error("No review to override");

  const perms = reviewPermissions(me, employee, review);
  if (!perms.canFounderReview) throw new Error("Forbidden — review not at manager_reviewed stage");

  const fkra = num(formData.get("founder_kra_rating"));
  const fbeh = num(formData.get("founder_behavioral_rating"));
  const fovr = num(formData.get("founder_overall_rating"));
  const fcom = str(formData.get("founder_comments"));

  // Each override is optional; if provided, must be valid 1–5
  for (const [name, v] of [
    ["founder_kra_rating", fkra],
    ["founder_behavioral_rating", fbeh],
    ["founder_overall_rating", fovr]
  ] as const) {
    if (v !== null && !isValidRating(v)) throw new Error(`${name} must be 1–5`);
  }
  if (!canTransition(review.status, "founder_reviewed")) throw new Error("Invalid transition");

  await db
    .update(reviews)
    .set({
      founderKraRating: fkra,
      founderBehavioralRating: fbeh,
      founderOverallRating: fovr,
      founderComments: fcom,
      founderReviewedAt: new Date(),
      founderReviewedBy: me.id,
      status: "founder_reviewed",
      updatedAt: new Date()
    })
    .where(and(eq(reviews.employeeId, employeeId), eq(reviews.cycle, CYCLE)));

  revalidatePath("/reviews/team");
  revalidatePath(`/reviews/${employeeId}`);
  revalidatePath("/admin/dashboard");
}

export async function finalizeReview(formData: FormData) {
  const me = await requireUser();
  if (me.role !== "admin") throw new Error("Forbidden — admin only");

  const employeeId = str(formData.get("employee_id"));
  if (!employeeId) throw new Error("employee_id required");

  const employee = await getUserById(employeeId);
  if (!employee) throw new Error("Employee not found");

  const review = await getReviewByEmployeeId(employeeId);
  if (!review) throw new Error("No review to finalize");

  const perms = reviewPermissions(me, employee, review);
  if (!perms.canFinalize) throw new Error("Forbidden — review not at founder_reviewed stage");

  const finalRating = calculateFinalRating(review);
  if (finalRating == null)
    throw new Error("Cannot finalize — missing rating components on review");
  if (!canTransition(review.status, "finalized")) throw new Error("Invalid transition");

  await db
    .update(reviews)
    .set({
      finalRating: String(finalRating),
      finalizedAt: new Date(),
      finalizedBy: me.id,
      status: "finalized",
      updatedAt: new Date()
    })
    .where(and(eq(reviews.employeeId, employeeId), eq(reviews.cycle, CYCLE)));

  revalidatePath("/reviews/team");
  revalidatePath(`/reviews/${employeeId}`);
  revalidatePath("/admin/dashboard");
}
