import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getUserByEmail } from "@/lib/visibility";

export default async function Home() {
  const session = await auth();
  if (!session?.user?.email) redirect("/login");
  const me = await getUserByEmail(session.user.email);
  if (!me) redirect("/login?error=not_found");
  if (me.role === "admin") redirect("/admin/dashboard");
  if (me.role === "manager") redirect("/reviews/team");
  redirect("/reviews/me");
}
