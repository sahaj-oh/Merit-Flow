import { asc, eq, or } from "drizzle-orm";
import { db } from "./db";
import { users, type User } from "./schema";

export async function getVisibleEmployees(currentUser: User): Promise<User[]> {
  if (currentUser.role === "admin") {
    return db.select().from(users).orderBy(asc(users.fullName));
  }

  if (currentUser.role === "manager") {
    return db
      .select()
      .from(users)
      .where(or(eq(users.managerId, currentUser.id), eq(users.id, currentUser.id)))
      .orderBy(asc(users.fullName));
  }

  return db.select().from(users).where(eq(users.id, currentUser.id));
}

export async function getUserByEmail(email: string): Promise<User | null> {
  const rows = await db
    .select()
    .from(users)
    .where(eq(users.email, email.toLowerCase()))
    .limit(1);
  return rows[0] ?? null;
}
