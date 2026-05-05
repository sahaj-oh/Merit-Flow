import { relations } from "drizzle-orm";
import {
  pgTable,
  text,
  timestamp,
  varchar,
  pgEnum,
  uuid,
  index,
  type AnyPgColumn
} from "drizzle-orm/pg-core";

export const roleEnum = pgEnum("role", ["admin", "manager", "employee"]);

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

export const usersRelations = relations(users, ({ one, many }) => ({
  manager: one(users, {
    fields: [users.managerId],
    references: [users.id],
    relationName: "manager"
  }),
  reports: many(users, { relationName: "manager" })
}));

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Role = (typeof roleEnum.enumValues)[number];
