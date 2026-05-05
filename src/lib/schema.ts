import { relations } from "drizzle-orm";
import {
  pgTable,
  text,
  timestamp,
  varchar,
  pgEnum,
  uuid,
  integer,
  numeric,
  index,
  unique,
  type AnyPgColumn
} from "drizzle-orm/pg-core";

export const roleEnum = pgEnum("role", ["admin", "manager", "employee"]);

export const reviewStatusEnum = pgEnum("review_status", [
  "not_started",
  "self_submitted",
  "manager_reviewed",
  "founder_reviewed",
  "finalized"
]);

export const users = pgTable(
  "users",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    employeeNumber: varchar("employee_number", { length: 32 }).notNull().unique(),
    fullName: text("full_name").notNull(),
    email: text("email").notNull().unique(),
    dateOfJoining: timestamp("date_of_joining", { withTimezone: false }),
    jobTitle: text("job_title").notNull(),
    businessUnit: text("business_unit"),
    department: text("department"),
    location: text("location"),
    legalEntity: text("legal_entity"),
    reportingToName: text("reporting_to_name"),
    managerId: uuid("manager_id").references((): AnyPgColumn => users.id, {
      onDelete: "set null"
    }),
    role: roleEnum("role").notNull().default("employee"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow()
  },
  (t) => ({
    emailIdx: index("users_email_idx").on(t.email),
    managerIdx: index("users_manager_idx").on(t.managerId)
  })
);

export const reviews = pgTable(
  "reviews",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    employeeId: uuid("employee_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    cycle: text("cycle").notNull().default("current"),
    status: reviewStatusEnum("status").notNull().default("not_started"),

    // Employee
    selfReviewText: text("self_review_text"),
    selfSubmittedAt: timestamp("self_submitted_at"),

    // Manager
    kraRating: integer("kra_rating"),
    behavioralRating: integer("behavioral_rating"),
    managerOverallRating: integer("manager_overall_rating"),
    managerComments: text("manager_comments"),
    managerReviewedAt: timestamp("manager_reviewed_at"),
    managerReviewedBy: uuid("manager_reviewed_by").references(() => users.id, {
      onDelete: "set null"
    }),

    // Founder overrides (any subset may be set)
    founderKraRating: integer("founder_kra_rating"),
    founderBehavioralRating: integer("founder_behavioral_rating"),
    founderOverallRating: integer("founder_overall_rating"),
    founderComments: text("founder_comments"),
    founderReviewedAt: timestamp("founder_reviewed_at"),
    founderReviewedBy: uuid("founder_reviewed_by").references(() => users.id, {
      onDelete: "set null"
    }),

    finalRating: numeric("final_rating", { precision: 3, scale: 1 }),
    finalizedAt: timestamp("finalized_at"),
    finalizedBy: uuid("finalized_by").references(() => users.id, { onDelete: "set null" }),

    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow()
  },
  (t) => ({
    employeeCycleUniq: unique("reviews_employee_cycle_uniq").on(t.employeeId, t.cycle),
    statusIdx: index("reviews_status_idx").on(t.status),
    employeeIdx: index("reviews_employee_idx").on(t.employeeId)
  })
);

export const usersRelations = relations(users, ({ one, many }) => ({
  manager: one(users, {
    fields: [users.managerId],
    references: [users.id],
    relationName: "manager"
  }),
  reports: many(users, { relationName: "manager" }),
  reviews: many(reviews)
}));

export const reviewsRelations = relations(reviews, ({ one }) => ({
  employee: one(users, { fields: [reviews.employeeId], references: [users.id] })
}));

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Role = (typeof roleEnum.enumValues)[number];
export type Review = typeof reviews.$inferSelect;
export type NewReview = typeof reviews.$inferInsert;
export type ReviewStatus = (typeof reviewStatusEnum.enumValues)[number];
