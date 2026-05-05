import { and, asc, eq, sql } from "drizzle-orm";
import { db } from "./db";
import { reviews, users, type Review, type User } from "./schema";

export type ReviewWithEmployee = Review & { employee: User };

const CYCLE = "current";

export async function getOrCreateReview(employeeId: string): Promise<Review> {
  const existing = await db
    .select()
    .from(reviews)
    .where(and(eq(reviews.employeeId, employeeId), eq(reviews.cycle, CYCLE)))
    .limit(1);
  if (existing[0]) return existing[0];

  const [created] = await db
    .insert(reviews)
    .values({ employeeId, cycle: CYCLE })
    .returning();
  return created;
}

export async function getReviewByEmployeeId(employeeId: string): Promise<Review | null> {
  const rows = await db
    .select()
    .from(reviews)
    .where(and(eq(reviews.employeeId, employeeId), eq(reviews.cycle, CYCLE)))
    .limit(1);
  return rows[0] ?? null;
}

export async function getUserById(id: string): Promise<User | null> {
  const rows = await db.select().from(users).where(eq(users.id, id)).limit(1);
  return rows[0] ?? null;
}

/**
 * Returns the list of (employee, review) pairs the current user is allowed to see
 * for the appraisal workflow. Same row visibility as `getVisibleEmployees` but
 * left-joined with the current-cycle review row.
 */
export async function getReviewsForCurrentUser(currentUser: User): Promise<ReviewWithEmployee[]> {
  const rows = await db
    .select({
      user: users,
      review: reviews
    })
    .from(users)
    .leftJoin(
      reviews,
      and(eq(reviews.employeeId, users.id), eq(reviews.cycle, CYCLE))
    )
    .where(
      currentUser.role === "admin"
        ? undefined
        : currentUser.role === "manager"
          ? eq(users.managerId, currentUser.id)
          : eq(users.id, currentUser.id)
    )
    .orderBy(asc(users.fullName));

  return rows.map((r) => {
    const review =
      r.review ??
      ({
        id: "",
        employeeId: r.user.id,
        cycle: CYCLE,
        status: "not_started",
        selfReviewText: null,
        selfSubmittedAt: null,
        kraRating: null,
        behavioralRating: null,
        managerOverallRating: null,
        managerComments: null,
        managerReviewedAt: null,
        managerReviewedBy: null,
        founderKraRating: null,
        founderBehavioralRating: null,
        founderOverallRating: null,
        founderComments: null,
        founderReviewedAt: null,
        founderReviewedBy: null,
        finalRating: null,
        finalizedAt: null,
        finalizedBy: null,
        createdAt: new Date(),
        updatedAt: new Date()
      } satisfies Review);
    return { ...review, employee: r.user };
  });
}

export async function ratingDistribution(): Promise<{ bucket: string; count: number }[]> {
  const result = await db
    .select({
      bucket: sql<string>`CASE
        WHEN ${reviews.finalRating} IS NULL THEN 'unrated'
        WHEN ${reviews.finalRating} < 1.5 THEN '1'
        WHEN ${reviews.finalRating} < 2.5 THEN '2'
        WHEN ${reviews.finalRating} < 3.5 THEN '3'
        WHEN ${reviews.finalRating} < 4.5 THEN '4'
        ELSE '5'
      END`,
      count: sql<number>`count(*)::int`
    })
    .from(reviews)
    .where(eq(reviews.cycle, CYCLE))
    .groupBy(sql`bucket`);
  return result;
}

export async function managerComparison(): Promise<
  { managerId: string; managerName: string; reviewCount: number; avgFinal: number | null }[]
> {
  const manager = users;
  const employee = sql.raw("e");
  const result = await db.execute(sql`
    SELECT
      m.id            AS "managerId",
      m.full_name     AS "managerName",
      COUNT(r.id)::int AS "reviewCount",
      ROUND(AVG(r.final_rating)::numeric, 2)::float AS "avgFinal"
    FROM ${manager} m
    JOIN ${manager} e ON e.manager_id = m.id
    LEFT JOIN ${reviews} r ON r.employee_id = e.id AND r.cycle = ${CYCLE}
    WHERE m.role IN ('manager','admin')
    GROUP BY m.id, m.full_name
    HAVING COUNT(e.id) > 0
    ORDER BY m.full_name ASC
  `);
  // node-postgres style result.rows on neon-http is .rows or array
  // drizzle's neon-http execute returns { rows: [...] } in newer versions
  const rows = (result as unknown as { rows?: any[] }).rows ?? (result as unknown as any[]);
  return rows as {
    managerId: string;
    managerName: string;
    reviewCount: number;
    avgFinal: number | null;
  }[];
}
