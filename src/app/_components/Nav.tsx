import Link from "next/link";
import { auth, signOut } from "@/auth";
import { getUserByEmail } from "@/lib/visibility";

const roleBadge: Record<string, string> = {
  admin: "bg-purple-100 text-purple-800",
  manager: "bg-blue-100 text-blue-800",
  employee: "bg-gray-100 text-gray-700"
};

export async function Nav() {
  const session = await auth();
  if (!session?.user?.email) return null;
  const me = await getUserByEmail(session.user.email);
  if (!me) return null;

  const links: { href: string; label: string }[] = [{ href: "/reviews/me", label: "My Review" }];
  if (me.role === "manager" || me.role === "admin")
    links.push({ href: "/reviews/team", label: me.role === "admin" ? "All Reviews" : "Team" });
  if (me.role === "admin") links.push({ href: "/admin/dashboard", label: "Dashboard" });
  links.push({ href: "/directory", label: "Directory" });

  return (
    <nav className="border-b border-gray-200 bg-white">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3">
        <div className="flex items-center gap-6">
          <Link href="/" className="text-sm font-semibold tracking-tight">
            Merit Flow
          </Link>
          <ul className="flex items-center gap-4 text-sm">
            {links.map((l) => (
              <li key={l.href}>
                <Link href={l.href} className="text-gray-700 hover:text-gray-900">
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
        <div className="flex items-center gap-3 text-sm">
          <span className="text-gray-600">{me.fullName}</span>
          <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${roleBadge[me.role]}`}>
            {me.role}
          </span>
          <form
            action={async () => {
              "use server";
              await signOut({ redirectTo: "/login" });
            }}
          >
            <button
              type="submit"
              className="rounded border border-gray-300 bg-white px-2.5 py-1 text-xs hover:bg-gray-50"
            >
              Sign out
            </button>
          </form>
        </div>
      </div>
    </nav>
  );
}
