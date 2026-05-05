import type { Role } from "./schema";

export function deriveRole(jobTitle: string): Role {
  const t = jobTitle.trim();
  if (/^admin$/i.test(t) || /co-?founder/i.test(t)) return "admin";
  if (/manager/i.test(t)) return "manager";
  return "employee";
}
