import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
import { parse } from "csv-parse/sync";
import { eq, sql } from "drizzle-orm";
import { db } from "../src/lib/db";
import { users, type NewUser } from "../src/lib/schema";
import { deriveRole } from "../src/lib/role";

type CsvRow = {
  "Employee Number": string;
  "Full Name": string;
  Email: string;
  "Date of Joining": string;
  "Job Title": string;
  "Business Unit": string;
  Department: string;
  Location: string;
  "Legal Entity": string;
  "Reporting To": string;
};

function parseDate(s: string): Date | null {
  if (!s) return null;
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : d;
}

async function main() {
  const csvPath = path.join(process.cwd(), "data", "employees.csv");
  const raw = fs.readFileSync(csvPath, "utf8");
  const rows: CsvRow[] = parse(raw, { columns: true, skip_empty_lines: true, trim: true });

  console.log(`Parsed ${rows.length} rows from CSV`);

  const inserts: NewUser[] = rows.map((r) => ({
    employeeNumber: r["Employee Number"],
    fullName: r["Full Name"],
    email: r.Email.toLowerCase(),
    dateOfJoining: parseDate(r["Date of Joining"]),
    jobTitle: r["Job Title"],
    businessUnit: r["Business Unit"] || null,
    department: r.Department || null,
    location: r.Location || null,
    legalEntity: r["Legal Entity"] || null,
    reportingToName: r["Reporting To"] || null,
    role: deriveRole(r["Job Title"])
  }));

  // Pass 1: upsert all users without manager_id
  for (const u of inserts) {
    await db
      .insert(users)
      .values(u)
      .onConflictDoUpdate({
        target: users.email,
        set: {
          employeeNumber: u.employeeNumber,
          fullName: u.fullName,
          dateOfJoining: u.dateOfJoining,
          jobTitle: u.jobTitle,
          businessUnit: u.businessUnit,
          department: u.department,
          location: u.location,
          legalEntity: u.legalEntity,
          reportingToName: u.reportingToName,
          role: u.role,
          updatedAt: sql`now()`
        }
      });
  }
  console.log(`Upserted ${inserts.length} users`);

  // Pass 2: resolve manager_id from reporting_to_name
  const all = await db.select().from(users);
  const byName = new Map(all.map((u) => [u.fullName.toLowerCase(), u.id]));

  let resolved = 0;
  let unresolved: string[] = [];
  for (const u of all) {
    if (!u.reportingToName) continue;
    const managerId = byName.get(u.reportingToName.toLowerCase());
    if (managerId) {
      await db.update(users).set({ managerId }).where(eq(users.id, u.id));
      resolved++;
    } else {
      unresolved.push(`${u.fullName} -> "${u.reportingToName}"`);
    }
  }

  console.log(`Resolved ${resolved} manager links`);
  if (unresolved.length) {
    console.warn(`Unresolved manager names (${unresolved.length}):`);
    unresolved.forEach((u) => console.warn(`  - ${u}`));
  }

  const counts = await db
    .select({ role: users.role, count: sql<number>`count(*)::int` })
    .from(users)
    .groupBy(users.role);
  console.log("Role distribution:", counts);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
