import { signIn, auth } from "@/auth";
import { redirect } from "next/navigation";

export default async function LoginPage({
  searchParams
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const session = await auth();
  if (session) redirect("/directory");

  const { error } = await searchParams;

  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm rounded-2xl bg-white p-8 shadow-sm ring-1 ring-gray-200">
        <h1 className="text-xl font-semibold">Merit Flow</h1>
        <p className="mt-1 text-sm text-gray-600">Openhouse internal directory</p>

        <form
          action={async () => {
            "use server";
            await signIn("google", { redirectTo: "/directory" });
          }}
          className="mt-6"
        >
          <button
            type="submit"
            className="w-full rounded-lg bg-gray-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-gray-800"
          >
            Sign in with Google
          </button>
        </form>

        {error && (
          <p className="mt-4 text-xs text-red-600">
            Sign-in failed. Make sure you are using your @openhouse.in account and your email is in
            the employee list.
          </p>
        )}
      </div>
    </main>
  );
}
