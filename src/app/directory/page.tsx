import { auth, signOut } from "@/auth";
import { redirect } from "next/navigation";
import { getUserByEmail, getVisibleEmployees } from "@/lib/visibility";

const roleLabel: Record<string, string> = {
  admin: "Admin",
  manager: "Manager",
  employee: "Employee"
};

const roleBadge: Record<string, string> = {
  admin: "bg-purple-100 text-purple-800",
  manager: "bg-blue-100 text-blue-800",
  employee: "bg-gray-100 text-gray-700"
};

function formatDate(d: Date | null): string {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric"
  });
}

export default async function DirectoryPage() {
  const session = await auth();
  if (!session?.user?.email) redirect("/login");

  const me = await getUserByEmail(session.user.email);
  if (!me) redirect("/login?error=not_found");

  const visible = await getVisibleEmployees(me);

  return (
    <main className="mx-auto max-w-7xl px-4 py-8">
      <header className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Directory</h1>
          <p className="mt-1 text-sm text-gray-600">
            Signed in as <span className="font-medium">{me.fullName}</span> ·{" "}
            <span
              className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${roleBadge[me.role]}`}
            >
              {roleLabel[me.role]}
            </span>
          </p>
          <p className="mt-1 text-xs text-gray-500">
            {visible.length} {visible.length === 1 ? "person" : "people"} visible to you
          </p>
        </div>

        <form
          action={async () => {
            "use server";
            await signOut({ redirectTo: "/login" });
          }}
        >
          <button
            type="submit"
            className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm hover:bg-gray-50"
          >
            Sign out
          </button>
        </form>
      </header>

      <div className="overflow-x-auto rounded-xl bg-white shadow-sm ring-1 ring-gray-200">
        <table className="min-w-full divide-y divide-gray-200 text-sm">
          <thead className="bg-gray-50 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
            <tr>
              <th className="px-4 py-3">Emp #</th>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Email</th>
              <th className="px-4 py-3">Title</th>
              <th className="px-4 py-3">Department</th>
              <th className="px-4 py-3">Location</th>
              <th className="px-4 py-3">Reports to</th>
              <th className="px-4 py-3">DOJ</th>
              <th className="px-4 py-3">Role</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {visible.length === 0 ? (
              <tr>
                <td colSpan={9} className="px-4 py-8 text-center text-gray-500">
                  No employees visible to your account.
                </td>
              </tr>
            ) : (
              visible.map((u) => (
                <tr key={u.id} className="hover:bg-gray-50">
                  <td className="px-4 py-2.5 font-mono text-xs text-gray-500">
                    {u.employeeNumber}
                  </td>
                  <td className="px-4 py-2.5 font-medium">{u.fullName}</td>
                  <td className="px-4 py-2.5 text-gray-600">{u.email}</td>
                  <td className="px-4 py-2.5">{u.jobTitle}</td>
                  <td className="px-4 py-2.5 text-gray-600">{u.department ?? "—"}</td>
                  <td className="px-4 py-2.5 text-gray-600">{u.location ?? "—"}</td>
                  <td className="px-4 py-2.5 text-gray-600">{u.reportingToName ?? "—"}</td>
                  <td className="px-4 py-2.5 text-gray-600">{formatDate(u.dateOfJoining)}</td>
                  <td className="px-4 py-2.5">
                    <span
                      className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${roleBadge[u.role]}`}
                    >
                      {roleLabel[u.role]}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </main>
  );
}
